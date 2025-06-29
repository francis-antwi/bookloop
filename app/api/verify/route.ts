// app/api/verify/route.ts
import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
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

// === Constants ===
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000; // 20KB
const MAX_IMAGE_SIZE = 8_000_000; // Increased to 8MB for better quality images
const MIN_REQUIRED_FIELDS = 3; // Increased for higher accuracy requirement
const FACE_MATCH_THRESHOLD = 75; // Adjusted based on common benchmarks, can be fine-tuned

const ID_KEYWORDS = [
  "passport", "driver", "license", "identity", "id card", "ghana card",
  "ecowas", "national", "identification", "document", "permit", "voter"
];

// More comprehensive date formats
const DATE_FORMATS = [
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/, // DD/MM/YYYY
  /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // YYYY/MM/DD
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // DD/MM/YY
  /^(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i, // Day Month YYYY (e.g., 25 Dec 2023)
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})$/i, // Month Day, YYYY (e.g., Dec 25, 2023)
  /^(\d{1,2})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{4})$/i, // DD-MON-YYYY (e.g., 25-DEC-2023)
  /^(\d{4})-(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*-(\d{1,2})$/i, // YYYY-MON-DD
];

// === Utility Functions ===
const cleanText = (text: string): string =>
  text.replace(/[^\x00-\x7F\r\n]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 2); // Increased min length for lines

