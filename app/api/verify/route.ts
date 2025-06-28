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

// Types
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

// Constants
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const MIN_IMAGE_SIZE = 50000; // 50KB
const MAX_IMAGE_SIZE = 5000000; // 5MB
const MIN_REQUIRED_FIELDS = 1; // At least one of name, ID number, or DOB must be present

// Helpers
const cleanText = (text: string): string => {
  const cleaned = text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();
  
  console.log(`🧹 Text cleaning:\nOriginal: ${text.substring(0, 50)}...\nCleaned: ${cleaned.substring(0, 50)}...`);
  return cleaned;
};

const getLines = (text: string): string[] => {
  const lines = text
    .split(/\r?\n/)
    .map(line => cleanText(line))
    .filter(line => line.length > 0);
  
  console.log(`📜 Extracted ${lines.length} lines from text`);
  return lines;
};

const extractName = (lines: string[]): string | null => {
  const namePatterns = [
    /name[:\s]([a-zA-Z\s]{3,})/i,
    /full name[:\s]([a-zA-Z\s]{3,})/i,
    /surname[:\s]([a-zA-Z\s]{3,})/i,
    /([A-Z][a-z]+ [A-Z][a-z]+)/ // Fallback for names without labels
  ];

  for (const line of lines) {
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        console.log(`🪪 Extracted name with pattern ${pattern}: ${name}`);
        return name;
      }
    }
  }

  console.log("🔍 No name found in any line");
  return null;
};

const extractDates = (lines: string[]): { date: string; line: string; index: number }[] => {
  const dateRegex = /\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g;
  const dates = lines
    .map((line, index) => {
      const matches = line.match(dateRegex);
      return matches ? matches.map(date => ({ date, line, index })) : null;
    })
    .filter(Boolean)
    .flat() as any[];
  
  console.log(`📅 Found ${dates.length} date candidates:`, dates);
  return dates;
};

const normalizeDate = (dateStr: string): string | null => {
  if (!dateStr) return null;
  
  console.log(`🔄 Normalizing date: ${dateStr}`);
  try {
    const cleaned = dateStr.replace(/[^\d\/\-.]/g, '');
    const parts = cleaned.split(/[\/\-\.]/).map(Number);
    
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a > 31) return `${a}-${b.toString().padStart(2, '0')}-${c.toString().padStart(2, '0')}`;
      if (c > 31) return `${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
      return `20${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
    }
  } catch (e) {
    console.error(`❌ Date normalization error for ${dateStr}:`, e);
  }
  return null;
};

const extractIDNumber = (lines: string[]): string | null => {
  const idPatterns = [
    /card\s*number[:]?\s*([A-Z0-9]{6,})/i,
    /id\s*no[:]?\s*([A-Z0-9]{6,})/i,
    /id\s*number[:]?\s*([A-Z0-9]{6,})/i,
    /(GH[A-Z0-9]{8,})/i,
    /([A-Z]{2}\d{6,})/,
    /(\d{6,})/
  ];

  for (const line of lines) {
    for (const pattern of idPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        console.log(`🔢 Extracted ID number with pattern ${pattern}: ${match[1]}`);
        return match[1];
      }
    }
  }

  console.log("🔢 No ID number found in any line");
  return null;
};

