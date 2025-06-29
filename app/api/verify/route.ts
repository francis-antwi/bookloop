import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// === Cloudinary Config ===
cloudinary.v2.config({
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
    qualityScore: number;
  };
  registration?: {
    success: boolean;
    userId?: string;
    error?: string;
  };
  metadata?: {
    processingTimeMs: number;
    ocrEngine: string;
    faceMatchEngine: string;
  };
}

// === Constants ===
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const MAX_IMAGE_SIZE = 8_000_000;
const OCR_SPACE_MAX_SIZE_BYTES = 1024 * 1024;
const MIN_CRITICAL_FIELDS_FOR_BASIC_EXTRACTION = 3;
const MAX_OCR_WARNINGS_FOR_SUCCESS = 0;
const FACE_MATCH_THRESHOLD = 85;
const MIN_FACE_SIZE = 100;

const ID_KEYWORDS = [
  "passport", "driver", "license", "identity", "id card", "ghana card",
  "ecowas", "national", "identification", "document", "permit", "voter"
];

const DATE_FORMATS = [
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/,
  /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/,
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/,
  /^(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i,
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})$/i,
  /^(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{4})$/i,
  /^(\d{4})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})$/i,
];

// === Utility Functions ===
const cleanText = (text: string): string =>
  text.replace(/[^\x00-\x7F\r\n]/g, " ")
     .replace(/\s+/g, " ")
     .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 2);

const normalizeDate = (input: string): string | null => {
  const monthMap: Record<string, string> = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
  };

  for (const format of DATE_FORMATS) {
    const match = input.match(format);
    if (match) {
      if (match.length === 4) {
        const [_, a, b, c] = match;
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        const currentYear = new Date().getFullYear();
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        const yearInt = parseInt(c, 10);
        const fullYear = yearInt > (currentYear % 100) + 5 ? `19${c}` : `20${c}`;
        return `${fullYear}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else if (match.length >= 3) {
        let day, month, year;

        if (DATE_FORMATS[3].test(input) || DATE_FORMATS[5].test(input)) {
          day = match[1];
          month = monthMap[match[2].toLowerCase().substring(0, 3)];
          year = match[3];
        } else if (DATE_FORMATS[4].test(input)) {
          month = monthMap[match[1].toLowerCase().substring(0, 3)];
          day = match[2];
          year = match[3];
        } else if (DATE_FORMATS[6].test(input)) {
          year = match[1];
          month = monthMap[match[2].toLowerCase().substring(0, 3)];
          day = match[3];
        }

        if (day && month && year) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
};

const extractField = (lines: string[], patterns: RegExp[], joinChar: string = ' '): string | null => {
  const allText = lines.join(joinChar);
  for (const pattern of patterns) {
    let match = allText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    if (pattern.global) pattern.lastIndex = 0;
  }
  return null;
};

const validateFile = (file: File) => {
  if (!file.type.match(/image\/(jpeg|png|jpg)/)) {
    throw new Error("Only JPEG/PNG images are allowed.");
  }
  if (file.size < ABSOLUTE_MIN_SIZE) {
    throw new Error("Image too small. Try a higher-quality photo.");
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Max ${MAX_IMAGE_SIZE / 1_000_000}MB.`);
  }
};

