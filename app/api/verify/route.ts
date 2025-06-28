import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Type definitions
interface IDInfo {
  idName: string | null;
  idNumber: string | null;
  personalIdNumber: string | null;
  idDOB: string | null;
  idIssueDate: string | null;
  idExpiryDate: string | null;
  idIssuer: string | null;
  placeOfIssue: string | null;
  rawText: string;
}

interface VerificationResult {
  success: boolean;
  verification: {
    faceMatch: boolean;
    confidence: number;
    threshold: number;
  };
  document: {
    type: string;
    imageUrl: string;
    selfieUrl: string;
  } & IDInfo;
}

// Text processing utilities
const cleanText = (text: string): string => {
  return text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();
};

const getLines = (text: string): string[] => {
  return text.split(/\r?\n/).map(line => cleanText(line)).filter(line => line.length > 0);
};

// Information extraction functions
const extractName = (lines: string[]): string | null => {
  // ... (keep your existing extractName implementation)
};

const extractDates = (lines: string[]): { date: string, line: string, index: number }[] => {
  // ... (keep your existing extractDates implementation)
};

const normalizeDate = (dateStr: string): Date => {
  // ... (keep your existing normalizeDate implementation)
};

const extractIDNumber = (lines: string[]): string | null => {
  // ... (keep your existing extractIDNumber implementation)
};

const extractIDInfo = (parsedText: string): IDInfo => {
  // ... (keep your existing extractIDInfo implementation)
};

// File processing
const processImageFile = async (file: File): Promise<Buffer> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return sharp(buffer)
    .resize({ width: 800 })
    .grayscale()
    .normalize()
    .jpeg({ quality: 85 })
    .toBuffer();
};

const uploadToCloudinary = async (buffer: Buffer, fileType: string): Promise<{ secure_url: string }> => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  return cloudinary.v2.uploader.upload(dataURI, {
    folder: "face_compare",
    timeout: 30000
  });
};

// API endpoints
const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  
  const response = await axios.post(
    "https://api.ocr.space/parse/image",
    new URLSearchParams({
      apikey: process.env.OCR_SPACE_API_KEY!,
      base64Image,
      language: "eng",
      OCREngine: "2"
    }),
    { 
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000 
    }
  );

  if (!response.data?.ParsedResults?.[0]?.ParsedText) {
    throw new Error("Could not extract text from ID");
  }

  return response.data.ParsedResults[0].ParsedText;
};

const compareFaces = async (selfieUrl: string, idUrl: string): Promise<{ confidence: number }> => {
  const response = await axios.post(
    "https://api-us.faceplusplus.com/facepp/v3/compare",
    new URLSearchParams({
      api_key: process.env.FACEPP_API_KEY!,
      api_secret: process.env.FACEPP_API_SECRET!,
      image_url1: selfieUrl,
      image_url2: idUrl,
      return_landmark: "0",
      return_attributes: "none"
    }),
    { timeout: 15000 }
  );

  if (!response.data?.faces1?.[0] || !response.data?.faces2?.[0]) {
    throw new Error("Could not detect faces in one or both images");
  }

  return {
    confidence: Number(response.data.confidence) || 0
  };
};

// Main API handler
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    // Input validation
    if (!selfie || !id) {
      return NextResponse.json(
        { error: "Both selfie and ID image are required." }, 
        { status: 400 }
      );
    }

    if (!selfie.type?.startsWith("image/") || !id.type?.startsWith("image/")) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 }
      );
    }

    if (selfie.size > 5 * 1024 * 1024 || id.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Image files must be smaller than 5MB." },
        { status: 400 }
      );
    }

    // Process images in parallel
    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageFile(selfie),
      processImageFile(id)
    ]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfieBuffer, selfie.type),
      uploadToCloudinary(idBuffer, id.type)
    ]);

    // Perform OCR and face comparison in parallel
    const [parsedText, faceComparison] = await Promise.all([
      performOCR(idBuffer),
      compareFaces(selfieUpload.secure_url, idUpload.secure_url)
    ]);

    // Validate ID document
    const idKeywords = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
    if (!idKeywords.some(keyword => parsedText.toLowerCase().includes(keyword))) {
      return NextResponse.json(
        { error: "The uploaded image doesn't appear to be a valid ID document." },
        { status: 400 }
      );
    }

    // Extract ID information
    const extractedInfo = extractIDInfo(parsedText);
    if (!extractedInfo.idName || !extractedInfo.idNumber || !extractedInfo.idDOB) {
      return NextResponse.json(
        { error: "Could not extract required ID information (name, number, or date of birth)." },
        { status: 400 }
      );
    }

    // Validate date of birth
    const dob = normalizeDate(extractedInfo.idDOB);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 15 || age > 100) {
      return NextResponse.json(
        { error: "The date of birth on the ID appears to be invalid." },
        { status: 400 }
      );
    }

    // Prepare response
    const matchThreshold = 80;
    const confidence = parseFloat(faceComparison.confidence.toFixed(2));

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch: confidence >= matchThreshold,
        confidence,
        threshold: matchThreshold
      },
      document: {
        type: "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        ...extractedInfo
      }
    });

  } catch (error: unknown) {
    console.error("Verification error:", error);
    
    let errorMessage = "Verification failed";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}