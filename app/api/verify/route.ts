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
  } & IDInfo;
}

// Constants
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const MIN_IMAGE_SIZE = 50000; // 50KB
const MAX_IMAGE_SIZE = 5000000; // 5MB

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
    /surname[:\s]([a-zA-Z\s]{3,})/i
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

const normalizeDate = (dateStr: string): Date => {
  console.log(`🔄 Normalizing date: ${dateStr}`);
  const cleaned = dateStr.replace(/[^\d\/\-.]/g, '');
  const parts = cleaned.split(/[\/\-\.]/).map(Number);
  
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a > 31) {
      console.log(`📆 Interpreted as YYYY-MM-DD: ${a}-${b}-${c}`);
      return new Date(a, b - 1, c);
    }
    if (c > 31) {
      console.log(`📆 Interpreted as DD-MM-YYYY: ${a}-${b}-${c}`);
      return new Date(c, b - 1, a);
    }
    console.log(`📆 Interpreted as MM-DD-YYYY: ${a}-${b}-${c}`);
    return new Date(a, b - 1, c);
  }
  throw new Error(`Invalid date format: ${dateStr}`);
};

const extractIDNumber = (lines: string[]): string | null => {
  const idPatterns = [
    /card\s*number[:]?\s*([A-Z0-9]{6,})/i,
    /id\s*no[:]?\s*([A-Z0-9]{6,})/i,
    /id\s*number[:]?\s*([A-Z0-9]{6,})/i,
    /(GH[A-Z0-9]{8,})/i,
    /([A-Z0-9]{6,})/
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
  const lines = getLines(parsedText);

  const idName = extractName(lines);
  const idNumber = extractIDNumber(lines);
  const dates = extractDates(lines);

  dates.sort((a, b) => a.index - b.index);

  const idDOB = dates[0]?.date || null;
  const idIssueDate = dates[1]?.date || null;
  const idExpiryDate = dates[2]?.date || null;

  console.log("📋 Extracted Fields Summary:");
  console.log("┌─────────────────┬─────────────────────────────┐");
  console.log(`│ Name            │ ${idName?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ ID Number       │ ${idNumber?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ DOB             │ ${idDOB?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Issue Date      │ ${idIssueDate?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log(`│ Expiry Date     │ ${idExpiryDate?.padEnd(25) || 'NOT FOUND'.padEnd(25)} │`);
  console.log("└─────────────────┴─────────────────────────────┘");

  return {
    idName,
    idNumber,
    personalIdNumber: null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer: null,
    placeOfIssue: null,
    rawText: parsedText,
  };
};

const processImageForOCR = async (file: File): Promise<Buffer> => {
  console.log(`🖼️ Optimizing image for OCR: ${file.name} (${file.size} bytes)`);
  
  if (file.size < MIN_IMAGE_SIZE) {
    throw new Error(`Image too small (${file.size} bytes). Minimum size is ${MIN_IMAGE_SIZE} bytes.`);
  }
  
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large (${file.size} bytes). Maximum size is ${MAX_IMAGE_SIZE} bytes.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  
  return sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .grayscale()
    .normalize()
    .sharpen()
    .median(3)
    .threshold(128)
    .jpeg({ 
      quality: 90,
      mozjpeg: true 
    })
    .toBuffer();
};

const uploadToCloudinary = async (buffer: Buffer, fileType: string): Promise<{ secure_url: string }> => {
  console.log(`☁️ Uploading to Cloudinary (${fileType}, ${buffer.length} bytes)`);
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  
  try {
    const result = await cloudinary.v2.uploader.upload(dataURI, {
      folder: "face_compare",
      timeout: 30000,
      quality_analysis: true
    });
    console.log(`✅ Cloudinary upload successful. URL: ${result.secure_url.substring(0, 50)}...`);
    return result;
  } catch (error) {
    console.error(`❌ Cloudinary upload failed: ${error}`);
    throw new Error("Failed to upload image to Cloudinary");
  }
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  console.log(`🔍 Performing OCR on image (${imageBuffer.length} bytes)`);
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  
  try {
    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      new URLSearchParams({
        apikey: process.env.OCR_SPACE_API_KEY!,
        base64Image,
        language: "eng",
        OCREngine: "2",
        isTable: "true",
        detectOrientation: "true",
        scale: "true"
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: OCR_TIMEOUT_MS,
      }
    );

    if (response.data?.IsErroredOnProcessing) {
      const errorDetails = response.data.ErrorMessage || response.data.ErrorDetails || "Unknown OCR error";
      console.error(`❌ OCR processing error: ${errorDetails}`);
      throw new Error(`OCR processing failed: ${errorDetails}`);
    }

    const parsedText = response.data?.ParsedResults?.[0]?.ParsedText;
    if (!parsedText || parsedText.trim().length < 10) {
      console.error("❌ Insufficient text extracted from ID:", parsedText?.substring(0, 100) || "EMPTY");
      throw new Error("The ID image didn't contain readable text. Please ensure the image is clear and all text is visible.");
    }

    console.log(`✅ OCR successful. Extracted ${parsedText.length} characters of text`);
    return parsedText;
  } catch (error) {
    console.error("❌ OCR API call failed:", {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
};

const performOCRWithRetry = async (imageBuffer: Buffer, retries = OCR_MAX_RETRIES): Promise<string> => {
  let lastError: any = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔍 OCR Attempt ${i + 1} of ${retries}`);
      return await performOCR(imageBuffer);
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        const delay = Math.pow(2, i) * 1000;
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`❌ All ${retries} OCR attempts failed`);
  throw lastError;
};

