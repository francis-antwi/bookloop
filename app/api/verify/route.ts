// app/api/verify/route.ts
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// ===== Cloudinary Config =====
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ===== Constants =====
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const MAX_IMAGE_SIZE = 5_000_000;
const MIN_IMAGE_SIZE = 20_000;
const FACE_MATCH_THRESHOLD = 80;

interface IDInfo {
  idName: string | null;
  idNumber: string | null;
  personalIdNumber: string | null;
  idDOB: string | null;
  idIssueDate: string | null;
  idExpiryDate: string | null;
  idIssuer: string | null;
  placeOfIssue: string | null;
  idType: string | null;
  idGender: string | null;
  idNationality: string | null;
  rawText: string;
  extractionWarnings: string[];
}

interface VerificationResult {
  success: boolean;
  verification: {
    faceMatch: boolean;
    confidence: number;
    threshold: number;
  };
  document: IDInfo & {
    type: string;
    imageUrl: string;
    selfieUrl: string;
    extractionComplete: boolean;
  };
  registration?: {
    success: boolean;
    userId?: string;
    error?: string;
  };
}

// ===== Utilities =====
const validateFile = (file: File) => {
  if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
    throw new Error("Only JPEG or PNG images are allowed");
  }
  if (file.size < MIN_IMAGE_SIZE) {
    throw new Error("Image too small. Try a higher-quality photo.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Image too large. Max 5MB.");
  }
};

const processImageForOCR = async (file: File): Promise<Buffer> => {
  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .linear(1.1, -10)
    .sharpen()
    .jpeg({ quality: 90 })
    .toBuffer();
};

const uploadToCloudinary = async (buffer: Buffer, fileType: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  const upload = await cloudinary.uploader.upload(dataURI, {
    folder: "id_verification",
    resource_type: "image",
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
  });
  return upload.secure_url;
};

const performTaggunOCR = async (buffer: Buffer): Promise<string> => {
  const base64 = buffer.toString("base64");

const res = await axios.post(
  "https://api.taggun.io/api/ocr/scan/base64",
    {
      filename: "id.jpg",
      contentType: "image/jpeg",
      base64,
    },
    {
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.TAGGUN_API_KEY!,
      },
      timeout: OCR_TIMEOUT_MS,
    }
  );

  if (!res.data || !res.data.text || res.data.text.trim().length < 20) {
    throw new Error("OCR returned insufficient or no text");
  }

  return res.data.text;
};

const extractField = (lines: string[], patterns: RegExp[]): string | null => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1]?.trim() || match[0]?.trim() || null;
    }
  }
  return null;
};

const normalizeDate = (input: string): string | null => {
  const date = new Date(input);
  return isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const warnings: string[] = [];

  const idName = extractField(lines, [/name[:\-]?\s*(.+)/i]);
  const idNumber = extractField(lines, [/(id|card|passport) number[:\-]?\s*([A-Z0-9]+)/i]);
  const personalIdNumber = extractField(lines, [/personal.*number[:\-]?\s*([A-Z0-9]+)/i]);
  const idDOB = normalizeDate(extractField(lines, [/date of birth[:\-]?\s*(.+)/i]) ?? "");
  const idIssueDate = normalizeDate(extractField(lines, [/issue(?:d)? date[:\-]?\s*(.+)/i]) ?? "");
  const idExpiryDate = normalizeDate(extractField(lines, [/expir(?:y|ation) date[:\-]?\s*(.+)/i]) ?? "");
  const idIssuer = extractField(lines, [/issued by[:\-]?\s*(.+)/i]);
  const placeOfIssue = extractField(lines, [/place of issue[:\-]?\s*(.+)/i]);
  const idType = extractField(lines, [/(passport|driver['’]s license|ghana card|id card|national id)/i]);
  const idGender = extractField(lines, [/gender[:\-]?\s*(male|female|m|f)/i]);
  const idNationality = extractField(lines, [/nationality[:\-]?\s*(.+)/i]);

  if (!idName) warnings.push("Name not found.");
  if (!idNumber && !personalIdNumber) warnings.push("ID number missing.");
  if (!idDOB) warnings.push("Date of birth missing.");

  return {
    idName,
    idNumber,
    personalIdNumber,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer,
    placeOfIssue,
    idType,
    idGender,
    idNationality,
    rawText: text,
    extractionWarnings: warnings
  };
};

const compareFaces = async (selfieUrl: string, idUrl: string) => {
  const res = await axios.post(
    "https://api-us.faceplusplus.com/facepp/v3/compare",
    new URLSearchParams({
      api_key: process.env.FACEPP_API_KEY!,
      api_secret: process.env.FACEPP_API_SECRET!,
      image_url1: selfieUrl,
      image_url2: idUrl,
    }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }
  );

  const confidence = res.data?.confidence;
  if (!confidence) throw new Error("Face comparison failed");

  return { confidence };
};

// ===== Main Handler =====
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;
    const email = formData.get("email")?.toString();
    const shouldRegister = formData.get("register") === "true";

    if (!selfie || !id) {
      return NextResponse.json({ error: "Selfie and ID are required" }, { status: 400 });
    }

    const [selfieBuf, idBuf] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    const [selfieUrl, idUrl] = await Promise.all([
      uploadToCloudinary(selfieBuf, selfie.type),
      uploadToCloudinary(idBuf, id.type),
    ]);

    const rawText = await performTaggunOCR(idBuf);
    const extracted = extractIDInfo(rawText);

    const faceResult = await compareFaces(selfieUrl, idUrl);
    const faceMatch = faceResult.confidence >= FACE_MATCH_THRESHOLD;

    const response: VerificationResult = {
      success: true,
      verification: {
        faceMatch,
        confidence: Math.round(faceResult.confidence),
        threshold: FACE_MATCH_THRESHOLD,
      },
      document: {
        ...extracted,
        type: extracted.idType || "Unknown",
        imageUrl: idUrl,
        selfieUrl,
        extractionComplete: extracted.extractionWarnings.length === 0,
      },
    };

    const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
    if (!BASE_URL) throw new Error("Missing BASE_URL in environment");

    if (shouldRegister && email) {
      try {
        const registerRes = await fetch(`${BASE_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: extracted.idName,
            idNumber: extracted.idNumber || extracted.personalIdNumber,
            dob: extracted.idDOB,
            idType: extracted.idType,
            idIssuer: extracted.idIssuer,
            idIssueDate: extracted.idIssueDate,
            idExpiryDate: extracted.idExpiryDate,
            placeOfIssue: extracted.placeOfIssue,
            gender: extracted.idGender,
            nationality: extracted.idNationality,
            imageUrl: idUrl,
            selfieUrl,
            role: "PROVIDER",
            verified: true,
            rawText,
          }),
        });

        const regData = await registerRes.json();
        response.registration = {
          success: registerRes.ok,
          userId: regData?.userId,
          error: regData?.error,
        };

        if (!registerRes.ok) {
          console.error("❌ Registration failed:", {
            status: registerRes.status,
            body: regData,
          });
        }
      } catch (regErr: any) {
        console.error("❌ Registration error:", {
          message: regErr.message,
          stack: regErr.stack,
        });

        response.registration = {
          success: false,
          error: regErr.message,
        };
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("❌ [VERIFY ERROR]:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      errorObject: error,
    });

    return NextResponse.json(
      {
        error: error?.message || "Internal server error",
        debug: process.env.NODE_ENV === "development" ? error : undefined,
      },
      { status: 500 }
    );
  }
}