// === Core Functions ===
const processImageForOCR = async (file: File, requestId: string): Promise<{ buffer: Buffer; qualityScore: number }> => {
  const startTime = Date.now();
  console.log(`[${requestId}] Starting image processing for OCR`);

  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  // First pass processing
  let processedBuffer = await sharp(buffer)
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .greyscale()
    .normalize()
    .linear(1.2, -20)
    .sharpen({ sigma: 1.5 })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  // Calculate quality score (simplified example)
  let qualityScore = Math.min(100, Math.max(0, 
    70 + 
    (processedBuffer.length > 500000 ? 10 : 0) + 
    (file.size > 1000000 ? 5 : 0)
  ));

  // Compression loop
  let quality = 85;
  while (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES && quality > 10) {
    quality -= 5;
    processedBuffer = await sharp(processedBuffer)
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    qualityScore -= 2; // Reduce score for each compression
  }

  // If still too large, reduce dimensions
  if (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES) {
    processedBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 900, withoutEnlargement: true })
      .greyscale()
      .normalize()
      .linear(1.2, -20)
      .sharpen({ sigma: 1.5 })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();
    qualityScore -= 5; // Reduce score for dimension reduction

    quality = 80;
    while (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES && quality > 10) {
      quality -= 5;
      processedBuffer = await sharp(processedBuffer)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
      qualityScore -= 2;
    }
  }

  if (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES) {
    throw new Error(`Processed image still exceeds OCR.space limit (${(processedBuffer.length / 1024).toFixed(2)} KB)`);
  }

  console.log(`[${requestId}] Finished image processing in ${Date.now() - startTime}ms`);
  return { buffer: processedBuffer, qualityScore };
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string, requestId: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await cloudinary.v2.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 60000,
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      });
      if (res.secure_url) return res;
    } catch (err: any) {
      console.error(`[${requestId}] Cloudinary upload attempt ${i + 1} failed:`, {
        error: err.message,
        stack: err.stack,
        response: err.response?.body
      });
      if (i === 2) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i)));
    }
  }
  throw new Error("Cloudinary upload failed after retries.");
};

const performOCR = async (imageBuffer: Buffer, requestId: string): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "2",
    isTable: "true",
    detectOrientation: "true",
    scale: "true",
    isOverlayRequired: "true",
  });

  try {
    const res = await axios.post("https://api.ocr.space/parse/image", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: OCR_TIMEOUT_MS,
    });

    const result = res.data;
    if (result.IsErroredOnProcessing) {
      console.error(`[${requestId}] OCR Error Response:`, result);
      throw new Error(`OCR Error: ${result.ErrorMessage?.join(', ') || "Unknown error"}`);
    }

    const text = result.ParsedResults?.[0]?.ParsedText;
    if (!text || text.length < 50) {
      console.error(`[${requestId}] Insufficient OCR Text:`, { textLength: text?.length });
      throw new Error("OCR returned insufficient or no text for reliable extraction.");
    }
    return text;
  } catch (err: any) {
    console.error(`[${requestId}] OCR Request Failed:`, {
      error: err.message,
      config: err.config,
      response: err.response?.data
    });
    throw err;
  }
};