const compareFaces = async (selfieUrl: string, idUrl: string): Promise<{ confidence: number }> => {
  console.log(`🤳 Comparing faces:\nSelfie: ${selfieUrl.substring(0, 50)}...\nID: ${idUrl.substring(0, 50)}...`);
  
  try {
    const response = await axios.post(
      "https://api-us.faceplusplus.com/facepp/v3/compare",
      new URLSearchParams({
        api_key: process.env.FACEPP_API_KEY!,
        api_secret: process.env.FACEPP_API_SECRET!,
        image_url1: selfieUrl,
        image_url2: idUrl,
        return_landmark: "0",
        return_attributes: "none"
      }),
      { timeout: 20000 }
    );

    const confidence = Number(response.data?.confidence || 0);
    const threshold = response.data?.thresholds?.["1e-5"] || 80;
    
    console.log("🧠 Face comparison results:", {
      confidence,
      threshold,
      faces1: response.data?.faces1?.length || 0,
      faces2: response.data?.faces2?.length || 0,
      timeUsed: response.data?.time_used || 0
    });

    if (!response.data?.faces1?.[0] || !response.data?.faces2?.[0]) {
      const errorDetails = {
        selfieFaces: response.data?.faces1?.length || 0,
        idFaces: response.data?.faces2?.length || 0,
        error: "Could not detect faces in one or both images"
      };
      console.error("❌ Face detection failed:", errorDetails);
      throw new Error(JSON.stringify(errorDetails));
    }

    return { confidence };
  } catch (error) {
    console.error("❌ Face comparison failed:", error);
    throw new Error("Failed to compare faces");
  }
};

// API Route
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
      return NextResponse.json({ error: "The uploaded image doesn't appear to be a valid ID document." }, { status: 400 });
    }

    const extractedInfo = extractIDInfo(parsedText);

    // Validate required fields
    const missingFields = [];
    if (!extractedInfo.idName) missingFields.push("name");
    if (!extractedInfo.idNumber) missingFields.push("ID number");
    if (!extractedInfo.idDOB) missingFields.push("date of birth");

    if (missingFields.length > 0) {
      console.error(`❌ [${requestId}] Missing required fields:`, missingFields);
      return NextResponse.json(
        { error: `Could not extract required ID information: ${missingFields.join(", ")}` }, 
        { status: 400 }
      );
    }

    // Validate date of birth
    try {
      const dob = normalizeDate(extractedInfo.idDOB!);
      const age = new Date().getFullYear() - dob.getFullYear();
      console.log(`👶 [${requestId}] Age calculated from DOB:`, age);
      
      if (age < 15 || age > 100) {
        console.warn(`⚠️ [${requestId}] Extracted DOB seems invalid:`, {
          extracted: extractedInfo.idDOB,
          normalized: dob.toISOString(),
          age
        });
        return NextResponse.json({ error: "The date of birth on the ID appears to be invalid." }, { status: 400 });
      }
    } catch (dateError) {
      console.error(`❌ [${requestId}] Date normalization failed:`, dateError);
      return NextResponse.json({ error: "The date format on the ID is invalid." }, { status: 400 });
    }

    const faceComparison = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const threshold = 80;
    const confidence = parseFloat(faceComparison.confidence.toFixed(2));
    const faceMatch = confidence >= threshold;

    const processingTime = (Date.now() - startTime) / 1000;
    console.log(`🎉 [${requestId}] Verification completed in ${processingTime}s!`, {
      faceMatch,
      confidence,
      threshold
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