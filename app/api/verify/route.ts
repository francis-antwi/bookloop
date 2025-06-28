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

// Utilities
const cleanText = (text: string): string => {
  return text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();
};

const getLines = (text: string): string[] => {
  return text
    .split(/\r?\n/)
    .map(line => cleanText(line))
    .filter(line => line.length > 0);
};

// These should be implemented as you had them before
const extractName = (lines: string[]): string | null => {
  // Placeholder: implement your logic
  return null;
};

const extractDates = (lines: string[]): { date: string, line: string, index: number }[] => {
  // Placeholder: implement your logic
  return [];
};

const normalizeDate = (dateStr: string): Date => {
  const cleaned = dateStr.replace(/[^\d\/\-\.]/g, '');
  const parts = cleaned.split(/[\/\-\.]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a > 31) return new Date(a, b - 1, c);
    if (c > 31) return new Date(c, b - 1, a);
    return new Date(a, b - 1, c);
  }
  throw new Error(`Invalid date format: ${dateStr}`);
};

const extractIDNumber = (lines: string[]): string | null => {
  // Placeholder: implement your logic
  return null;
};

const extractIDInfo = (parsedText: string): IDInfo => {
  const lines = getLines(parsedText);
  const idName = extractName(lines);
  const idNumber = extractIDNumber(lines);
  const dates = extractDates(lines);
  const idDOB = dates.length > 0 ? dates[0].date : null;
  const idIssueDate = dates.length > 1 ? dates[1].date : null;
  const idExpiryDate = dates.length > 2 ? dates[2].date : null;

  return {
    idName,
    idNumber,
    personalIdNumber: null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer: null,
    placeOfIssue: null,
    rawText: parsedText,
  };
};

// Image processing
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

// Main handler
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      console.error("❌ Missing selfie or ID image.");
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    if (!selfie.type?.startsWith("image/") || !id.type?.startsWith("image/")) {
      console.error("❌ Invalid file type.");
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    if (selfie.size > 5 * 1024 * 1024 || id.size > 5 * 1024 * 1024) {
      console.error("❌ Image file too large.");
      return NextResponse.json({ error: "Image files must be smaller than 5MB." }, { status: 400 });
    }

    let selfieBuffer, idBuffer;
    try {
      [selfieBuffer, idBuffer] = await Promise.all([
        processImageFile(selfie),
        processImageFile(id)
      ]);
    } catch (err) {
      console.error("❌ Image processing failed:", err);
      throw new Error("Failed to process images.");
    }

    let selfieUpload, idUpload;
    try {
      [selfieUpload, idUpload] = await Promise.all([
        uploadToCloudinary(selfieBuffer, selfie.type),
        uploadToCloudinary(idBuffer, id.type)
      ]);
    } catch (err) {
      console.error("❌ Cloudinary upload failed:", err);
      throw new Error("Failed to upload images.");
    }

    let parsedText;
    try {
      parsedText = await performOCR(idBuffer);
    } catch (err) {
      console.error("❌ OCR failed:", err);
      throw new Error("Failed to extract text from ID.");
    }

    const idKeywords = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
    if (!idKeywords.some(k => parsedText.toLowerCase().includes(k))) {
      console.warn("⚠️ ID keyword check failed.");
      return NextResponse.json({ error: "The uploaded image doesn't appear to be a valid ID document." }, { status: 400 });
    }

    let extractedInfo: IDInfo;
    try {
      extractedInfo = extractIDInfo(parsedText);
    } catch (err) {
      console.error("❌ ID info extraction failed:", err);
      throw new Error("Failed to extract ID details.");
    }

    if (!extractedInfo.idName || !extractedInfo.idNumber || !extractedInfo.idDOB) {
      console.warn("⚠️ Incomplete extracted data:", extractedInfo);
      return NextResponse.json({ error: "Could not extract required ID information." }, { status: 400 });
    }

    try {
      const dob = normalizeDate(extractedInfo.idDOB);
      const age = new Date().getFullYear() - dob.getFullYear();
      if (age < 15 || age > 100) {
        console.warn("⚠️ Invalid DOB detected:", dob);
        return NextResponse.json({ error: "The date of birth on the ID appears to be invalid." }, { status: 400 });
      }
    } catch (err) {
      console.error("❌ Date normalization failed:", err);
      return NextResponse.json({ error: "Invalid date format on ID." }, { status: 400 });
    }

    let faceComparison;
    try {
      faceComparison = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    } catch (err) {
      console.error("❌ Face comparison failed:", err);
      throw new Error("Face match failed.");
    }

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
    let errorMessage = "Verification failed.";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error("❌ Unhandled error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