const performOCRWithRetry = async (buffer: Buffer, requestId: string) => {
  let lastErr: any;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      return await performOCR(buffer, requestId);
    } catch (e: any) {
      lastErr = e;
      console.error(`[${requestId}] OCR Attempt ${i + 1} failed:`, e.message);
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i)));
    }
  }
  throw new Error(`OCR failed after multiple retries: ${lastErr.message || "Unknown error"}`);
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joinedText = lines.join(" ").toLowerCase();
  const warnings: string[] = [];
  const foundFields: Record<string, string | null> = {};

  // Name extraction
  let idName = extractField(lines, [
    /(?:name|full name|surname|given names):\s*([A-Za-z.'`'-\s]+(?:\s+[A-Za-z.'`'-\s]+){1,5})/,
    /^([A-Za-z.'`'-\s]+(?:\s+[A-Za-z.'`'-\s]+){1,5})$/,
    /\b(mr|ms|mrs|dr)\.?\s*([A-Za-z.'`'-\s]+(?:\s+[A-Za-z.'`'-\s]+){1,4})\b/i
  ]);

  if (idName) {
    idName = idName.replace(/(?:republic of|ghana|identification|authority)/ig, '').trim();
    if (idName.split(' ').filter(n => n.length > 1).length < 2) {
      warnings.push("Name appears incomplete or invalid");
      idName = null;
    } else {
      foundFields.idName = idName;
    }
  } else {
    warnings.push("Name not found");
  }

  // ID Number extraction
  let idNumber = extractField(lines, [
    /(?:id number|card number|no\.?):\s*([A-Z0-9\s]{6,})/i,
    /\b([A-Z]{2,3}\d{6,15})\b/,
    /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/
  ]);

  let personalIdNumber = extractField(lines, [
    /personal id:?\s*([A-Z0-9]+)/i,
    /pin:?\s*([A-Z0-9]+)/i,
    /ghana card no\.?:\s*([A-Z0-9]{10,})/i
  ]);

  if (idNumber) foundFields.idNumber = idNumber;
  if (personalIdNumber) foundFields.personalIdNumber = personalIdNumber;
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found");

  // Date of Birth extraction
  let idDOB = normalizeDate(extractField(lines, [
    /(?:date of birth|dob|birth date):\s*([^\n]+)/i,
    /(?:dob|birth)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ]) ?? "");

  if (idDOB) {
    if (isNaN(new Date(idDOB).getTime())) {
      warnings.push("Invalid Date of Birth format");
      idDOB = null;
    } else {
      foundFields.idDOB = idDOB;
    }
  } else {
    warnings.push("Date of Birth not found");
  }

  // Issue Date extraction
  let idIssueDate = normalizeDate(extractField(lines, [
    /(?:issue date|issued):\s*([^\n]+)/i,
    /issued\s*on:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ]) ?? "");

  if (idIssueDate) {
    if (isNaN(new Date(idIssueDate).getTime())) {
      warnings.push("Invalid Issue Date format");
      idIssueDate = null;
    } else {
      foundFields.idIssueDate = idIssueDate;
    }
  } else {
    warnings.push("Issue Date not found");
  }

  // Expiry Date extraction
  let idExpiryDate = normalizeDate(extractField(lines, [
    /(?:expiry date|expires):\s*([^\n]+)/i,
    /valid\s*until:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
  ]) ?? "");

  if (idExpiryDate) {
    if (isNaN(new Date(idExpiryDate).getTime())) {
      warnings.push("Invalid Expiry Date format");
      idExpiryDate = null;
    } else {
      foundFields.idExpiryDate = idExpiryDate;
    }
  } else {
    warnings.push("Expiry Date not found");
  }

  // ID Type extraction
  const idType = extractField(lines, [
    /(passport|driver's license|ghana card|identity card)/i,
    new RegExp(`\\b(?:${ID_KEYWORDS.join("|")}\\b`, 'i')
  ]);
  if (idType) foundFields.idType = idType; else warnings.push("ID Type not identified");

  // Gender extraction
  const idGender = extractField(lines, [
    /\b(MALE|FEMALE)\b/i,
    /gender:?\s*([M|F])/i
  ]);
  if (idGender) foundFields.idGender = idGender; else warnings.push("Gender not found");

  // Nationality extraction
  const idNationality = extractField(lines, [
    /nationality:?\s*([A-Z\s]+)/i,
    /\b(ghanaian|american|british|nigerian)\b/i
  ]);
  if (idNationality) foundFields.idNationality = idNationality; else warnings.push("Nationality not found");

  // Issuer extraction
  const idIssuer = extractField(lines, [
    /issued by:?\s*([a-z\s.,&()]+)/i,
    /\b(ministry of interior|national identification authority)\b/i
  ]);
  if (idIssuer) foundFields.idIssuer = idIssuer; else warnings.push("Issuer not found");

  // Place of Issue extraction
  const placeOfIssue = extractField(lines, [
    /issued at:?\s*([a-z\s.,]+)/i,
    /\b(accra|kumasi|takoradi|tema)\b/i
  ]);
  if (placeOfIssue) foundFields.placeOfIssue = placeOfIssue; else warnings.push("Place of Issue not found");

  // Date validation
  const currentYear = new Date().getFullYear();
  if (idDOB) {
    const dobDate = new Date(idDOB);
    if (dobDate.getFullYear() > currentYear - 5 || dobDate.getFullYear() < currentYear - 120) {
      warnings.push("Implausible Date of Birth");
      idDOB = null;
    }
  }

  if (idIssueDate && new Date(idIssueDate).getTime() > Date.now() + 86400000) {
    warnings.push("Issue date in future");
    idIssueDate = null;
  }

  if (idExpiryDate && new Date(idExpiryDate).getTime() < Date.now() - 2592000000) {
    warnings.push("Expiry date in past");
  }

  // Critical fields check
  const criticalFieldsFound = [
    foundFields.idName,
    foundFields.idNumber || foundFields.personalIdNumber,
    foundFields.idDOB
  ].filter(Boolean).length;

  if (criticalFieldsFound < MIN_CRITICAL_FIELDS_FOR_BASIC_EXTRACTION) {
    warnings.push("Insufficient critical ID fields extracted");
  }

  return {
    idName, idNumber, personalIdNumber,
    idDOB, idIssueDate, idExpiryDate,
    idIssuer, placeOfIssue, idType,
    idGender, idNationality,
    rawText: text,
    extractionWarnings: warnings
  };
};