const extractIDInfo = (parsedText: string): IDInfo => {
  console.log("🛠️ Beginning ID information extraction");
  const warnings: string[] = [];
  const lines = getLines(parsedText);

  const idName = extractName(lines);
  const idNumber = extractIDNumber(lines);
  const dates = extractDates(lines);

  // Sort dates by line number to get chronological order
  dates.sort((a, b) => a.index - b.index);

  // Try to identify dates based on common patterns
  let idDOB = null, idIssueDate = null, idExpiryDate = null;
  
  // First date is likely DOB if it's the earliest in the document
  if (dates.length > 0) idDOB = normalizeDate(dates[0]?.date);
  
  // Last date is likely expiry if multiple dates exist
  if (dates.length > 1) {
    idExpiryDate = normalizeDate(dates[dates.length - 1]?.date);
    idIssueDate = normalizeDate(dates[1]?.date);
  }

  // If only one date, check if it looks like an expiry date (future date)
  if (dates.length === 1) {
    const dateStr = normalizeDate(dates[0]?.date);
    if (dateStr) {
      const dateObj = new Date(dateStr);
      if (dateObj > new Date()) {
        idExpiryDate = dateStr;
      } else {
        idDOB = dateStr;
      }
    }
  }

  // Check for issuer information
  let idIssuer = null;
  const issuerPatterns = [/issued by (.+)/i, /authority (.+)/i, /department (.+)/i];
  for (const line of lines) {
    for (const pattern of issuerPatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        idIssuer = match[1].trim();
        break;
      }
    }
    if (idIssuer) break;
  }

  // Check for place of issue
  let placeOfIssue = null;
  const placePatterns = [/place of issue (.+)/i, /issued at (.+)/i, /location (.+)/i];
  for (const line of lines) {
    for (const pattern of placePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        placeOfIssue = match[1].trim();
        break;
      }
    }
    if (placeOfIssue) break;
  }

  // Generate warnings for missing fields
  if (!idName) warnings.push("Name not found");
  if (!idNumber) warnings.push("ID number not found");
  if (!idDOB) warnings.push("Date of birth not found");
  if (!idIssuer) warnings.push("Issuer information not found");
  if (!placeOfIssue) warnings.push("Place of issue not found");

  console.log("📋 Extracted Fields Summary:");
  console.log("┌─────────────────┬─────────────────────────────┐");
  console.log(`│ Name            │ ${idName?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ ID Number       │ ${idNumber?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ DOB             │ ${idDOB?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Issue Date      │ ${idIssueDate?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Expiry Date     │ ${idExpiryDate?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Issuer          │ ${idIssuer?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Place of Issue  │ ${placeOfIssue?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log("└─────────────────┴─────────────────────────────┘");

  return {
    idName,
    idNumber,
    personalIdNumber: null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer,
    placeOfIssue,
    rawText: parsedText,
    extractionWarnings: warnings
  };
};

// ... (keep all other helper functions the same as previous implementation)

// Update the POST handler to allow partial extraction
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  console.log(`🚀 [${requestId}] Starting ID verification process`);
  
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      console.error(`❌ [${requestId}] Missing selfie or ID image.`);
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    console.log(`📸 [${requestId}] Received files:`, {
      selfie: { name: selfie.name, type: selfie.type, size: selfie.size },
      id: { name: id.name, type: id.type, size: id.size }
    });

    if (!selfie.type.startsWith("image/") || !id.type.startsWith("image/")) {
      console.error(`❌ [${requestId}] Invalid file types:`, { 
        selfieType: selfie.type, 
        idType: id.type 
      });
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageForOCR(selfie),
      processImageForOCR(id)
    ]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfieBuffer, selfie.type),
      uploadToCloudinary(idBuffer, id.type)
    ]);

    const parsedText = await performOCRWithRetry(idBuffer);

    const idKeywords = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
    const keywordMatches = idKeywords.filter(keyword => parsedText.toLowerCase().includes(keyword));
    
    console.log(`🔑 [${requestId}] ID keyword matches:`, keywordMatches);
    if (keywordMatches.length === 0) {
      console.warn(`⚠️ [${requestId}] OCR output does not match any known ID keywords. Full text:`, parsedText.substring(0, 200) + "...");
      // Continue anyway since we want to attempt extraction regardless
    }

    const extractedInfo = extractIDInfo(parsedText);

    // Check if we have at least the minimum required fields
    const extractedFields = [
      extractedInfo.idName,
      extractedInfo.idNumber,
      extractedInfo.idDOB
    ].filter(Boolean).length;

    if (extractedFields < MIN_REQUIRED_FIELDS) {
      console.error(`❌ [${requestId}] Insufficient fields extracted:`, {
        name: extractedInfo.idName,
        idNumber: extractedInfo.idNumber,
        dob: extractedInfo.idDOB
      });
      return NextResponse.json(
        { error: "Could not extract enough information from the ID document." }, 
        { status: 400 }
      );
    }

    // Validate date of birth if present
    if (extractedInfo.idDOB) {
      try {
        const dob = new Date(extractedInfo.idDOB);
        const age = new Date().getFullYear() - dob.getFullYear();
        console.log(`👶 [${requestId}] Age calculated from DOB:`, age);
        
        if (age < 15 || age > 100) {
          console.warn(`⚠️ [${requestId}] Extracted DOB seems invalid:`, {
            extracted: extractedInfo.idDOB,
            age
          });
          extractedInfo.extractionWarnings.push("Date of birth appears invalid");
        }
      } catch (dateError) {
        console.error(`❌ [${requestId}] Date normalization failed:`, dateError);
        extractedInfo.extractionWarnings.push("Date of birth format is invalid");
      }
    }

    // Perform face comparison
    let faceComparison;
    try {
      faceComparison = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    } catch (faceError) {
      console.error(`❌ [${requestId}] Face comparison failed:`, faceError);
      extractedInfo.extractionWarnings.push("Face comparison could not be completed");
      faceComparison = { confidence: 0 };
    }

    const threshold = 80;
    const confidence = parseFloat(faceComparison.confidence.toFixed(2));
    const faceMatch = confidence >= threshold;

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 [${requestId}] Verification completed in ${processingTime}s!`, {
      faceMatch,
      confidence,
      threshold,
      warnings: extractedInfo.extractionWarnings
    });

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch,
        confidence,
        threshold
      },
      document: {
        type: "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extractedInfo.extractionWarnings.length === 0,
        ...extractedInfo
      }
    });

  } catch (error: unknown) {
    const processingTime = (Date.now() - startTime) / 1000;
    const errorMessage = axios.isAxiosError(error) 
      ? error.response?.data?.message || error.message
      : error instanceof Error 
        ? error.message
        : "Verification failed. Please try again.";

    console.error(`❌ [${requestId}] Verification failed after ${processingTime}s:`, error);
    
    return NextResponse.json(
      { 
        error: errorMessage,
        requestId,
        processingTime 
      }, 
      { status: 500 }
    );
  }
}