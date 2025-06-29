import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// === Cloudinary Config ===
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// === Types ===
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
  document: {
    type: string;
    imageUrl: string;
    selfieUrl: string;
    extractionComplete: boolean;
  } & IDInfo;
}

// === Constants ===
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const MAX_IMAGE_SIZE = 5_000_000;
const MIN_REQUIRED_FIELDS = 2;
const FACE_MATCH_THRESHOLD = 80;

const ID_KEYWORDS = [
  "passport", "driver", "license", "identity", "id card",
  "ghana card", "ecowas", "national", "identification", "document"
];

const DATE_FORMATS = [
  /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/, // DD/MM/YYYY
  /(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})/, // YYYY/MM/DD
  /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/   // DD/MM/YY
];

// === Utilities ===
const cleanText = (text: string): string =>
  text.replace(/[^\x00-\x7F\r\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 3);

const normalizeDate = (input: string): string | null => {
  for (const format of DATE_FORMATS) {
    const match = input.match(format);
    if (match) {
      const [_, a, b, c] = match;
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      return `20${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
  }
  return null;
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

const validateFile = (file: File) => {
  if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
    throw new Error("Only JPEG/PNG images are allowed");
  }
  if (file.size < ABSOLUTE_MIN_SIZE) {
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
    .resize({ width: 1200, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 })
    .greyscale()
    .normalize()
    .linear(1.1, -10)
    .sharpen({ sigma: 1.2, flat: 1, jagged: 1 })
    .modulate({ brightness: 1.05 })
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toBuffer();
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  for (let i = 0; i < 2; i++) {
    try {
      const res = await cloudinary.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 40000,
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      });
      if (res.secure_url) return res;
    } catch (err: any) {
      if (i === 1) throw new Error(`Cloudinary upload failed: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error("Upload failed");
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "5",
    isTable: "true",
    detectOrientation: "true",
    scale: "true",
  });

  const res = await axios.post("https://api.ocr.space/parse/image", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": process.env.OCR_SPACE_API_KEY!
    },
    timeout: OCR_TIMEOUT_MS,
  });

  const result = res.data;
  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR Error: ${result.ErrorMessage || "Unknown"}`);
  }

  const text = result.ParsedResults?.[0]?.ParsedText;
  if (!text || text.length < 20) {
    throw new Error("OCR returned insufficient text");
  }

  return text;
};

const performOCRWithRetry = async (buffer: Buffer) => {
  let lastErr;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      return await performOCR(buffer);
    } catch (e) {
      lastErr = e;
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i)));
    }
  }
  throw lastErr;
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joinedText = lines.join(" ");
  const warnings: string[] = [];

  const idName = extractField(lines, [
    /(?:name|full name|surname):?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
  ]) || extractField([joinedText], [/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/]);

  const idNumber = extractField(lines, [
    /(?:id number|card number|no\.?):?\s*([A-Z0-9]{6,})/i,
    /\b[A-Z]{2,3}\d{6,}\b/,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/
  ]);

  const personalIdNumber = extractField(lines, [
    /personal id:?\s*([A-Z0-9]+)/i,
    /pin:?\s*([A-Z0-9]+)/i
  ]);

  const idDOB = normalizeDate(extractField(lines, [/date of birth:?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i]) ?? "");
  const idIssueDate = normalizeDate(extractField(lines, [/issued:?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i]) ?? "");
  const idExpiryDate = normalizeDate(extractField(lines, [/(?:expiry|expires|valid until):?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i]) ?? "");

  const idIssuer = extractField(lines, [/issued by:? ([a-z\s]+)/i, /republic of ([a-z\s]+)/i]);
  const placeOfIssue = extractField(lines, [/issued at:? ([a-z\s]+)/i]);
  const idType = extractField(lines, [/(passport|driver's license|ghana card|identity card)/i]);
  const idGender = extractField(lines, [/\b(MALE|FEMALE)\b/i, /gender:? ([A-Z]+)/i]);
  const idNationality = extractField(lines, [/nationality:? ([A-Z\s]+)/i, /citizen of ([A-Z\s]+)/i]);

  if (!idName) warnings.push("Name not found");
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found");
  if (!idDOB) warnings.push("DOB not found");

  return {
    idName, idNumber, personalIdNumber,
    idDOB, idIssueDate, idExpiryDate,
    idIssuer, placeOfIssue, idType,
    idGender, idNationality,
    rawText: text,
    extractionWarnings: warnings
  };
};

const compareFaces = async (selfieUrl: string, idUrl: string) => {
  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl
  });

  const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
  });

  const { confidence, faces1, faces2 } = res.data;
  if (!faces1?.length || !faces2?.length) {
    throw new Error("Face not detected in selfie or ID");
  }
  return { confidence };
};

// === Main POST Handler ===
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`🔍 [${requestId}] Verification started`);

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      return NextResponse.json({ error: "Both selfie and ID image are required" }, { status: 400 });
    }

    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinaryWithRetry(selfieBuffer, selfie.type),
      uploadToCloudinaryWithRetry(idBuffer, id.type),
    ]);

    const ocrText = await performOCRWithRetry(idBuffer);
    const extracted = extractIDInfo(ocrText);

    const required = [
      extracted.idName,
      extracted.idNumber || extracted.personalIdNumber,
      extracted.idDOB
    ].filter(Boolean).length;

    if (required < MIN_REQUIRED_FIELDS) {
      return NextResponse.json({ error: "Could not extract enough fields from ID" }, { status: 400 });
    }

    const { confidence } = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch,
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD
      },
      document: {
        ...extracted,
        type: extracted.idType || "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extracted.extractionWarnings.length === 0,
      }
    });

  } catch (error: any) {
    console.error("❌ Error in verification:", error);
    const msg = error.message || "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