const compareFaces = async (selfieUrl: string, idUrl: string, requestId: string) => {
  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl,
    return_result: "1",
  });

  try {
    const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60000,
    });

    const { confidence, faces1, faces2, error_message } = res.data;

    if (error_message) {
      console.error(`[${requestId}] Face++ API Error:`, {
        error: error_message,
        response: res.data
      });
      throw new Error(`Face++ API error: ${error_message}`);
    }
    if (typeof confidence === 'undefined') {
      console.error(`[${requestId}] Face++ Missing Confidence:`, res.data);
      throw new Error("Face++ confidence not returned");
    }
    if (!faces1?.length) {
      console.error(`[${requestId}] No Face in Selfie:`, { faces: faces1 });
      throw new Error("No face detected in selfie");
    }
    if (!faces2?.length) {
      console.error(`[${requestId}] No Face in ID:`, { faces: faces2 });
      throw new Error("No face detected in ID image");
    }

    console.log(`[${requestId}] Face Comparison Success:`, {
      confidence,
      faceCountSelfie: faces1.length,
      faceCountID: faces2.length
    });

    return { confidence };
  } catch (err: any) {
    console.error(`[${requestId}] Face++ Request Failed:`, {
      error: err.message,
      config: err.config,
      response: err.response?.data
    });
    throw err;
  }
};

