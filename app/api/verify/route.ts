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
    extractionComplete: boolean; // Indicates if ALL expected fields were extracted without warnings
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
const MAX_IMAGE_SIZE = 8_000_000; // Increased to 8MB for better quality images (your app's internal limit)
const OCR_SPACE_MAX_SIZE_BYTES = 1024 * 1024; // 1024 KB = 1 MB (OCR.space limit)

// For "100% accurate" extraction:
const MIN_CRITICAL_FIELDS_FOR_BASIC_EXTRACTION = 3; // Name, ID Number/Personal ID, DOB
const MAX_OCR_WARNINGS_FOR_SUCCESS = 0; // ZERO warnings for "success"
const FACE_MATCH_THRESHOLD = 85; // Increased threshold for higher accuracy, fine-tune this!

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
  text.replace(/[^\x00-\x7F\r\n]/g, " ") // Remove non-ASCII characters
      .replace(/\s+/g, " ") // Replace multiple spaces with a single space
      .trim();

const getLines = (text: string): string[] =>
  text.split(/\r?\n/).map(cleanText).filter(line => line.length > 2); // Increased min length for lines to avoid noise

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
        const currentYear = new Date().getFullYear();
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
        // Handle DD/MM/YY (convert YY to YYYY based on current year for reasonable range)
        const yearInt = parseInt(c, 10);
        const fullYear = yearInt > (currentYear % 100) + 5 ? `19${c}` : `20${c}`; // Add 5 years buffer for future expiry
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
    throw new Error("Only JPEG/PNG images are allowed.");
  }
  if (file.size < ABSOLUTE_MIN_SIZE) {
    throw new Error("Image too small. Try a higher-quality photo.");
  }
  // The MAX_IMAGE_SIZE is your internal app limit, not OCR.space's.
  // The OCR_SPACE_MAX_SIZE_BYTES is handled within processImageForOCR.
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large. Max ${MAX_IMAGE_SIZE / 1_000_000}MB.`);
  }
};

// === Core Functions ===
const processImageForOCR = async (file: File, requestId: string): Promise<Buffer> => {
  const startTime = Date.now();
  console.log(`[${requestId}] Starting image processing for OCR for file size: ${(file.size / 1024 / 1024).toFixed(2)}MB at ${new Date().toISOString()}`);

  validateFile(file);
  const buffer = Buffer.from(await file.arrayBuffer());

  let processedBuffer = await sharp(buffer)
    .rotate() // Auto-rotate based on EXIF
    .resize({ width: 1200, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }) // Reduced width from 1500 to 1200
    .greyscale()
    .normalize()
    .linear(1.2, -20) // Increased contrast slightly
    .sharpen({ sigma: 1.5, flat: 1, jagged: 2 }) // Stronger sharpening
    .modulate({ brightness: 1.1, saturation: 1.1 }) // Slightly brighter and more saturated
    .jpeg({ quality: 85, mozjpeg: true, chromaSubsampling: '4:4:4' }) // Reduced quality to 85, ensure mozjpeg
    .toBuffer();

  // Aggressive resizing/compression loop to meet OCR.space limit
  let quality = 85;
  while (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES && quality > 10) {
    quality -= 5; // Decrease quality by 5%
    console.log(`[${requestId}] Reducing JPEG quality to ${quality}% to fit OCR.space limit. Current size: ${(processedBuffer.length / 1024).toFixed(2)} KB at ${new Date().toISOString()}`);
    processedBuffer = await sharp(processedBuffer)
      .jpeg({ quality: quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
      .toBuffer();
  }

  // If still too large, try reducing dimensions further
  if (processedBuffer.length > OCR_SPACE_MAX_SIZE_BYTES) {
    console.warn(`[${requestId}] Still too large after quality reduction. Attempting further dimension reduction. Current size: ${(processedBuffer.length / 1024).toFixed(2)} KB at ${new Date().toISOString()}`);
    processedBuffer = await sharp(buffer) // Start from original buffer
      .rotate()
      .resize({ width: 900, withoutEnlargement: true, kernel: sharp.kernel.lanczos3 }) // Even smaller width
      .greyscale()
      .normalize()
      .linear(1.2, -20)
      .sharpen({ sigma: 1.5, flat: 1, jagged: 2 })
      .modulate({ brightness: 1.1, saturation: 1.1 })
      .jpeg({ quality: 80, mozjpeg: true, chromaSubsampling: '4:4:4' }) // Start with slightly higher quality again
      .toBuffer();

    quality = 80;
    while (processedBuffer.length > OCR_SPACE_MAX_BYTES && quality > 10) {
      quality -= 5;
      console.log(`[${requestId}] Further dimension reduction, new JPEG quality to ${quality}% to fit OCR.space limit. Current size: ${(processedBuffer.length / 1024).toFixed(2)} KB at ${new Date().toISOString()}`);
      processedBuffer = await sharp(processedBuffer)
        .jpeg({ quality: quality, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toBuffer();
    }
  }

  // Final check before returning
  if (processedBuffer.length > OCR_SPACE_MAX_BYTES) {
    throw new Error(`Processed image for OCR still exceeds OCR.space 1MB limit (${(processedBuffer.length / 1024).toFixed(2)} KB) even after aggressive compression.`);
  }

  console.log(`[${requestId}] Finished image processing for OCR in ${Date.now() - startTime}ms. Final size: ${(processedBuffer.length / 1024).toFixed(2)} KB at ${new Date().toISOString()}`);
  return processedBuffer;
};

const uploadToCloudinaryWithRetry = async (buffer: Buffer, fileType: string, requestId: string) => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  for (let i = 0; i < 3; i++) { // Increased retries to 3
    const startTime = Date.now();
    console.log(`[${requestId}] Starting Cloudinary upload attempt ${i + 1} at ${new Date().toISOString()}`);
    try {
      const res = await cloudinary.uploader.upload(dataURI, {
        folder: "id_verification",
        timeout: 60000, // Increased timeout to 60 seconds
        resource_type: "image",
        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
      });
      if (res.secure_url) {
        console.log(`[${requestId}] Finished Cloudinary upload attempt ${i + 1} in ${Date.now() - startTime}ms at ${new Date().toISOString()}`);
        return res;
      }
    } catch (err: any) {
      console.warn(`[${requestId}] Cloudinary upload attempt ${i + 1} failed: ${err.message} in ${Date.now() - startTime}ms at ${new Date().toISOString()}`);
      if (i === 2) throw err;
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error("Cloudinary upload failed after retries.");
};

const performOCR = async (imageBuffer: Buffer, requestId: string): Promise<string> => {
  const startTime = Date.now();
  console.log(`[${requestId}] Starting OCR.space API call at ${new Date().toISOString()}`);

  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  const params = new URLSearchParams({
    apikey: process.env.OCR_SPACE_API_KEY!,
    base64Image,
    language: "eng",
    OCREngine: "2", // OCR Engine 2 is often better for documents
    isTable: "true", // Useful for structured documents, might help with layout
    detectOrientation: "true",
    scale: "true", // Scales image to improve OCR accuracy
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
  if (!text || text.length < 50) { // Increased minimum text length for validity to filter very poor OCR
    throw new Error("OCR returned insufficient or no text for reliable extraction.");
  }
  console.log(`[${requestId}] Finished OCR.space API call in ${Date.now() - startTime}ms at ${new Date().toISOString()}`);
  return text;
};

const performOCRWithRetry = async (buffer: Buffer, requestId: string) => {
  let lastErr: any;
  for (let i = 0; i < OCR_MAX_RETRIES; i++) {
    try {
      return await performOCR(buffer, requestId);
    } catch (e: any) {
      lastErr = e;
      console.warn(`[${requestId}] OCR attempt ${i + 1} failed: ${e.message} at ${new Date().toISOString()}`);
      await new Promise(res => setTimeout(res, 2000 * Math.pow(2, i))); // Exponential backoff
    }
  }
  throw new Error(`OCR failed after multiple retries: ${lastErr.message || "Unknown error"}`);
};

// Refined extractIDInfo for stricter extraction and more comprehensive warnings
const extractIDInfo = (text: string): IDInfo => {
  const lines = getLines(text);
  const joinedText = lines.join(" ").toLowerCase();
  const warnings: string[] = [];
  const foundFields: { [key: string]: string | null } = {}; // Track what we found for accuracy check

  // Name
  let idName: string | null = extractField(lines, [
    /(?:name|full name|surname|given names|first name|last name):\s*([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,5})/,
    /^([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,5})$/, // Matches a line that looks like a name
    /\b(mr|ms|mrs|dr)\.?\s*([A-Za-z.'`’\-\s]+(?:\s+[A-Za-z.'`’\-\s]+){1,4})\b/i, // Name with title
    /\b([A-Z][a-z.'`’\-]+\s+[A-Z][a-z.'`’\-]+(?:\s+[A-Z][a-z.'`’\-]+)?)\b/ // Capitalized words as names
  ]);
  // Fallback for names if not found in specific lines, try more generic patterns
  if (!idName) {
    idName = extractField([joinedText], [
      /name\s*([a-z.'`’\-\s]+)/i,
      /\b([a-z][a-z.'`’\-\s]+(?:\s+[a-z][a-z.'`’\-\s]+){1,3})\b/ // Generic name pattern
    ]);
  }
  // Further refinement for name to remove extraneous text
  if (idName) {
    idName = idName.replace(/(?:republic of|ghana|identification|authority|card|document)/ig, '').trim();
    // Validate that the name is reasonable (e.g., at least two meaningful words)
    if (idName.split(' ').filter(n => n.length > 1).length < 2) {
        warnings.push("Name extracted but appears incomplete or invalid (requires at least two words).");
        idName = null; // Invalidate if not robust enough for 100% accuracy
    } else {
        foundFields.idName = idName;
    }
  } else {
      warnings.push("Name not found.");
  }


  // ID Number & Personal ID Number
  let idNumber = extractField(lines, [
    /(?:id number|card number|no\.?|document no\.?|passport no\.?|document no|passport no):\s*([A-Z0-9\s]{6,})/i,
    /\b([A-Z]{2,3}\d{6,15})\b/, // e.g., GH123456789
    /\b(\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4})\b/, // e.g., 1234 5678 9012 3456 (for some card types)
    /\b([A-Z0-9]{9,20})\b/, // Generic alphanumeric ID
    /passport\s*number:\s*([A-Z0-9]+)/i,
    /licen[cs]e\s*number:\s*([A-Z0-9]+)/i,
  ]);
  let personalIdNumber = extractField(lines, [
    /personal id:?\s*([A-Z0-9]+)/i,
    /pin:?\s*([A-Z0-9]+)/i,
    /national id:?\s*([A-Z0-9]+)/i,
    /ghana card no\.?:\s*([A-Z0-9]{10,})/i, // Specific to Ghana Card format (e.g., GHA-xxxxxxxxxx)
    /unique\s*id:\s*([A-Z0-9]+)/i
  ]);

  if (idNumber) foundFields.idNumber = idNumber;
  if (personalIdNumber) foundFields.personalIdNumber = personalIdNumber;
  if (!idNumber && !personalIdNumber) warnings.push("ID number not found.");


  // Date of Birth (DOB)
  let idDOB = normalizeDate(extractField(lines, [
    /(?:date of birth|dob|birth date|birth):\s*([^\n]+)/i, // Catch all common DOB phrases
    /(?:dob|birth|date)\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i, // Numeric variations
    /\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i, // Day Month YYYY text
    /\b(date of birth)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i // Generic phrase match
  ]) ?? "");
  if (idDOB) {
      if (isNaN(new Date(idDOB).getTime())) {
          warnings.push("Date of Birth extracted but invalid format or parsing failed.");
          idDOB = null; // Invalidate
      } else {
          foundFields.idDOB = idDOB;
      }
  } else {
      warnings.push("Date of Birth not found.");
  }


  // Issue Date
  let idIssueDate = normalizeDate(extractField(lines, [
    /(?:issue date|issued|date of issue|date of first issue|date of first registration)\s*:\s*([^\n]+)/i,
    /issued\s*on:?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /\b(issue date)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i
  ]) ?? "");
  if (idIssueDate) {
      if (isNaN(new Date(idIssueDate).getTime())) {
          warnings.push("Issue Date extracted but invalid format or parsing failed.");
          idIssueDate = null; // Invalidate
      } else {
          foundFields.idIssueDate = idIssueDate;
      }
  } else {
      warnings.push("Issue Date not found.");
  }


  // Expiry Date
  let idExpiryDate = normalizeDate(extractField(lines, [
    /(?:expiry date|expires|valid until|date of expiry|valid thru)\s*:\s*([^\n]+)/i,
    /(?:validity|exp)\s*:\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
    /\b(expiry date)\b\s*([0-9\/\-\.\sA-Za-z]+)\b/i
  ]) ?? "");
  if (idExpiryDate) {
      if (isNaN(new Date(idExpiryDate).getTime())) {
          warnings.push("Expiry Date extracted but invalid format or parsing failed.");
          idExpiryDate = null; // Invalidate
      } else {
          foundFields.idExpiryDate = idExpiryDate;
      }
  } else {
      warnings.push("Expiry Date not found.");
  }

  // ID Type
  const idType = extractField(lines, [
    /(passport|driver's license|ghana card|identity card|national id card|residence permit|voter id|alien card|travel document|state id|consular id)/i,
    new RegExp(`\\b(?:${ID_KEYWORDS.join("|")})\\b`, 'i') // General keywords
  ]);
  if (idType) foundFields.idType = idType; else warnings.push("ID Type not identified.");


  // Gender
  const idGender = extractField(lines, [
    /\b(MALE|FEMALE)\b/i,
    /gender:?\s*([M|F])/i,
    /\b(M|F)\b(?!\w)/ // Ensure M/F are standalone words
  ]);
  if (idGender) foundFields.idGender = idGender; else warnings.push("Gender not found.");

  // Nationality
  const idNationality = extractField(lines, [
    /nationality:?\s*([A-Z\s]+)/i,
    /citizen of\s*([A-Z\s]+)/i,
    /\b(ghanaian|american|british|nigerian|south african|canadian|australian|german|french|indian|chinese|japanese|brazilian|mexican)\b/i, // Common nationalities
    /\b(ghana|nigeria|kenya|egypt|usa|uk|canada|australia|germany|france|india|china|japan|brazil|mexico)\b/i // Countries
  ]);
  if (idNationality) foundFields.idNationality = idNationality; else warnings.push("Nationality not found.");


  // Issuer (can be derived from nationality or specific terms)
  const idIssuer = extractField(lines, [
    /issued by:?\s*([a-z\s.,&()]+)/i,
    /authority:?\s*([a-z\s.,&()]+)/i,
    /republic of\s*([a-z\s]+)/i,
    /\b(ministry of interior|national identification authority|department of state|home office|immigration service|passport office)\b/i
  ]);
  if (idIssuer) foundFields.idIssuer = idIssuer; else warnings.push("Issuer not found.");

  // Place of Issue
  const placeOfIssue = extractField(lines, [
    /issued at:?\s*([a-z\s.,]+)/i,
    /place of issue:?\s*([a-z\s.,]+)/i,
    /\b(accra|kumasi|takoradi|tema|london|paris|new york|abuja|pretoria|berlin|tokyo|delhi|sydney|toronto|mexico city)\b/i // Common cities
  ]);
  if (placeOfIssue) foundFields.placeOfIssue = placeOfIssue; else warnings.push("Place of Issue not found.");


  // Cross-field validation for dates - stricter for 100% accuracy
  const currentYear = new Date().getFullYear();
  if (idDOB) {
      const dobDate = new Date(idDOB);
      // DOB cannot be in the last 5 years for an adult ID (adjust as needed for specific ID types/age requirements)
      if (dobDate.getFullYear() > currentYear - 5 || dobDate.getFullYear() < currentYear - 120) {
          warnings.push("DOB appears to be too recent or implausible (e.g., too old). Check format/value.");
          idDOB = null; // Invalidate for 100% accuracy if suspicious
      }
  }

  if (idIssueDate) {
      const issueDate = new Date(idIssueDate);
      // Issue date cannot be in the future
      if (issueDate.getTime() > Date.now() + (24 * 60 * 60 * 1000)) { // 1 day tolerance
          warnings.push("Issue date appears to be in the future. Check format/value.");
          idIssueDate = null; // Invalidate
      }
  }

  if (idExpiryDate) {
      const expiryDate = new Date(idExpiryDate);
      // Expiry date cannot be in the past (1 year grace for old IDs is removed for 100% accuracy)
      if (expiryDate.getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)) { // 30 day past tolerance
          warnings.push("Expiry date is in the past. ID might be expired.");
          // For 100% success, this would contribute to failure unless overridden by business logic.
      }
  }


  if (idDOB && idIssueDate) {
    try {
      const dobDate = new Date(idDOB);
      const issueDate = new Date(idIssueDate);
      if (isNaN(dobDate.getTime()) || isNaN(issueDate.getTime()) || dobDate >= issueDate) {
        warnings.push("Issue date is before or same as DOB. Possible error or invalid date logic.");
      }
    } catch (e) { /* already handled by normalizeDate failing */ }
  }
  if (idIssueDate && idExpiryDate) {
    try {
      const issueDate = new Date(idIssueDate);
      const expiryDate = new Date(idExpiryDate);
      if (isNaN(issueDate.getTime()) || isNaN(expiryDate.getTime()) || issueDate >= expiryDate) {
        warnings.push("Expiry date is before or same as issue date. Possible error or invalid date logic.");
      }
    } catch (e) { /* already handled by normalizeDate failing */ }
  }

  // Count actually found *critical* fields (name, id number, dob) based on their `foundFields` presence
  const criticalFieldsFoundCount = [
    foundFields.idName,
    foundFields.idNumber || foundFields.personalIdNumber,
    foundFields.idDOB
  ].filter(Boolean).length;

  // Add a warning if critical fields are insufficient for basic extraction
  if (criticalFieldsFoundCount < MIN_CRITICAL_FIELDS_FOR_BASIC_EXTRACTION) {
      warnings.push("Insufficient critical ID fields extracted for basic verification (Name, ID Number, DOB required).");
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
  const startTime = Date.now();
  console.log(`[${requestId}] Starting Face++ API call at ${new Date().toISOString()}`);

  const params = new URLSearchParams({
    api_key: process.env.FACEPP_API_KEY!,
    api_secret: process.env.FACEPP_API_SECRET!,
    image_url1: selfieUrl,
    image_url2: idUrl,
    return_result: "1", // Return the result directly in the response
    return_landmark: "0",
    return_attributes: "gender,age,smiling,headpose" // Can be useful for additional checks but adds latency
  });

  try {
    const res = await axios.post("https://api-us.faceplusplus.com/facepp/v3/compare", params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 60000, // 60-second timeout
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
    console.log(`[${requestId}] Finished Face++ API call in ${Date.now() - startTime}ms at ${new Date().toISOString()}`);
    return { confidence };
  } catch (err: any) {
    console.error(`[${requestId}] Face comparison API error:`, err.response?.data || err.message);
    throw new Error(`Face comparison failed: ${err.response?.data?.error_message || err.message}`);
  }
};

// === Main POST Handler ===
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`🔍 [${requestId}] Verification started at ${new Date().toISOString()}`);
  const functionStartTime = Date.now();

  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;
    const email = formData.get("email")?.toString();
    const shouldRegister = formData.get("register") === "true";

    // --- 1. Initial Validation ---
    if (!selfie || !id) {
      console.log(`[${requestId}] Error: Both selfie and ID image are required.`);
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    // --- 2. Image Processing & Uploads (Parallel) ---
    const [selfieProcessResult, idProcessResult] = await Promise.allSettled([
      processImageForOCR(selfie, requestId),
      processImageForOCR(id, requestId),
    ]);

    if (selfieProcessResult.status === "rejected") {
      console.error(`[${requestId}] Error: Selfie image processing failed: ${selfieProcessResult.reason.message}`);
      return NextResponse.json({ error: `Selfie image processing failed: ${selfieProcessResult.reason.message}` }, { status: 400 });
    }
    if (idProcessResult.status === "rejected") {
      console.error(`[${requestId}] Error: ID image processing failed: ${idProcessResult.reason.message}`);
      return NextResponse.json({ error: `ID image processing failed: ${idProcessResult.reason.message}` }, { status: 400 });
    }

    const selfieBuffer = selfieProcessResult.value;
    const idBuffer = idProcessResult.value;

    // Upload to Cloudinary concurrently
    const [selfieUploadResult, idUploadResult] = await Promise.allSettled([
      uploadToCloudinaryWithRetry(selfieBuffer, selfie.type, requestId),
      uploadToCloudinaryWithRetry(idBuffer, id.type, requestId),
    ]);

    if (selfieUploadResult.status === "rejected") {
      console.error(`[${requestId}] Error: Selfie image upload failed: ${selfieUploadResult.reason.message}`);
      return NextResponse.json({ error: `Selfie image upload failed: ${selfieUploadResult.reason.message}` }, { status: 500 });
    }
    if (idUploadResult.status === "rejected") {
      console.error(`[${requestId}] Error: ID image upload failed: ${idUploadResult.reason.message}`);
      return NextResponse.json({ error: `ID image upload failed: ${idUploadResult.reason.message}` }, { status: 500 });
    }

    const selfieUpload = selfieUploadResult.value;
    const idUpload = idUploadResult.value;

    // --- 3. Perform OCR ---
    const ocrTextResult = await Promise.allSettled([performOCRWithRetry(idBuffer, requestId)]);

    if (ocrTextResult[0].status === "rejected") {
      // If OCR completely fails, this is a hard error as we can't extract any data.
      console.error(`[${requestId}] Error: Document recognition failed: ${ocrTextResult[0].reason.message}`);
      return NextResponse.json({ error: `Document recognition failed: ${ocrTextResult[0].reason.message}. Please ensure the ID is clearly visible and well-lit.` }, { status: 422 }); // 422 Unprocessable Entity
    }
    const ocrText = ocrTextResult[0].value;

    console.log(`📝 [${requestId}] Raw OCR Text:\n${ocrText}`);
    const extracted = extractIDInfo(ocrText); // Extract data and gather warnings

    // --- 4. Face Comparison ---
    const faceComparisonResult = await Promise.allSettled([
      compareFaces(selfieUpload.secure_url, idUpload.secure_url, requestId)
    ]);

    let faceMatch = false;
    let confidence = 0;
    let faceComparisonError: string | undefined;

    if (faceComparisonResult[0].status === "rejected") {
      faceComparisonError = `Face comparison failed: ${faceComparisonResult[0].reason.message}`;
      console.error(`❌ [${requestId}] ${faceComparisonError}`);
      // This error will be added to warnings and make overall success false
    } else {
      confidence = faceComparisonResult[0].value.confidence;
      faceMatch = confidence >= FACE_MATCH_THRESHOLD;
      if (!faceMatch) {
          faceComparisonError = `Face match confidence (${confidence.toFixed(2)}%) is below threshold (${FACE_MATCH_THRESHOLD}%).`;
      }
    }

    // --- 5. Determine Overall "100% Accurate" Success ---
    // For "100% accurate" success, all conditions must be met:
    // 1. Face match is true and above the set threshold.
    // 2. There are ZERO extraction warnings from OCR.
    // 3. No direct face comparison API error occurred (though a low confidence match is now a 'warning').
    const overallVerificationSuccess = faceMatch && (extracted.extractionWarnings.length <= MAX_OCR_WARNINGS_FOR_SUCCESS) && !faceComparisonError;

    // Prepare the final response object
    const verificationResponse: VerificationResult = {
      success: overallVerificationSuccess, // Reflects the strict "100% accurate" criteria
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
        // extractionComplete is true only if there are absolutely no warnings from OCR
        extractionComplete: extracted.extractionWarnings.length === 0,
      }
    };

    // If face comparison had an issue (even just low confidence), ensure it's reflected in the document warnings
    if (faceComparisonError) {
        // Only add if not already implicitly added by low confidence
        if (!verificationResponse.document.extractionWarnings.includes(faceComparisonError)) {
             verificationResponse.document.extractionWarnings.push(faceComparisonError);
        }
    }

    // --- 6. Log Verification Details (for debugging and monitoring) ---
    console.log(`✅ [${requestId}] Verification Details:`);
    console.log(`  - Overall Success (100% Accurate?): ${verificationResponse.success}`);
    console.log(`  - Face Match: ${verificationResponse.verification.faceMatch} (Confidence: ${verificationResponse.verification.confidence}%)`);
    console.log(`  - Document Data Extracted Completely (No OCR Warnings): ${verificationResponse.document.extractionComplete}`);
    console.log(`  - Extracted Fields Status:`);
    console.log(`    - Name: ${verificationResponse.document.idName || 'NOT FOUND'}`);
    console.log(`    - ID Number: ${verificationResponse.document.idNumber || verificationResponse.document.personalIdNumber || 'NOT FOUND'}`);
    console.log(`    - DOB: ${verificationResponse.document.idDOB || 'NOT FOUND'}`);
    console.log(`    - Issue Date: ${verificationResponse.document.idIssueDate || 'NOT FOUND'}`);
    console.log(`    - Expiry Date: ${verificationResponse.document.idExpiryDate || 'NOT FOUND'}`);
    console.log(`    - ID Type: ${verificationResponse.document.idType || 'NOT FOUND'}`);
    console.log(`    - Gender: ${verificationResponse.document.idGender || 'NOT FOUND'}`);
    console.log(`    - Nationality: ${verificationResponse.document.idNationality || 'NOT FOUND'}`);
    if (verificationResponse.document.extractionWarnings.length > 0) {
      console.log(`    - Extraction Warnings (${verificationResponse.document.extractionWarnings.length}):`);
      verificationResponse.document.extractionWarnings.forEach((warn, i) => console.log(`      ${i + 1}. ${warn}`));
    }
    console.log(`  - ID Image URL: ${verificationResponse.document.imageUrl}`);
    console.log(`  - Selfie Image URL: ${verificationResponse.document.selfieUrl}`);


    // --- 7. Optional Registration Flow (only if 100% accurate) ---
    if (shouldRegister && email) {
      if (overallVerificationSuccess) { // Only proceed with registration if verification is truly successful
        const regStartTime = Date.now();
        console.log(`[${requestId}] Starting registration API call at ${new Date().toISOString()}`);
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
              verified: true, // This should only be true if overallVerificationSuccess is true
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
            console.error(`[${requestId}] Registration failed:`, registerResult.error);
          }

          console.log(`[${requestId}] Registration attempt for ${email}: Success: ${verificationResponse.registration.success}, User ID: ${verificationResponse.registration.userId || 'N/A'}, Error: ${verificationResponse.registration.error || 'N/A'} in ${Date.now() - regStartTime}ms at ${new Date().toISOString()}`);

        } catch (regError: any) {
          verificationResponse.registration = {
            success: false,
            error: `Registration API failed: ${regError.message}`
          };
          console.error(`[${requestId}] Error during registration API call:`, regError.message);
        }
      } else {
        // Registration skipped because verification was not 100% successful.
        verificationResponse.registration = {
          success: false,
          error: "Registration skipped because verification did not meet 100% accuracy criteria (e.g., incomplete ID data or face mismatch)."
        };
        console.log(`[${requestId}] Registration skipped for ${email} because verification was not 100% successful.`);
      }
    }
    console.log(`✅ [${requestId}] Total verification function execution time: ${Date.now() - functionStartTime}ms at ${new Date().toISOString()}`);
    return NextResponse.json(verificationResponse);

  } catch (error: any) {
    console.error(`❌ [${requestId}] Critical Error in Verification Process:`, error.message);
    let errorMessage = "An unexpected error occurred during verification.";

    // Provide more specific error messages to the client
    if (error.message.includes("Image too small") || error.message.includes("Image too large")) {
      errorMessage = `Image processing error: ${error.message}`;
    } else if (error.message.includes("Cloudinary upload failed")) {
      errorMessage = `Image upload failed: ${error.message}`;
    } else if (error.message.includes("Processed image for OCR still exceeds")) {
      errorMessage = `Image optimization failed: ${error.message} Please try a different image or reduce its quality before upload.`;
    } else if (error.message.includes("OCR Error:") || error.message.includes("OCR returned insufficient")) {
      errorMessage = `Document recognition failed: ${error.message}. Please ensure the ID is clearly visible and well-lit, with no glare or obstructions.`;
    } else if (error.message.includes("Face comparison failed:") || error.message.includes("No face detected")) {
      errorMessage = `Face comparison failed: ${error.message}. Ensure your selfie is clear, well-lit, and facing forward.`;
    } else if (error.message.includes("Both selfie and ID image are required")) {
        errorMessage = error.message; // Use the specific message from early validation
    }
    // For any other unexpected errors, return a generic message
    console.log(`❌ [${requestId}] Returning error response: ${errorMessage}`);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}