const normalizeDate = (input: string): string | null => {
  const monthMap: { [key: string]: string } = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
  };

  for (const format of DATE_FORMATS) {
    const match = input.match(format);
    if (match) {
      // Handle DD/MM/YYYY, YYYY/MM/DD, DD/MM/YY
      if (match.length === 4) {
        const [_, a, b, c] = match;
        // Assume YYYY-MM-DD if first part is 4 digits
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        // Assume DD-MM-YYYY if last part is 4 digits
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        // Handle DD/MM/YY (convert YY to YYYY)
        const fullYear = parseInt(c, 10) > (new Date().getFullYear() % 100) + 5 ? `19${c}` : `20${c}`; // Adjust for future dates
        return `${fullYear}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else if (match.length >= 3) { // For Day Month YYYY, Month Day, YYYY, etc.
        let day, month, year;

        if (DATE_FORMATS[3].test(input) || DATE_FORMATS[5].test(input)) { // Day Month YYYY, DD-MON-YYYY
          day = match[1];
          month = monthMap[match[2].toLowerCase().substring(0, 3)];
          year = match[3];
        } else if (DATE_FORMATS[4].test(input)) { // Month Day, YYYY
          month = monthMap[match[1].toLowerCase().substring(0, 3)];
          day = match[2];
          year = match[3];
        } else if (DATE_FORMATS[6].test(input)) { // YYYY-MON-DD
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

// Enhanced extractField with word boundaries and negative lookaheads
const extractField = (lines: string[], patterns: RegExp[], joinChar: string = ' '): string | null => {
  const allText = lines.join(joinChar);
  for (const pattern of patterns) {
    let match = allText.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
    // If pattern includes global flag, we might need to reset lastIndex
    if (pattern.global) pattern.lastIndex = 0;
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
    throw new Error(`Image too large. Max ${MAX_IMAGE_SIZE / 1_000_000}MB.`);
  }
};

// === Core Functions ===
const processImageForOCR = async (file: File): Promise<Buffer> => {
  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());
  return sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize({ width: 1500, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }) // Increased width for better OCR
    .greyscale()
    .normalize()
    .linear(1.2, -20) // Increased contrast slightly
    .sharpen({ sigma: 1.5, flat: 1, jagged: 2 }) // Stronger sharpening
    .modulate({ brightness: 1.1, saturation: 1.1 }) // Slightly brighter and more saturated
    .jpeg({ quality: 95, mozjpeg: true, chromaSubsampling: '4:4:4' }) // Higher JPEG quality
    .toBuffer();
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  for (let i = 0; i < 3; i++) { // Increased retries to 3
    try {
      const res = await cloudinary.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 60000, // Increased timeout
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      });
      if (res.secure_url) return res;
    } catch (err: any) {
      console.warn(`Cloudinary upload attempt ${i + 1} failed: ${err.message}`);
      if (i === 2) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error("Cloudinary upload failed after retries.");
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "2", // OCR Engine 2 is often better for documents
    isTable: "true", // Useful for structured documents
    detectOrientation: "true",
    scale: "true",
    isOverlayRequired: "true", // Get word-level confidence (if available/needed for future enhancements)
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
    throw new Error(`OCR Error: ${result.ErrorMessage?.join(', ') || "Unknown error"}`);
  }

  const text = result.ParsedResults?.[0]?.ParsedText;
  if (!text || text.length < 50) { // Increased minimum text length for validity
    throw new Error("OCR returned insufficient or no text for reliable extraction.");
  }

  return text;
};

const performOCRWithRetry = async (buffer: Buffer) => {
  let lastErr: any;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      return await performOCR(buffer);
    } catch (e: any) {
      lastErr = e;
      console.warn(`OCR attempt ${i + 1} failed: ${e.message}`);
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error(`OCR failed after multiple retries: ${lastErr.message || "Unknown error"}`);
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joinedText = lines.join(" ").toLowerCase(); // Join and convert to lowercase for case-insensitive matching
  const warnings: string[] = [];

  let idName: string | null = null;
  // Prioritize patterns that capture full names
  idName = extractField(lines, [
    /(?:name|full name|surname|given names|first name|last name):\s*([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,5})/,
    /^([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,5})$/, // Matches a line that looks like a name
    /\b(mr|ms|mrs|dr)\.?\s*([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,4})\b/i, // Name with title
    /\b([A-Z][a-z.'`’\-]+\s+[A-Z][a-z.'`’\-]+(?:\s+[A-Z][a-z.'`’\-]+)?)\b/ // Capitalized words as names
  ]);
  // Fallback for names if not found in specific lines
  if (!idName) {
    idName = extractField([joinedText], [
      /name\s*([a-z.'`’\-\s]+)/i,
      /\b([a-z][a-z.'`’\-\s]+(?:\s+[a-z][a-z.'`’\-\s]+){1,3})\b/ // Generic name pattern
    ]);
  }
  // Further refinement for name to remove extraneous text
  if (idName) {
    idName = idName.replace(/(?:republic of|ghana|identification|authority|card)/ig, '').trim();
  }


  const idNumber = extractField(lines, [
    /(?:id number|card number|no\.?|document no\.?|passport no\.?|document no|passport no):\s*([A-Z0-9\s]{6,})/i,
    /\b([A-Z]{2,3}\d{6,15})\b/, // e.g., GH123456789
    /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, // e.g., 1234 5678 9012 3456
    /\b([A-Z0-9]{9,20})\b/, // Generic alphanumeric ID
    /passport\s*number:\s*([A-Z0-9]+)/i,
    /licen[cs]e\s*number:\s*([A-Z0-9]+)/i,
  ]);

  const personalIdNumber = extractField(lines, [
    /personal id:?\s*([A-Z0-9]+)/i,
    /pin:?\s*([A-Z0-9]+)/i,
    /national id:?\s*([A-Z0-9]+)/i,
    /ghana card no\.?:\s*([A-Z0-9]{10,})/i, // Specific to Ghana Card format
    /unique\s*id:\s*([A-Z0-9]+)/i
  ]);

  const idDOB = normalizeDate(extractField(lines, [
    /(?:date of birth|dob|birth date|date of issue|issue date|expiry date|issued|expires|valid until)\s*:\s*([^\n]+)/i, // Catch all date formats
    /(?:dob|birth|date)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i,
    /\b(date of birth)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i
  ]) ?? "");

  const idIssueDate = normalizeDate(extractField(lines, [
    /(?:issue date|issued|date of issue)\s*:\s*([^\n]+)/i,
    /issued\s*on:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /\b(issue date)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i
  ]) ?? "");

  const idExpiryDate = normalizeDate(extractField(lines, [
    /(?:expiry date|expires|valid until|date of expiry)\s*:\s*([^\n]+)/i,
    /(?:validity|exp)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /\b(expiry date)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i
  ]) ?? "");

  const idIssuer = extractField(lines, [
    /issued by:?\s*([a-z\s.,&()]+)/i,
    /authority:?\s*([a-z\s.,&()]+)/i,
    /republic of\s*([a-z\s]+)/i,
    /\b(ghana|united states|united kingdom|nigeria|south africa|canada|australia|germany|france|india|china|japan|brazil|mexico)\b/i,
    /\b(ministry of interior|national identification authority|department of state|home office|immigration service)\b/i
  ]);

  const placeOfIssue = extractField(lines, [
    /issued at:?\s*([a-z\s.,]+)/i,
    /place of issue:?\s*([a-z\s.,]+)/i,
    /\b(accra|kumasi|takoradi|tema|london|paris|new york|abuja|pretoria|berlin|tokyo|delhi|sydney|toronto|mexico city)\b/i
  ]);

  const idType = extractField(lines, [
    /(passport|driver's license|ghana card|identity card|national id card|residence permit|voter id|alien card|travel document|state id|consular id)/i,
    new RegExp(`\\b(?:${ID_KEYWORDS.join("|")})\\b`, 'i') // Use word boundaries
  ]);

  const idGender = extractField(lines, [
    /\b(MALE|FEMALE)\b/i,
    /gender:?\s*([M|F])/i,
    /\b(M|F)\b(?!\w)/ // Ensure M/F are standalone
  ]);

  const idNationality = extractField(lines, [
    /nationality:?\s*([A-Z\s]+)/i,
    /citizen of\s*([A-Z\s]+)/i,
    /\b(ghanaian|american|british|nigerian|south african|canadian|australian|german|french|indian|chinese|japanese|brazilian|mexican)\b/i,
    /\b(ghana|nigeria|kenya|egypt|usa|uk|canada|australia|germany|france|india|china|japan|brazil|mexico)\b/i
  ]);

  // Comprehensive validation and warning system
  if (!idName || idName.split(' ').filter(n => n.length > 1).length < 2) warnings.push("Name not found or unclear (requires at least two words).");
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found or unclear.");
  if (!idDOB) warnings.push("Date of Birth not found or unclear.");
  if (!idType) warnings.push("ID Type not identified.");
  if (!idGender) warnings.push("Gender not found or unclear.");

  // Cross-field validation for dates
  if (idDOB && idIssueDate) {
    try {
      const dobDate = new Date(idDOB);
      const issueDate = new Date(idIssueDate);
      if (isNaN(dobDate.getTime()) || isNaN(issueDate.getTime()) || dobDate >= issueDate) {
        warnings.push("Issue date is before or same as DOB. Possible error or invalid date format.");
      }
    } catch (e) {
      warnings.push("Error parsing DOB or Issue Date.");
    }
  }
  if (idIssueDate && idExpiryDate) {
    try {
      const issueDate = new Date(idIssueDate);
      const expiryDate = new Date(idExpiryDate);
      if (isNaN(issueDate.getTime()) || isNaN(expiryDate.getTime()) || issueDate >= expiryDate) {
        warnings.push("Expiry date is before or same as issue date. Possible error or invalid date format.");
      }
    } catch (e) {
      warnings.push("Error parsing Issue Date or Expiry Date.");
    }
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

const compareFaces = async (selfieUrl: string, idUrl: string) => {
  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl,
    return_result: "1", // Return the result directly in the response
    return_landmark: "0",
    return_attributes: "gender,age,smiling,headpose" // Can be useful for additional checks
  });

  try {
    const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60000,
    });

    const { confidence, faces1, faces2, error_message } = res.data;

    if (error_message) {
      throw new Error(`Face++ API error: ${error_message}`);
    }

    if (typeof confidence === 'undefined' || confidence === null) {
      throw new Error("Face++ confidence not returned.");
    }

    if (!faces1?.length) {
      throw new Error("No face detected in selfie image by Face++ API.");
    }
    if (!faces2?.length) {
      throw new Error("No face detected in ID image by Face++ API.");
    }
    return { confidence };
  } catch (err: any) {
    console.error("Face comparison API error:", err.response?.data || err.message);
    throw new Error(`Face comparison failed: ${err.response?.data?.error_message || err.message}`);
  }
};

// === Main POST Handler ===
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`🔍 [${requestId}] Verification started`);

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;
    const email = formData.get("email")?.toString();
    const shouldRegister = formData.get("register") === "true";

    if (!selfie || !id) {
      return NextResponse.json({ error: "Both selfie and ID image are required" }, { status: 400 });
    }

    // Process images and perform OCR
    // Use Promise.allSettled to allow independent processing and better error handling
    const [selfieProcessResult, idProcessResult] = await Promise.allSettled([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    if (selfieProcessResult.status === "rejected") {
      throw new Error(`Selfie image processing failed: ${selfieProcessResult.reason.message}`);
    }
    if (idProcessResult.status === "rejected") {
      throw new Error(`ID image processing failed: ${idProcessResult.reason.message}`);
    }

    const selfieBuffer = selfieProcessResult.value;
    const idBuffer = idProcessResult.value;

    const [selfieUploadResult, idUploadResult] = await Promise.allSettled([
      uploadToCloudinaryWithRetry(selfieBuffer, selfie.type),
      uploadToCloudinaryWithRetry(idBuffer, id.type),
    ]);

    if (selfieUploadResult.status === "rejected") {
      throw new Error(`Selfie upload failed: ${selfieUploadResult.reason.message}`);
    }
    if (idUploadResult.status === "rejected") {
      throw new Error(`ID upload failed: ${idUploadResult.reason.message}`);
    }

    const selfieUpload = selfieUploadResult.value;
    const idUpload = idUploadResult.value;

    const ocrTextResult = await Promise.allSettled([performOCRWithRetry(idBuffer)]);

    if (ocrTextResult[0].status === "rejected") {
      throw new Error(`OCR failed: ${ocrTextResult[0].reason.message}`);
    }
    const ocrText = ocrTextResult[0].value;

    console.log(`📝 [${requestId}] Raw OCR Text:\n${ocrText}`);
    const extracted = extractIDInfo(ocrText);

    // Validate extracted fields more strictly for 90% accuracy
    const foundFieldsCount = [
      extracted.idName,
      extracted.idNumber || extracted.personalIdNumber,
      extracted.idDOB,
      extracted.idIssueDate,
      extracted.idExpiryDate,
      extracted.idType,
      extracted.idGender,
      extracted.idNationality,
    ].filter(Boolean).length;

    // A more nuanced check for "enough key fields"
    // For 90% accuracy, we need a high degree of confidence in *critical* fields.
    const criticalFieldsPresent = (extracted.idName && (extracted.idNumber || extracted.personalIdNumber) && extracted.idDOB);
    const overallCompleteness = (foundFieldsCount / Object.keys(extracted).length) * 100; // Rough percentage of fields found

    if (!criticalFieldsPresent || extracted.extractionWarnings.length > 2 || overallCompleteness < 70) {
      return NextResponse.json({
        error: `Insufficient or inaccurate data extracted from ID. Found ${foundFieldsCount} fields. Warnings: ${extracted.extractionWarnings.join('; ')}. Please ensure the image is clear and well-lit.`
      }, { status: 400 });
    }

    // Face comparison
    const faceComparisonResult = await Promise.allSettled([
      compareFaces(selfieUpload.secure_url, idUpload.secure_url)
    ]);

    if (faceComparisonResult[0].status === "rejected") {
      throw new Error(`Face comparison failed: ${faceComparisonResult[0].reason.message}`);
    }
    const { confidence } = faceComparisonResult[0].value;
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    // Prepare base response
    const verificationResponse: VerificationResult = {
      success: true,
      verification: {
        faceMatch,
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD
      },
      document: {
        ...extracted,
        type: extracted.idType || "Unknown ID Type",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extracted.extractionWarnings.length === 0,
      }
    };

    // --- LOG VERIFICATION DETAILS HERE ---
    console.log(`✅ [${requestId}] Verification Details:`);
    console.log(`  - Success: ${verificationResponse.success}`);
    console.log(`  - Face Match: ${verificationResponse.verification.faceMatch}`);
    console.log(`  - Confidence: ${verificationResponse.verification.confidence}% (Threshold: ${verificationResponse.verification.threshold}%)`);
    console.log(`  - Document Extraction Status: ${verificationResponse.document.extractionComplete ? 'Complete' : 'Warnings Present'}`);
    if (verificationResponse.document.extractionWarnings.length > 0) {
      console.log(`    - Extraction Warnings: ${verificationResponse.document.extractionWarnings.join(', ')}`);
    }
    console.log(`  - Extracted Name: ${verificationResponse.document.idName}`);
    console.log(`  - Extracted ID Number: ${verificationResponse.document.idNumber || verificationResponse.document.personalIdNumber}`);
    console.log(`  - Extracted DOB: ${verificationResponse.document.idDOB}`);
    console.log(`  - Extracted ID Type: ${verificationResponse.document.idType}`);
    console.log(`  - Extracted Gender: ${verificationResponse.document.idGender}`);
    console.log(`  - Extracted Nationality: ${verificationResponse.document.idNationality}`);
    console.log(`  - ID Image URL: ${verificationResponse.document.imageUrl}`);
    console.log(`  - Selfie Image URL: ${verificationResponse.document.selfieUrl}`);

    // Optional registration flow
    if (shouldRegister && email) {
      try {
        const registerRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/register`, {
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
            imageUrl: idUpload.secure_url,
            selfieUrl: selfieUpload.secure_url,
            role: "PROVIDER",
            verified: true,
            rawText: extracted.rawText
          })
        });

        const registerResult = await registerRes.json();

        verificationResponse.registration = {
          success: registerRes.ok,
          userId: registerRes.ok ? registerResult.userId : undefined,
          error: registerRes.ok ? undefined : registerResult.error
        };

        if (!registerRes.ok) {
          console.error(`Registration failed:`, registerResult.error);
        }

        // Log registration details
        console.log(`Registration attempt for ${email}:`);
        console.log(`  - Success: ${verificationResponse.registration.success}`);
        if (verificationResponse.registration.userId) {
          console.log(`  - User ID: ${verificationResponse.registration.userId}`);
        }
        if (verificationResponse.registration.error) {
          console.log(`  - Error: ${verificationResponse.registration.error}`);
        }

      } catch (regError: any) {
        verificationResponse.registration = {
          success: false,
          error: `Registration API failed: ${regError.message}`
        };
        console.error(`Error during registration API call:`, regError.message);
      }
    }

    return NextResponse.json(verificationResponse);

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error.message);
    let errorMessage = "An unexpected error occurred during verification.";
    if (error.message.includes("Image too small") || error.message.includes("Image too large")) {
      errorMessage = `Image processing error: ${error.message}`;
    } else if (error.message.includes("Cloudinary upload failed")) {
      errorMessage = `Image upload failed: ${error.message}`;
    } else if (error.message.includes("OCR")) {
      errorMessage = `Document recognition failed: ${error.message}. Please ensure the ID is clearly visible and well-lit.`;
    } else if (error.message.includes("Face")) {
      errorMessage = `Face comparison failed: ${error.message}. Ensure your selfie is clear and facing forward.`;
    } else if (error.message.includes("Insufficient or inaccurate data extracted")) {
      errorMessage = error.message; // Use the specific error message
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}