// === Main POST Handler ===
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const requestId = Math.random().toString(36).slice(2, 8);
  const startTime = Date.now();

  try {
    console.log(`[${requestId}] Starting verification request`);
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;
    const email = formData.get("email")?.toString();
    const shouldRegister = formData.get("register") === "true";

    if (!selfie || !id) {
      console.error(`[${requestId}] Missing required files:`, {
        hasSelfie: !!selfie,
        hasID: !!id
      });
      return NextResponse.json({ error: "Both selfie and ID image are required" }, { status: 400 });
    }

    console.log(`[${requestId}] Received files:`, {
      selfie: { name: selfie.name, size: selfie.size, type: selfie.type },
      id: { name: id.name, size: id.size, type: id.type }
    });

    // Process images in parallel
    const [selfieProcessResult, idProcessResult] = await Promise.all([
      processImageForOCR(selfie, requestId).catch(err => {
        console.error(`[${requestId}] Selfie processing failed:`, err);
        throw err;
      }),
      processImageForOCR(id, requestId).catch(err => {
        console.error(`[${requestId}] ID processing failed:`, err);
        throw err;
      }),
    ]);

    // Upload to Cloudinary in parallel
    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinaryWithRetry(selfieProcessResult.buffer, selfie.type, requestId),
      uploadToCloudinaryWithRetry(idProcessResult.buffer, id.type, requestId),
    ]);

    console.log(`[${requestId}] Cloudinary uploads complete:`, {
      selfieUrl: selfieUpload.secure_url,
      idUrl: idUpload.secure_url
    });

    // Perform OCR on ID image
    const ocrText = await performOCRWithRetry(idProcessResult.buffer, requestId);
    console.log(`[${requestId}] OCR completed, text length:`, ocrText.length);
    
    const extracted = extractIDInfo(ocrText);
    console.log(`[${requestId}] Extracted ID Info:`, {
      idName: extracted.idName,
      idNumber: extracted.idNumber,
      idDOB: extracted.idDOB,
      warnings: extracted.extractionWarnings
    });

    // Face comparison
    let faceMatch = false;
    let confidence = 0;
    let faceComparisonError: string | undefined;

    try {
      const faceResult = await compareFaces(selfieUpload.secure_url, idUpload.secure_url, requestId);
      confidence = faceResult.confidence;
      faceMatch = confidence >= FACE_MATCH_THRESHOLD;
      if (!faceMatch) {
        faceComparisonError = `Face match confidence (${confidence.toFixed(2)}%) below threshold`;
        console.warn(`[${requestId}] ${faceComparisonError}`);
      }
    } catch (err: any) {
      faceComparisonError = `Face comparison failed: ${err.message}`;
      console.error(`[${requestId}] ${faceComparisonError}`);
    }

    // Calculate document quality score
    const documentQualityScore = Math.round(
      (selfieProcessResult.qualityScore + idProcessResult.qualityScore) / 2
    );

    // Prepare response
    const verificationResponse: VerificationResult = {
      success: faceMatch && extracted.extractionWarnings.length <= MAX_OCR_WARNINGS_FOR_SUCCESS && !faceComparisonError,
      verification: {
        faceMatch,
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD,
      },
      document: {
        ...extracted,
        type: extracted.idType || "Unknown",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extracted.extractionWarnings.length === 0,
        qualityScore: documentQualityScore,
      },
      metadata: {
        processingTimeMs: Date.now() - startTime,
        ocrEngine: "OCR.space v2",
        faceMatchEngine: "Face++ v3",
      },
    };

    if (faceComparisonError) {
      verificationResponse.document.extractionWarnings.push(faceComparisonError);
    }

    // Optional registration flow
    if (shouldRegister && email && verificationResponse.success) {
      try {
        console.log(`[${requestId}] Starting registration for:`, email);
        const registerRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: extracted.idName,
            idNumber: extracted.idNumber || extracted.personalIdNumber,
            dob: extracted.idDOB,
            idType: extracted.idType,
            imageUrl: idUpload.secure_url,
            selfieUrl: selfieUpload.secure_url,
            verified: true,
          }),
        });

        const registerResult = await registerRes.json();
        verificationResponse.registration = {
          success: registerRes.ok,
          userId: registerRes.ok ? registerResult.userId : undefined,
          error: registerRes.ok ? undefined : registerResult.error,
        };

        console.log(`[${requestId}] Registration result:`, verificationResponse.registration);
      } catch (err: any) {
        verificationResponse.registration = {
          success: false,
          error: `Registration failed: ${err.message}`,
        };
        console.error(`[${requestId}] Registration error:`, err);
      }
    } else if (shouldRegister) {
      verificationResponse.registration = {
        success: false,
        error: "Registration skipped - verification not successful",
      };
      console.warn(`[${requestId}] Registration skipped due to failed verification`);
    }

    console.log(`[${requestId}] Verification completed in ${Date.now() - startTime}ms`, {
      success: verificationResponse.success,
      faceMatch: verificationResponse.verification.faceMatch,
      confidence: verificationResponse.verification.confidence
    });

    return NextResponse.json(verificationResponse);
  } catch (error: any) {
    console.error(`[${requestId}] Verification Error:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      response: error.response?.data,
      config: error.config,
    });

    let errorMessage = "An unexpected error occurred during verification";
    
    if (error.message.includes("Image too")) {
      errorMessage = error.message;
    } else if (error.message.includes("Cloudinary")) {
      errorMessage = "Image upload failed";
      console.error(`[${requestId}] Cloudinary Error Details:`, {
        error: error.message,
        config: cloudinary.v2.config(),
        envVars: {
          cloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          apiKey: !!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
          apiSecret: !!process.env.CLOUDINARY_API_SECRET,
          uploadPreset: !!process.env.CLOUDINARY_UPLOAD_PRESET,
        }
      });
    } else if (error.message.includes("OCR")) {
      errorMessage = "Document recognition failed - please ensure clear image";
      console.error(`[${requestId}] OCR Error Details:`, {
        error: error.message,
        ocrKey: !!process.env.OCR_SPACE_API_KEY,
        response: error.response?.data
      });
    } else if (error.message.includes("Face")) {
      errorMessage = "Face comparison failed - ensure clear photos facing forward";
      console.error(`[${requestId}] Face++ Error Details:`, {
        error: error.message,
        faceppKey: !!process.env.FACEPP_API_KEY,
        faceppSecret: !!process.env.FACEPP_API_SECRET,
        response: error.response?.data
      });
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}