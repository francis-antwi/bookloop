import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcrypt";
import prisma from "@/app/libs/prismadb";
import { UserRole } from "@prisma/client";
import sharp from "sharp";
import axios from "axios";

// Cloudinary Config
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Constants
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const RECOMMENDED_MIN_SIZE = 50000;
const MAX_IMAGE_SIZE = 5_000_000;
const FACE_MATCH_THRESHOLD = 80;
const ID_KEYWORDS = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];

// Utility Functions
const cleanText = (text: string): string =>
  text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 0);

const normalizeDate = (dateStr: string): string | null => {
  try {
    const cleaned = dateStr.replace(/[^\d\/\-.]/g, '');
    const parts = cleaned.split(/[\/\-\.]/).map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [a, b, c] = parts;
    if (a > 1900) return `${a}-${b.toString().padStart(2, '0')}-${c.toString().padStart(2, '0')}`;
    if (c > 1900) return `${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
    return `20${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
  } catch {
    return null;
  }
};

const processImageForOCR = async (file: File): Promise<Buffer> => {
  if (file.size < ABSOLUTE_MIN_SIZE) throw new Error(`Image too small (${file.size} bytes).`);
  if (file.size > MAX_IMAGE_SIZE) throw new Error(`Image too large (${file.size} bytes).`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const opts = file.size < RECOMMENDED_MIN_SIZE
    ? { width: 1200, sharpenRadius: 2, quality: 95 }
    : { width: 800, sharpenRadius: 1, quality: 85 };
  return sharp(buffer)
    .resize({ width: opts.width, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1, m1: opts.sharpenRadius, m2: opts.sharpenRadius })
    .jpeg({ quality: opts.quality, mozjpeg: true })
    .toBuffer();
};

const uploadToCloudinary = async (buffer: Buffer, fileType: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  try {
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "face_compare",
      timeout: 30000,
      quality_analysis: true,
    });
    return result;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Cloudinary upload failed");
  }
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "2",
    isTable: "true",
    detectOrientation: "true",
    scale: "true",
  });

  const response = await axios.post("https://api.ocr.space/parse/image", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: OCR_TIMEOUT_MS,
  });

  const result = response.data;
  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR Error: ${result.ErrorMessage || result.ErrorDetails || "Unknown"}`);
  }

  const parsedText = result.ParsedResults?.[0]?.ParsedText;
  if (!parsedText || parsedText.trim().length < 10) {
    throw new Error("Insufficient OCR result. Make sure the image is clear.");
  }

  return parsedText;
};

const performOCRWithRetry = async (imageBuffer: Buffer): Promise<string> => {
  let lastError: any = null;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      return await performOCR(imageBuffer);
    } catch (e) {
      lastError = e;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  throw lastError;
};

const extractIDInfo = (text: string) => {
  const lines = getLines(text);
  const warnings: string[] = [];

  const name = lines.find(line =>
    /name|surname/i.test(line) || /^[A-Z\s]{8,}$/.test(line)
  ) || null;

  const idNumber = lines.map(l =>
    l.match(/\b([A-Z0-9]{6,})\b/)?.[1]
  ).find(Boolean) || null;

  const dates = lines
    .flatMap((line, idx) =>
      [...line.matchAll(/\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g)]
        .map(m => ({ date: m[0], line, idx }))
    )
    .sort((a, b) => a.idx - b.idx);

  const idDOB = normalizeDate(dates[0]?.date || "");
  const idIssueDate = normalizeDate(dates[1]?.date || "");
  const idExpiryDate = normalizeDate(dates.at(-1)?.date || "");

  const idIssuer = lines.find(l =>
    /republic|authority/i.test(l)
  ) || null;

  const placeOfIssue = lines.find(l =>
    /issue.*(accra|kumasi|tamale|cape coast|takoradi)/i.test(l)
  ) || null;

  if (!name) warnings.push("Name not found");
  if (!idNumber) warnings.push("ID number not found");
  if (!idDOB) warnings.push("DOB not found");
  if (!idIssuer) warnings.push("Issuer not found");
  if (!placeOfIssue) warnings.push("Place of issue not found");

  return {
    idName: name,
    idNumber,
    personalIdNumber: null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer,
    placeOfIssue,
    rawText: text,
    extractionWarnings: warnings,
  };
};

const compareFaces = async (selfieUrl: string, idUrl: string): Promise<{ confidence: number }> => {
  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl,
  });

  const response = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, { timeout: 20000 });
  const confidence = Number(response.data?.confidence || 0);

  if (!response.data?.faces1?.length || !response.data?.faces2?.length) {
    throw new Error("No face detected in one or both images.");
  }

  return { confidence };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    
    const {
      email,
      name,
      contactPhone,
      password,
      role,
      selfieImage,
      idImage,
      idName,
      idNumber,
      idDOB,
      idExpiryDate,
      idIssuer,
      idIssueDate,
      personalIdNumber,
      otpCode
    } = body;

    // Validate required fields
    const requiredFields = {};
    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length >= 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate OTP via Prisma
    const otpVerification = await prisma.oTPVerification.findFirst({
      where: {
        phoneNumber: contactPhone.toString(),
        code: otpCode.toString(),
        verified: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (!otpVerification) {
      return NextResponse.json(
        {
          error: "OTP verification failed",
          details: otpCode
            ? "The OTP is invalid or has expired"
            : "No OTP code provided"
        },
        { status: 403 }
      );
    }

    // Check for existing users
    const [existingEmail, existingPhone] = await Promise.all([
      prisma.user.findUnique({ where: { email: email.toString() } }),
      prisma.user.findUnique({ where: { contactPhone: contactPhone.toString() } })
    ]);

    if (existingEmail) {
      return NextResponse.json(
        { error: "This email is already registered" },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { error: "This phone number is already registered" },
        { status: 409 }
      );
    }

    // Validate role
    if (!Object.values(UserRole).includes(role as UserRole)) {
      return NextResponse.json(
        { error: "Invalid user role selected" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.toString())) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.toString().length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    let faceConfidence = 0;
    let selfieImageUrl = "";
    let idImageUrl = "";
    let extractedInfo = {
      idName: null,
      idNumber: null,
      personalIdNumber: null,
      idDOB: null,
      idIssueDate: null,
      idExpiryDate: null,
      idIssuer: null,
      placeOfIssue: null,
      rawText: "",
      extractionWarnings: []
    };

    // If PROVIDER, validate extra fields and process images
    if (role === "PROVIDER") {
      const selfieFile = formData.get("selfieImage") as File;
      const idFile = formData.get("idImage") as File;

      if (!selfieFile || !idFile) {
        return NextResponse.json(
          { error: "Both selfie and ID images are required for providers" },
          { status: 400 }
        );
      }

      // Process images
      const [selfieBuffer, idBuffer] = await Promise.all([
        processImageForOCR(selfieFile),
        processImageForOCR(idFile),
      ]);

      // Upload to Cloudinary
      const [selfieUpload, idUpload] = await Promise.all([
        uploadToCloudinary(selfileBuffer, selfieFile.type),
        uploadToCloudinary(idBuffer, idFile.type),
      ]);

      selfieImageUrl = selfieUpload.secure_url;
      idImageUrl = idUpload.secure_url;

      // Perform OCR on ID image
      const ocrText = await performOCRWithRetry(idBuffer);
      extractedInfo = extractIDInfo(ocrText);

      // Verify face match
      const faceResult = await compareFaces(selfieImageUrl, idImageUrl);
      faceConfidence = faceResult.confidence;

      if (faceConfidence < FACE_MATCH_THRESHOLD) {
        return NextResponse.json(
          { error: "Face verification failed. The selfie doesn't match the ID photo." },
          { status: 400 }
        );
      }

      // Validate extracted ID info
      if (!extractedInfo.idName || !extractedInfo.idNumber || !extractedInfo.idDOB) {
        return NextResponse.json(
          { error: "Could not extract sufficient information from the ID document" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password.toString(), 12);

    // Create user transactionally
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: email.toString(),
          name: name.toString(),
          contactPhone: contactPhone.toString(),
          hashedPassword,
          role: role as UserRole,
          isOtpVerified: true,
          ...(role === "PROVIDER" && {
            isFaceVerified: true,
            selfieImage: selfieImageUrl,
            idImage: idImageUrl,
            faceConfidence,
            idName: extractedInfo.idName,
            idNumber: extractedInfo.idNumber,
            idDOB: extractedInfo.idDOB,
            idExpiryDate: extractedInfo.idExpiryDate,
            idIssueDate: extractedInfo.idIssueDate,
            idIssuer: extractedInfo.idIssuer,
            personalIdNumber: personalIdNumber?.toString()
          })
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          contactPhone: true,
          isFaceVerified: true,
          createdAt: true
        }
      });

      await tx.oTPVerification.delete({ where: { id: otpVerification.id } });

      return createdUser;
    });

    return NextResponse.json(
      {
        success: true,
        user,
        message: role === "PROVIDER"
          ? "Provider account created successfully"
          : "Account created successfully"
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: "Registration failed",
        details: process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again later"
      },
      { status: 500 }
    );
  }
}