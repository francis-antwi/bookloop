// app/api/verify/route.ts
import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
import axios from "axios";

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

const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 10000; // Lowered for original image tolerance
const MAX_IMAGE_SIZE = 5_000_000;
const FACE_MATCH_THRESHOLD = 80;

const ID_KEYWORDS = [
  "passport", "driver", "license", "identity", "id card",
  "ghana card", "ecowas", "national", "identification", "document"
];

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 3);

const extractField = (lines: string[], patterns: RegExp[]): string | null => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return match[1]?.trim() || match[0].trim();
    }
  }
  return null;
};

const normalizeDate = (raw: string): string | null => {
  const cleaned = raw.replace(/[.,]/g, '').trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return null;
};

const validateFile = async (file: File) => {
  const allowed = ["image/jpeg", "image/png"];
  console.log(`📄 Validating file: ${file.name}, Type: ${file.type}, Size: ${file.size} bytes`);
  if (!allowed.includes(file.type)) throw new Error("Only JPEG or PNG images allowed.");
  if (file.size < ABSOLUTE_MIN_SIZE) throw new Error(`Image too small. File size: ${file.size} bytes`);
  if (file.size > MAX_IMAGE_SIZE) throw new Error("Image too large. Max 5MB.");
};

const uploadToCloudinary = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;
  return await cloudinary.uploader.upload(dataUri, {
    folder: "id_verification",
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
  });
};

const performOCRWithRetry = async (file: File): Promise<string> => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64Image = `data:${file.type};base64,${buffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "5"
  });
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      const res = await axios.post("https://api.ocr.space/parse/image", params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: OCR_TIMEOUT_MS
      });
      const text = res.data?.ParsedResults?.[0]?.ParsedText;
      if (text && text.length > 20) return text;
      throw new Error("OCR text too short");
    } catch (err) {
      if (i === OCR_MAX_RETRIES - 1) throw err;
      await new Promise(res => setTimeout(res, 1000 * (i + 1)));
    }
  }
  throw new Error("OCR failed after retries");
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joined = lines.join(" ");
  const warn: string[] = [];

  const log = (key: string, val: string | null) => {
    console.log(`📌 ${key}:`, val || '[NOT FOUND]');
    if (!val) warn.push(`${key} not found`);
    return val;
  };

  const namePatterns = [
    /name[:\-\s]*([A-Z][a-zA-Z'`\-\s]{2,})/i,
    /surname[:\-\s]*([A-Z][a-zA-Z'`\-\s]{2,})/i,
    /given names?[:\-\s]*([A-Z][a-zA-Z'`\-\s]{2,})/i,
    /^([A-Z][a-z]{2,}(\s+[A-Z][a-z]{2,}){1,3})$/
  ];

  return {
    idName: log("idName", extractField(lines, namePatterns)),
    idNumber: log("idNumber", extractField(lines, [/id(?:\s*no|number)?[:\-\s]*([A-Z0-9\-]+)/i, /card number[:\s]*([A-Z0-9]+)/i])),
    personalIdNumber: log("personalIdNumber", extractField(lines, [/ghana card no[:\-\s]*([A-Z0-9]+)/i])),
    idDOB: log("idDOB", normalizeDate(extractField(lines, [/birth(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idIssueDate: log("idIssueDate", normalizeDate(extractField(lines, [/issue(?:d)?(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idExpiryDate: log("idExpiryDate", normalizeDate(extractField(lines, [/expiry(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idIssuer: log("idIssuer", extractField(lines, [/issued by[:\-\s]*([A-Za-z\s]+)/i])),
    placeOfIssue: log("placeOfIssue", extractField(lines, [/place of issue[:\-\s]*([A-Za-z\s]+)/i])),
    idType: log("idType", extractField([joined], [new RegExp(ID_KEYWORDS.join("|"), "i")])),
    idGender: log("idGender", extractField(lines, [/gender[:\-\s]*([MF]|Male|Female)/i])),
    idNationality: log("idNationality", extractField(lines, [/nationality[:\-\s]*([A-Za-z]+)/i])),
    rawText: text,
    extractionWarnings: warn
  };
};

const compareFaces = async (selfieUrl: string, idUrl: string) => {
  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl
  });
  const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params);
  if (!res.data || typeof res.data.confidence !== "number") {
    throw new Error("Face++ confidence not returned.");
  }
  return { confidence: res.data.confidence };
};

export async function POST(req: Request) {
  const id = Math.random().toString(36).substring(2, 8);
  console.log(`🚀 [${id}] Starting verification`);
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const idImage = formData.get("idImage") as File;
    const email = formData.get("email")?.toString();
    const shouldRegister = formData.get("register") === "true";

    if (!selfie || !idImage) throw new Error("Missing required files.");

    await Promise.all([validateFile(selfie), validateFile(idImage)]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfie),
      uploadToCloudinary(idImage)
    ]);

    const rawText = await performOCRWithRetry(idImage);
    const info = extractIDInfo(rawText);

    const requiredFields = [info.idName, info.idDOB, info.idNumber || info.personalIdNumber];
    if (requiredFields.filter(Boolean).length < 2) {
      return NextResponse.json({
        error: `Could not extract enough key fields. Missing: ${info.extractionWarnings.join(', ')}`
      }, { status: 400 });
    }

    const { confidence } = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    const response: VerificationResult = {
      success: true,
      verification: {
        faceMatch,
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD
      },
      document: {
        ...info,
        type: info.idType || "Unknown",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: info.extractionWarnings.length === 0
      }
    };

    if (shouldRegister && email) {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: info.idName,
          idNumber: info.idNumber || info.personalIdNumber,
          dob: info.idDOB,
          idType: info.idType,
          idIssuer: info.idIssuer,
          idIssueDate: info.idIssueDate,
          idExpiryDate: info.idExpiryDate,
          placeOfIssue: info.placeOfIssue,
          gender: info.idGender,
          nationality: info.idNationality,
          imageUrl: idUpload.secure_url,
          selfieUrl: selfieUpload.secure_url,
          role: "PROVIDER",
          verified: true,
          rawText: info.rawText
        })
      });

      const json = await res.json();
      response.registration = {
        success: res.ok,
        userId: json.userId,
        error: res.ok ? undefined : json.error
      };
    }

    return NextResponse.json(response);
  } catch (e: any) {
    console.error(`❌ [${id}] Error:`, e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
