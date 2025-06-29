import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// ========== Cloudinary Config ==========
cloudinary.config({
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

// ========== Constants ==========
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const RECOMMENDED_MIN_SIZE = 50000;
const MAX_IMAGE_SIZE = 5_000_000;
const MIN_REQUIRED_FIELDS = 2;
const FACE_MATCH_THRESHOLD = 80;
const CLOUDINARY_MAX_RETRIES = 2;
const ID_KEYWORDS = [
  "passport", "driver", "license", "identity", 
  "id card", "ghana card", "ecowas", "national", 
  "identification", "document"
];
const DATE_FORMATS = [
  /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/, // DD/MM/YYYY
  /(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})/, // YYYY/MM/DD
  /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})/, // DD/MM/YY
];

// ========== Utilities ==========
const cleanText = (text: string): string =>
  text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/)
    .map(cleanText)
    .filter(line => line.length > 3);

const normalizeDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  try {
    for (const format of DATE_FORMATS) {
      const match = dateStr.match(format);
      if (match) {
        const [, a, b, c] = match;
        const day = parseInt(a);
        const month = parseInt(b);
        const year = parseInt(c);
        
        if (a.length === 4) {
          return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        } else if (c.length === 4) {
          return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        } else {
          return `20${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
};

const extractField = (lines: string[], patterns: RegExp[]): string | null => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1]?.trim() || match[0]?.trim() || null;
      }
    }
  }
  return null;
};

const logFieldSummary = (idInfo: IDInfo) => {
  console.log("📋 Final Field Extraction Summary:");
  const table = [
    ["Name", idInfo.idName],
    ["ID Number", idInfo.idNumber],
    ["Personal ID", idInfo.personalIdNumber],
    ["Type", idInfo.idType],
    ["DOB", idInfo.idDOB],
    ["Issue Date", idInfo.idIssueDate],
    ["Expiry Date", idInfo.idExpiryDate],
    ["Issuer", idInfo.idIssuer],
    ["Place of Issue", idInfo.placeOfIssue],
    ["Gender", idInfo.idGender],
    ["Nationality", idInfo.idNationality],
  ];
  table.forEach(([label, value]) => {
    console.log(`${label.padEnd(15)}: ${value || "NOT FOUND"}`);
  });
  if (idInfo.extractionWarnings.length > 0) {
    console.log("⚠️ Extraction Warnings:");
    idInfo.extractionWarnings.forEach(warning => console.log(`- ${warning}`));
  }
};

const validateFile = (file: File) => {
  if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
    throw new Error('Only JPEG/PNG images are allowed');
  }
  if (file.size < ABSOLUTE_MIN_SIZE) {
    throw new Error(`Image too small (min ${ABSOLUTE_MIN_SIZE/1000}KB)`);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large (max ${MAX_IMAGE_SIZE/1000000}MB)`);
  }
};

const processImageForOCR = async (file: File): Promise<Buffer> => {
  validateFile(file);
  
  const buffer = Buffer.from(await file.arrayBuffer());
  
  return sharp(buffer)
    .rotate()
    .resize({ 
      width: 1200, 
      withoutEnlargement: true,
      kernel: sharp.kernel.lanczos3 
    })
    .greyscale()
    .normalize({ upper: 96 })
    .linear(1.1, -10)
    .sharpen({ sigma: 1.2, flat: 1, jagged: 1 })
    .modulate({ brightness: 1.05 })
    .jpeg({ 
      quality: 90, 
      mozjpeg: true,
      chromaSubsampling: '4:4:4'
    })
    .toBuffer();
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string, retries = CLOUDINARY_MAX_RETRIES) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 40000,
        resource_type: "auto",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET, // Optional: if using upload presets
      });
      
      if (result.secure_url) {
        return result;
      }
      throw new Error("Upload succeeded but no URL returned");
    } catch (error: any) {
      console.error(`Cloudinary upload attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw new Error(`Cloudinary upload failed after ${retries} attempts: ${error.message}`);
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error("Cloudinary upload failed");
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

  const response = await axios.post("https://api.ocr.space/parse/image", params, {
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": process.env.OCR_SPACE_API_KEY! 
    },
    timeout: OCR_TIMEOUT_MS,
  });

  const result = response.data;
  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR Error: ${result.ErrorMessage || result.ErrorDetails || "Unknown error"}`);
  }

  const parsedText = result.ParsedResults?.[0]?.ParsedText;
  if (!parsedText || parsedText.trim().length < 20) {
    throw new Error("Insufficient OCR result. Make sure the image is clear and contains text.");
  }

  return parsedText;
};

