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
  const nameLine = lines.find(line => /name[:\s]/i.test(line));
  if (!nameLine) {
    console.log("🔍 No line containing 'name' pattern found");
    return null;
  }
  
  const name = nameLine.split(/name[:\s]/i)?.[1]?.trim() || null;
  console.log(`🪪 Extracted name: ${name || 'NOT FOUND'}`);
  return name;
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
    // Handle different date formats (YYYY-MM-DD vs DD-MM-YYYY)
    if (a > 31) {
      console.log(`📆 Interpreted as YYYY-MM-DD: ${a}-${b}-${c}`);
      return new Date(a, b - 1, c);
    }
    if (c > 31) {
      console.log(`📆 Interpreted as DD-MM-YYYY: ${a}-${b}-${c}`);
      return new Date(c, b - 1, a);
    }
    // Fallback to MM-DD-YYYY if ambiguous
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
    /([A-Z0-9]{6,})/ // Fallback pattern
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

  // Sort dates by line number to get chronological order
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

const processImageFile = async (file: File): Promise<Buffer> => {
  console.log(`🖼️ Processing image file: ${file.name} (${file.type}, ${file.size} bytes)`);
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    
    console.log(`✅ Image processed successfully. Final size: ${processedBuffer.length} bytes`);
    return processedBuffer;
  } catch (error) {
    console.error(`❌ Image processing failed: ${error}`);
    throw new Error("Failed to process image file");
  }
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
    const params = new URLSearchParams({
      apikey: process.env.OCR_SPACE_API_KEY!,
      base64Image,
      language: "eng",
      OCREngine: "2",
      isTable: "true",
      detectOrientation: "true",
      scale: "true",
      isCreateSearchablePdf: "false",
      isSearchablePdfHideTextLayer: "false"
    });

    console.log("📨 Sending OCR request with parameters:", params.toString().substring(0, 100) + "...");
    
    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 30000,
      }
    );

    console.log("📄 OCR API response received. Status:", response.status);
    console.debug("Raw OCR response data:", JSON.stringify(response.data, null, 2));

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
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error("❌ OCR API call failed:", {
        message: err.message,
        code: err.code,
        response: err.response?.data,
        stack: err.stack
      });
      
      if (err.code === 'ECONNABORTED') {
        throw new Error("OCR service timeout. Please try again with a clearer image.");
      }
      throw new Error(`OCR service error: ${err.message}`);
    }
    console.error("❌ Unexpected OCR error:", err);
    throw err;
  }
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
  console.log("🚀 Starting ID verification process");
  
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      console.error("❌ Missing selfie or ID image.");
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    console.log("📸 Received files:", {
      selfie: { name: selfie.name, type: selfie.type, size: selfie.size },
      id: { name: id.name, type: id.type, size: id.size }
    });

    if (!selfie.type.startsWith("image/") || !id.type.startsWith("image/")) {
      console.error("❌ Invalid file types:", { selfieType: selfie.type, idType: id.type });
      return NextResponse.json({ error: "Invalid file type. Only images are allowed." }, { status: 400 });
    }

    const [selfieBuffer, idBuffer] = await Promise.all([
      processImageFile(selfie),
      processImageFile(id)
    ]);

    const [selfieUpload, idUpload] = await Promise.all([
      uploadToCloudinary(selfieBuffer, selfie.type),
      uploadToCloudinary(idBuffer, id.type)
    ]);

    const parsedText = await performOCR(idBuffer);

    const idKeywords = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
    const keywordMatches = idKeywords.filter(keyword => parsedText.toLowerCase().includes(keyword));
    
    console.log("🔑 ID keyword matches:", keywordMatches);
    if (keywordMatches.length === 0) {
      console.warn("⚠️ OCR output does not match any known ID keywords. Full text:", parsedText.substring(0, 200) + "...");
      return NextResponse.json({ error: "The uploaded image doesn't appear to be a valid ID document." }, { status: 400 });
    }

    const extractedInfo = extractIDInfo(parsedText);

    // Validate required fields with detailed logging
    const missingFields = [];
    if (!extractedInfo.idName) {
      console.warn("⚠️ Name not found in OCR result.");
      missingFields.push("name");
    }
    if (!extractedInfo.idNumber) {
      console.warn("⚠️ ID number not found.");
      missingFields.push("ID number");
    }
    if (!extractedInfo.idDOB) {
      console.warn("⚠️ DOB not found.");
      missingFields.push("date of birth");
    }

    if (missingFields.length > 0) {
      console.error("❌ Missing required fields:", missingFields);
      return NextResponse.json(
        { error: `Could not extract required ID information: ${missingFields.join(", ")}` }, 
        { status: 400 }
      );
    }

    // Validate date of birth
    try {
      const dob = normalizeDate(extractedInfo.idDOB!);
      const age = new Date().getFullYear() - dob.getFullYear();
      console.log("👶 Age calculated from DOB:", age);
      
      if (age < 15 || age > 100) {
        console.warn("⚠️ Extracted DOB seems invalid:", {
          extracted: extractedInfo.idDOB,
          normalized: dob.toISOString(),
          age
        });
        return NextResponse.json({ error: "The date of birth on the ID appears to be invalid." }, { status: 400 });
      }
    } catch (dateError) {
      console.error("❌ Date normalization failed:", dateError);
      return NextResponse.json({ error: "The date format on the ID is invalid." }, { status: 400 });
    }

    const faceComparison = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const threshold = 80;
    const confidence = parseFloat(faceComparison.confidence.toFixed(2));
    const faceMatch = confidence >= threshold;

    console.log("🎉 Verification completed successfully!", {
      faceMatch,
      confidence,
      threshold,
      processingTime: `${(Date.now() - startTime) / 1000} seconds`
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
    const errorId = Math.random().toString(36).substring(2, 8);
    const processingTime = (Date.now() - startTime) / 1000;
    
    console.error(`❌ [${errorId}] Verification failed after ${processingTime} seconds:`, error);
    
    let errorMessage = "Verification failed. Please try again.";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        errorId,
        processingTime 
      }, 
      { status: 500 }
    );
  }
}