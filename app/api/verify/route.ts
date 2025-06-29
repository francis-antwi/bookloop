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

// More comprehensive date formats
const DATE_FORMATS = [
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})$/, // DD/MM/YYYY
  /^(\d{4})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // YYYY/MM/DD
  /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2})$/, // DD/MM/YY
  /^(\d{1,2})\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i, // Day Month YYYY (e.g., 1 Jan 2000, 01 January 2000)
  /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s*(\d{4})$/i, // Month Day, YYYY (e.g., Jan 1, 2000)
];

// === Utilities ===
const cleanText = (text: string): string =>
  text.replace(/[^\x00-\x7F\r\n]/g, " ") // Remove non-ASCII characters
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 3);

const normalizeDate = (input: string): string | null => {
  const monthMap: { [key: string]: string } = {
    "jan": "01", "feb": "02", "mar": "03", "apr": "04", "may": "05", "jun": "06",
    "jul": "07", "aug": "08", "sep": "09", "oct": "10", "nov": "11", "dec": "12"
  };

  for (const format of DATE_FORMATS) {
    const match = input.match(format);
    if (match) {
      if (match.length === 4) { // DD/MM/YYYY, YYYY/MM/DD, DD/MM/YY
        const [_, a, b, c] = match;
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`; // YYYY-MM-DD
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`; // YYYY-MM-DD
        // Assume DD/MM/YY for 2-digit year. Heuristic: if year is > current year % 100, assume 19XX, else 20XX
        const currentYearPrefix = new Date().getFullYear().toString().substring(0, 2);
        const fullYear = parseInt(c, 10) > (new Date().getFullYear() % 100) ? `19${c}` : `20${c}`;
        return `${fullYear}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
      } else if (match.length === 3) { // Month Day, YYYY or Day Month YYYY
        const [_, m_or_d, d_or_y, y_optional] = match;
        let day, month, year;

        if (m_or_d.match(/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i)) { // Month Day, YYYY format
          month = monthMap[m_or_d.toLowerCase().substring(0, 3)];
          day = d_or_y;
          year = y_optional;
        } else { // Day Month YYYY format
          day = m_or_d;
          month = monthMap[d_or_y.toLowerCase().substring(0, 3)];
          year = y_optional;
        }
        if (day && month && year) {
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }
      }
    }
  }
  return null;
};

const extractField = (lines: string[], patterns: RegExp[]): string | null => {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        // Return the first captured group, or the full match if no groups
        return (match[1]?.trim() || match[0]?.trim() || null);
      }
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
    .rotate() // Auto-rotate based on EXIF
    .resize({ width: 1200, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }) // Downscale if too large, high quality resize
    .greyscale()
    .normalize() // Enhance contrast
    .linear(1.1, -10) // Further contrast adjustment (slope, intercept)
    .sharpen({ sigma: 1.2, flat: 1, jagged: 1 }) // Sharpening for text clarity
    .modulate({ brightness: 1.05 }) // Slightly increase brightness
    .jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: '4:4:4' }) // High quality JPEG output
    .toBuffer();
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  for (let i = 0; i < 2; i++) { // Two attempts
    try {
      const res = await cloudinary.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 40000, // 40 seconds
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      });
      if (res.secure_url) return res;
    } catch (err: any) {
      console.warn(`Cloudinary upload attempt ${i + 1} failed: ${err.message}`);
      if (i === 1) throw new Error(`Cloudinary upload failed after multiple attempts: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error("Cloudinary upload failed after retries."); // Should not be reached
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "5", // Latest OCR engine
    isTable: "true", // Useful if data is in a table-like format
    detectOrientation: "true", // Automatically detect and correct image orientation
    scale: "true", // Improve recognition on scaled images
  });

  const res = await axios.post("https://api.ocr.space/parse/image", params, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "apikey": process.env.OCR_SPACE_API_KEY! // Redundant, but sometimes APIs prefer it in headers too
    },
    timeout: OCR_TIMEOUT_MS,
  });

  const result = res.data;
  if (result.IsErroredOnProcessing) {
    throw new Error(`OCR Error: ${result.ErrorMessage || "Unknown OCR processing error"}`);
  }

  const text = result.ParsedResults?.[0]?.ParsedText;
  if (!text || text.length < 20) { // Arbitrary minimum text length
    throw new Error("OCR returned insufficient or no text");
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
      await new Promise(res => setTimeout(res, 1000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error(`OCR failed after multiple retries: ${lastErr.message || "Unknown error"}`);
};

const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joinedText = lines.join(" ");
  const warnings: string[] = [];

  let idName: string | null = null;
  // Prioritize lines with explicit name labels, allowing for various characters in names
  idName = extractField(lines, [
      /(?:name|full name|surname|given names|first name|last name):?\s*([A-Z][a-z.'`’\-\s]+)/i,
      // Attempt to capture common name structures if no label found on the line
      /^([A-Z][a-z.'`’\-\s]+(?:\s+[A-Z][a-z.'`’\-\s]+){1,5})$/, // Matches a line that is entirely a name (1 to 6 parts)
      /\b([A-Z][a-z.'`’\-\s]+\s+[A-Z][a-z.'`’\-\s]+(?:\s+[A-Z][a-z.'`’\-\s]+)?)\b/ // At least two words, up to three (e.g., First Last, First Middle Last)
  ]);
  // Fallback to finding common name patterns in the entire text if not found with label
  if (!idName) {
      idName = extractField([joinedText], [/([A-Z][a-z.'`’\-\s]+(?:\s+[A-Z][a-z.'`’\-\s]+){1,3})/]);
  }

  const idNumber = extractField(lines, [
      /(?:id number|card number|no\.?|document no\.?|passport no\.?):?\s*([A-Z0-9]{6,})/i,
      /\b[A-Z]{2,3}\d{6,15}\b/, // e.g., GH1234567, AB000000000
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // e.g., 1234 5678 9012 3456 (common for some card-like IDs)
      /\b[A-Z0-9]{9,20}\b/ // More generic, could be used with caution
  ]);

  const personalIdNumber = extractField(lines, [
      /personal id:?\s*([A-Z0-9]+)/i,
      /pin:?\s*([A-Z0-9]+)/i,
      /national id:?\s*([A-Z0-9]+)/i, // Common for Ghana Card
      /ghana card no\.?:\s*([A-Z0-9]+)/i
  ]);

  const idDOB = normalizeDate(extractField(lines, [
      /(?:date of birth|dob|birth date):?\s*(.+)/i, // Capture anything after "date of birth" then normalize
      /dob\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i,
      /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i
  ]) ?? "");

  const idIssueDate = normalizeDate(extractField(lines, [
      /(?:issue date|issued|date of issue):?\s*(.+)/i,
      /issued on:?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i
  ]) ?? "");

  const idExpiryDate = normalizeDate(extractField(lines, [
      /(?:expiry date|expires|valid until|date of expiry):?\s*(.+)/i,
      /(?:validity|exp):?\s*(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{2,4})/i
  ]) ?? "");

  const idIssuer = extractField(lines, [
      /issued by:? ([a-z\s.,&]+)/i,
      /authority:? ([a-z\s.,&]+)/i,
      /republic of ([a-z\s]+)/i,
      /\b(ghana|united states|united kingdom|nigeria|south africa|canada|australia)\b/i, // Common country names
      /\b(ministry of interior|national identification authority)\b/i // Common authorities
  ]);

  const placeOfIssue = extractField(lines, [
      /issued at:? ([a-z\s.,]+)/i,
      /place of issue:? ([a-z\s.,]+)/i,
      /\b(accra|kumasi|takoradi|tema|london|paris|new york|abuja|pretoria)\b/i // Common cities
  ]);

  const idType = extractField(lines, [
      /(passport|driver's license|ghana card|identity card|national id card|residence permit|voter id|alien card)/i,
      new RegExp(`(?:${ID_KEYWORDS.join("|")})`, 'i') // Use your constant keywords
  ]);

  const idGender = extractField(lines, [
      /\b(MALE|FEMALE)\b/i,
      /gender:?\s*([M|F])/i,
      /\b(M|F)\b/ // Captures standalone M or F, might need context check if ambiguous
  ]);

  const idNationality = extractField(lines, [
      /nationality:? ([A-Z\s]+)/i,
      /citizen of ([A-Z\s]+)/i,
      /\b(ghanaian|american|british|nigerian|south african|canadian|australian)\b/i, // Common nationalities
      /\b(ghana|nigeria|kenya|egypt)\b/i // Sometimes just the country name
  ]);


  // Add warnings for missing key fields
  if (!idName) warnings.push("Name not found or unclear.");
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found or unclear.");
  if (!idDOB) warnings.push("Date of Birth not found or unclear.");

  // Consistency checks (optional, but can improve accuracy)
  if (idDOB && idIssueDate && new Date(idDOB) >= new Date(idIssueDate)) {
      warnings.push("Issue date is before or same as DOB. Possible error.");
  }
  if (idIssueDate && idExpiryDate && new Date(idIssueDate) >= new Date(idExpiryDate)) {
      warnings.push("Expiry date is before or same as issue date. Possible error.");
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
    image_url2: idUrl
  });

  const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000, // 20 seconds
  });

  const { confidence, faces1, faces2 } = res.data;

  if (typeof confidence === 'undefined' || confidence === null) {
      throw new Error("Face++ confidence not returned.");
  }

  if (!faces1?.length || !faces2?.length) {
    throw new Error("Face not detected in selfie or ID image by Face++ API.");
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

    // Process images in parallel
    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id),
    ]);

    // Upload to Cloudinary in parallel
    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinaryWithRetry(selfieBuffer, selfie.type),
      uploadToCloudinaryWithRetry(idBuffer, id.type),
    ]);

    // Perform OCR on ID image
    const ocrText = await performOCRWithRetry(idBuffer);
    console.log(`📝 [${requestId}] Raw OCR Text:\n${ocrText}`); // Log raw OCR for debugging
    const extracted = extractIDInfo(ocrText);

    // Count successfully extracted required fields
    const requiredFieldsCount = [
      extracted.idName,
      extracted.idNumber || extracted.personalIdNumber, // Either ID or personal ID number is sufficient
      extracted.idDOB
    ].filter(Boolean).length; // Filter out null/undefined and count remaining

    if (requiredFieldsCount < MIN_REQUIRED_FIELDS) {
      console.warn(`⚠️ [${requestId}] Not enough required fields extracted. Count: ${requiredFieldsCount}. Warnings: ${extracted.extractionWarnings.join(', ')}`);
      return NextResponse.json({
        error: `Could not extract enough key fields from ID. Missing: ${extracted.extractionWarnings.join(', ')}`
      }, { status: 400 });
    }

    // Perform face comparison
    const { confidence } = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;
    console.log(`😊 [${requestId}] Face match confidence: ${confidence.toFixed(2)}%, Match: ${faceMatch}`);

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch,
        confidence: Math.round(confidence),
        threshold: FACE_MATCH_THRESHOLD
      },
      document: {
        ...extracted,
        type: extracted.idType || "Unknown ID Type", // Provide a default if ID type isn't found
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extracted.extractionWarnings.length === 0,
      }
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error in verification process:`, error.message);
    // Provide a more specific error message based on the error type
    let errorMessage = "An unexpected error occurred.";
    if (error.message.includes("File too small") || error.message.includes("File too large") || error.message.includes("Only JPEG/PNG")) {
        errorMessage = `Image processing error: ${error.message}`;
    } else if (error.message.includes("Cloudinary upload failed")) {
        errorMessage = `Image upload failed: ${error.message}`;
    } else if (error.message.includes("OCR failed") || error.message.includes("OCR returned insufficient text")) {
        errorMessage = `Document text recognition failed: ${error.message}. Please ensure the ID is clear and well-lit.`;
    } else if (error.message.includes("Face not detected") || error.message.includes("Face++ confidence not returned")) {
        errorMessage = `Face comparison failed: ${error.message}. Please ensure faces are clearly visible in both images.`;
    } else if (error.message.includes("Could not extract enough fields")) {
        errorMessage = error.message; // Use the specific error from within the logic
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}