const performOCRWithRetry = async (imageBuffer: Buffer): Promise<string> => {
  let lastError: any = null;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      const result = await performOCR(imageBuffer);
      if (result && result.trim().length > 20) {
        return result;
      }
      throw new Error("OCR returned insufficient text");
    } catch (e) {
      lastError = e;
      if (i < OCR_MAX_RETRIES - 1) {
        await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
      }
    }
  }
  throw lastError;
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const warnings: string[] = [];

  console.log("🧾 OCR Lines:");
  lines.forEach((line, i) => console.log(`${i.toString().padStart(2)}:`, line));

  const joinedText = lines.join(" ");

  const idType = extractField(lines, [
    /(passport|visa|driver'?s? license|national id|identity card|ghana card|ecowas card|voter'?s? id)/i,
    /document type:?\s*([a-z\s]+)/i,
    /type:?\s*([a-z\s]+)/i
  ]);

  const idName = extractField(lines, [
    /name:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /surname:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /full name:?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/i,
    /(?:holder|applicant)'?s name:?\s*([a-z\s,.'-]+)/i
  ]) || extractField([joinedText], [/([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/]);

  const idNumber = extractField(lines, [
    /(?:id number|card number|no\.?):?\s*([A-Z0-9]{6,})/i,
    /\b[A-Z]{2,3}\d{6,}\b/,
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/
  ]);

  const personalIdNumber = extractField(lines, [
    /personal id:?\s*([A-Z0-9]+)/i,
    /pin:?\s*([A-Z0-9]+)/i,
    /national id:?\s*([A-Z0-9]+)/i
  ]);

  const idDOB = extractField(lines, [
    /(?:dob|date of birth):?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i
  ]) || normalizeDate(extractField(lines, [/\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/]) ?? "");

  const idIssueDate = extractField(lines, [
    /(?:date of issue|issued):?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i
  ]) || normalizeDate(extractField(lines, [/\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/]) ?? "");

  const idExpiryDate = extractField(lines, [
    /(?:expiry|expires|valid until):?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i
  ]) || normalizeDate(extractField(lines, [/\b\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}\b/]) ?? "");

  const idIssuer = extractField(lines, [
    /issued by:? ([a-z\s]+)/i,
    /authority:? ([a-z\s]+)/i,
    /republic of ([A-Za-z\s]+)/i
  ]);

  const placeOfIssue = extractField(lines, [
    /issued at:? ([a-z\s]+)/i,
    /place of issue:? ([a-z\s]+)/i,
    /location:? ([a-z\s]+)/i
  ]);

  const idGender = extractField(lines, [
    /gender:? ([A-Z]+)/i,
    /\b(MALE|FEMALE)\b/i
  ]);

  const idNationality = extractField(lines, [
    /nationality:? ([A-Z\s]+)/i,
    /citizen of ([A-Z\s]+)/i
  ]);

  // Add warnings for missing important fields
  if (!idName) warnings.push("Name not found");
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found");
  if (!idDOB) warnings.push("Date of birth not found");
  if (!idIssuer) warnings.push("Issuer not found");
  if (!idType) warnings.push("ID type not detected");

  const info: IDInfo = {
    idName,
    idNumber,
    personalIdNumber,
    idDOB: normalizeDate(idDOB || ""),
    idIssueDate: normalizeDate(idIssueDate || ""),
    idExpiryDate: normalizeDate(idExpiryDate || ""),
    idIssuer,
    placeOfIssue,
    idType,
    idGender,
    idNationality,
    rawText: text,
    extractionWarnings: warnings
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
    return_landmark: '0',
    return_attributes: 'none',
  });

  try {
    const response = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, { 
      timeout: 20000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    const confidence = Number(response.data?.confidence || 0);

    if (!response.data?.faces1?.length || !response.data?.faces2?.length) {
      throw new Error(
        response.data?.faces1?.length ? "No face detected in ID photo" : "No face detected in selfie"
      );
    }

    if (response.data.faces1.length > 1 || response.data.faces2.length > 1) {
      throw new Error("Multiple faces detected in one or both images");
    }

    return { confidence };
  } catch (error: any) {
    console.error("Face++ API Error:", error.response?.data || error.message);
    throw new Error(`Face comparison failed: ${error.message}`);
  }
};

// ========== Main API ==========
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`🔍 [${requestId}] Starting verification process`);

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    console.log(`🖼️ [${requestId}] Processing images...`);
    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    console.log(`☁️ [${requestId}] Uploading to Cloudinary...`);
    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinaryWithRetry(selfieBuffer, selfie.type),
      uploadToCloudinaryWithRetry(idBuffer, id.type),
    ]);

    console.log(`🔤 [${requestId}] Performing OCR on ID...`);
    const ocrText = await performOCRWithRetry(idBuffer);

    const isLikelyID = ID_KEYWORDS.some(k => ocrText.toLowerCase().includes(k));
    if (!isLikelyID) {
      console.warn(`⚠️ [${requestId}] Document may not be a valid ID. OCR text lacks common ID keywords.`);
    }

    console.log(`🔍 [${requestId}] Extracting ID information...`);
    const extractedInfo = extractIDInfo(ocrText);

    const requiredFields = [
      extractedInfo.idName,
      extractedInfo.idNumber || extractedInfo.personalIdNumber,
      extractedInfo.idDOB
    ].filter(Boolean).length;
    
    if (requiredFields < MIN_REQUIRED_FIELDS) {
      return NextResponse.json(
        { error: "Insufficient ID information extracted. Please provide a clearer image." }, 
        { status: 400 }
      );
    }

    console.log(`👥 [${requestId}] Comparing faces...`);
    const { confidence } = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${requestId}] Verification completed in ${duration}s`);

    return NextResponse.json({
      success: true,
      verification: { 
        faceMatch, 
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD 
      },
      document: {
        type: extractedInfo.idType || "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extractedInfo.extractionWarnings.length === 0,
        ...extractedInfo,
      },
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    const errorMessage = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       "An unknown error occurred";
    
    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    );
  }
}