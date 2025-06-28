import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";
import sharp from "sharp";


// ========== Cloudinary Config ==========
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// ========== Types ==========
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

// ========== Constants ==========
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const RECOMMENDED_MIN_SIZE = 50000;
const MAX_IMAGE_SIZE = 5_000_000;
const MIN_REQUIRED_FIELDS = 1;
const FACE_MATCH_THRESHOLD = 80;
const ID_KEYWORDS = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];

// ========== Utilities ==========
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

const logFieldSummary = (idInfo: IDInfo) => {
  console.log("📋 Final Field Extraction Summary:");
  const table = [
    ["Name", idInfo.idName],
    ["ID Number", idInfo.idNumber],
    ["DOB", idInfo.idDOB],
    ["Issue Date", idInfo.idIssueDate],
    ["Expiry Date", idInfo.idExpiryDate],
    ["Issuer", idInfo.idIssuer],
    ["Place of Issue", idInfo.placeOfIssue],
  ];
  table.forEach(([label, value]) => {
    console.log(`${label.padEnd(15)}: ${value || "NOT FOUND"}`);
  });
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
    const result = await cloudinary.v2.uploader.upload(dataURI, {
      folder: "face_compare",
      timeout: 30000,
      quality_analysis: true,
    });
    return result;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
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

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const warnings: string[] = [];

  const name = lines.map(l => l.match(/name[:\s]([a-zA-Z\s]{3,})/i)?.[1]?.trim()).find(Boolean) || null;
  const idNumber = lines.map(l => l.match(/id\s*no[:]?\s*([A-Z0-9]{6,})/i)?.[1]?.trim()).find(Boolean) || null;
  const dates = lines
    .flatMap((line, idx) => [...line.matchAll(/\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g)].map(m => ({ date: m[0], line, idx })))
    .sort((a, b) => a.idx - b.idx);

  const idDOB = normalizeDate(dates[0]?.date || "");
  const idIssueDate = normalizeDate(dates[1]?.date || "");
  const idExpiryDate = normalizeDate(dates.at(-1)?.date || "");

  const idIssuer = lines.map(l => l.match(/issued by (.+)/i)?.[1]?.trim()).find(Boolean) || null;
  const placeOfIssue = lines.map(l => l.match(/issued at (.+)/i)?.[1]?.trim()).find(Boolean) || null;

  if (!name) warnings.push("Name not found");
  if (!idNumber) warnings.push("ID number not found");
  if (!idDOB) warnings.push("DOB not found");
  if (!idIssuer) warnings.push("Issuer not found");
  if (!placeOfIssue) warnings.push("Place of issue not found");

  const info: IDInfo = {
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

  logFieldSummary(info);
  return info;
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

// ========== Main API ==========
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      return NextResponse.json({ error: "Missing selfie or ID image." }, { status: 400 });
    }

    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfieBuffer, selfie.type),
      uploadToCloudinary(idBuffer, id.type),
    ]);

    const ocrText = await performOCRWithRetry(idBuffer);

    if (!ID_KEYWORDS.some(k => ocrText.toLowerCase().includes(k))) {
      console.warn(`⚠️ [${requestId}] OCR output may not be an ID.`);
    }

    const extractedInfo = extractIDInfo(ocrText);

    const minFields = [extractedInfo.idName, extractedInfo.idNumber, extractedInfo.idDOB].filter(Boolean).length;
    if (minFields < MIN_REQUIRED_FIELDS) {
      return NextResponse.json({ error: "Insufficient ID info extracted." }, { status: 400 });
    }

    const { confidence } = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${requestId}] Verification done in ${duration}s`);

    return NextResponse.json({
      success: true,
      verification: { faceMatch, confidence, threshold: FACE_MATCH_THRESHOLD },
      document: {
        type: "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extractedInfo.extractionWarnings.length === 0,
        ...extractedInfo,
      },
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}

