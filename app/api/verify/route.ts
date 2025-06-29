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

const FACE_MATCH_THRESHOLD = 80;

const uploadToCloudinary = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: "id_verification",
      upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
    }, (error: any, result: any) => {
      if (error) reject("Cloudinary upload failed");
      else resolve(result);
    });
    uploadStream.end(buffer);
  });
};

const performOCRWithRapidAPI = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("image", file);

  const response = await axios.post(
    'https://ocr43.p.rapidapi.com/v1/result',
    formData,
    {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY!,
        'X-RapidAPI-Host': 'ocr43.p.rapidapi.com',
        'Content-Type': 'multipart/form-data'
      }
    }
  );

  const lines: string[] = response.data?.results?.[0]?.entities?.flatMap((entity: any) =>
    entity.objects?.flatMap((obj: any) =>
      obj.entities?.map((e: any) => e.text)
    )
  ).filter(Boolean) || [];

  const text = lines.join("\n");

  if (!text || text.length < 10) {
    throw new Error("OCR failed to extract sufficient text.");
  }

  return text;
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
  const warn: string[] = [];

  const log = (key: string, val: string | null) => {
    console.log(`📌 ${key}:`, val || '[NOT FOUND]');
    if (!val) warn.push(`${key} not found`);
    return val;
  };

  const normalizeDate = (raw: string): string | null => {
    const cleaned = raw.replace(/[.,]/g, '').trim();
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  const extractField = (patterns: RegExp[]): string | null => {
    for (const line of lines) {
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match) return match[1]?.trim() || match[0].trim();
      }
    }
    return null;
  };

  return {
    idName: log("idName", extractField([/name[:\-\s]*([A-Z][a-zA-Z\s]+)/i])),
    idNumber: log("idNumber", extractField([/id(?:\s*no|number)?[:\-\s]*([A-Z0-9\-]+)/i])),
    personalIdNumber: log("personalIdNumber", extractField([/ghana card no[:\-\s]*([A-Z0-9]+)/i])),
    idDOB: log("idDOB", normalizeDate(extractField([/birth(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idIssueDate: log("idIssueDate", normalizeDate(extractField([/issue(?:d)?(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idExpiryDate: log("idExpiryDate", normalizeDate(extractField([/expiry(?:\s*date)?[:\-\s]*([\d\w\s\/\-\.]+)/i]) || "")),
    idIssuer: log("idIssuer", extractField([/issued by[:\-\s]*([A-Za-z\s]+)/i])),
    placeOfIssue: log("placeOfIssue", extractField([/place of issue[:\-\s]*([A-Za-z\s]+)/i])),
    idType: log("idType", extractField([/passport|driver|license|identity|ghana card|ecowas|national/i])),
    idGender: log("idGender", extractField([/gender[:\-\s]*([MF]|Male|Female)/i])),
    idNationality: log("idNationality", extractField([/nationality[:\-\s]*([A-Za-z]+)/i])),
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

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfie),
      uploadToCloudinary(idImage)
    ]);

    const rawText = await performOCRWithRapidAPI(idImage);
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
