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
  return text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();
};

const getLines = (text: string): string[] => {
  return text
    .split(/\r?\n/)
    .map(line => cleanText(line))
    .filter(line => line.length > 0);
};

const extractName = (lines: string[]): string | null => {
  const nameLine = lines.find(line => /name[:\s]/i.test(line));
  return nameLine?.split(/name[:\s]/i)?.[1]?.trim() || null;
};

const extractDates = (lines: string[]): { date: string; line: string; index: number }[] => {
  const dateRegex = /\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/;
  return lines
    .map((line, index) => {
      const match = line.match(dateRegex);
      return match ? { date: match[0], line, index } : null;
    })
    .filter(Boolean) as any;
};

const normalizeDate = (dateStr: string): Date => {
  const cleaned = dateStr.replace(/[^\d\/\-.]/g, '');
  const parts = cleaned.split(/[\/\-\.]/).map(Number);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a > 31) return new Date(a, b - 1, c);
    if (c > 31) return new Date(c, b - 1, a);
    return new Date(a, b - 1, c);
  }
  throw new Error(`Invalid date format: ${dateStr}`);
};

const extractIDNumber = (lines: string[]): string | null => {
  const idLine = lines.find(line =>
    /(card number|id no|id number|gh[0-9]{8,})/i.test(line)
  );
  const match = idLine?.match(/([A-Z0-9]{6,})/);
  return match?.[0] || null;
};

const extractIDInfo = (parsedText: string): IDInfo => {
  const lines = getLines(parsedText);

  const idName = extractName(lines);
  const idNumber = extractIDNumber(lines);
  const dates = extractDates(lines);

  const idDOB = dates[0]?.date || null;
  const idIssueDate = dates[1]?.date || null;
  const idExpiryDate = dates[2]?.date || null;

  console.log("📄 Extracted lines from OCR:", lines);
  console.log("🔎 Extracted Fields:");
  console.log("Name:", idName);
  console.log("ID Number:", idNumber);
  console.log("DOB:", idDOB);
  console.log("Issue Date:", idIssueDate);
  console.log("Expiry Date:", idExpiryDate);

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
  const buffer = Buffer.from(await file.arrayBuffer());
  return sharp(buffer)
    .resize({ width: 800 })
    .grayscale()
    .normalize()
    .jpeg({ quality: 85 })
    .toBuffer();
};

const uploadToCloudinary = async (buffer: Buffer, fileType: string): Promise<{ secure_url: string }> => {
  const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
  return cloudinary.v2.uploader.upload(dataURI, {
    folder: "face_compare",
    timeout: 30000
  });
};

const performOCR = async (imageBuffer: Buffer): Promise<string> => {
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
  try {
    const response = await axios.post(
      "https://api.ocr.space/parse/image",
      new URLSearchParams({
        apikey: process.env.OCR_SPACE_API_KEY!,
        base64Image,
        language: "eng",
        OCREngine: "2"
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      }
    );

    console.log("🧾 OCR API raw response:", JSON.stringify(response.data, null, 2));

    if (response.data?.IsErroredOnProcessing) {
      throw new Error(`OCR error: ${response.data.ErrorMessage || response.data.ErrorDetails}`);
    }

    const parsedText = response.data?.ParsedResults?.[0]?.ParsedText;
    if (!parsedText) {
      throw new Error("No ParsedText returned by OCR API.");
    }

    return parsedText;
  } catch (err) {
    console.error("❌ OCR API call failed:", err);
    throw new Error("Failed to extract text from ID.");
  }
};

const compareFaces = async (selfieUrl: string, idUrl: string): Promise<{ confidence: number }> => {
  const response = await axios.post(
    "https://api-us.faceplusplus.com/facepp/v3/compare",
    new URLSearchParams({
      api_key: process.env.FACEPP_API_KEY!,
      api_secret: process.env.FACEPP_API_SECRET!,
      image_url1: selfieUrl,
      image_url2: idUrl
    }),
    { timeout: 15000 }
  );

  const confidence = Number(response.data?.confidence || 0);
  console.log(`🧠 Face match confidence: ${confidence}`);

  if (!response.data?.faces1?.[0] || !response.data?.faces2?.[0]) {
    throw new Error("Could not detect faces in one or both images");
  }

  return { confidence };
};

// API Route
export async function POST(req: Request): Promise<NextResponse<VerificationResult | { error: string }>> {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      console.error("❌ Missing selfie or ID image.");
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    if (!selfie.type.startsWith("image/") || !id.type.startsWith("image/")) {
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
    if (!idKeywords.some(keyword => parsedText.toLowerCase().includes(keyword))) {
      console.warn("⚠️ OCR output does not match any known ID keywords.");
      return NextResponse.json({ error: "The uploaded image doesn't appear to be a valid ID document." }, { status: 400 });
    }

    const extractedInfo = extractIDInfo(parsedText);

    if (!extractedInfo.idName) console.warn("⚠️ Name not found in OCR result.");
    if (!extractedInfo.idNumber) console.warn("⚠️ ID number not found.");
    if (!extractedInfo.idDOB) console.warn("⚠️ DOB not found.");

    if (!extractedInfo.idName || !extractedInfo.idNumber || !extractedInfo.idDOB) {
      return NextResponse.json({ error: "Could not extract required ID information." }, { status: 400 });
    }

    const dob = normalizeDate(extractedInfo.idDOB);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 15 || age > 100) {
      console.warn("⚠️ Extracted DOB seems invalid:", extractedInfo.idDOB);
      return NextResponse.json({ error: "The date of birth on the ID appears to be invalid." }, { status: 400 });
    }

    const faceComparison = await compareFaces(selfieUpload.secure_url, idUpload.secure_url);
    const threshold = 80;
    const confidence = parseFloat(faceComparison.confidence.toFixed(2));

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch: confidence >= threshold,
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
    let errorMessage = "Verification failed.";
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    console.error("❌ Unhandled error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
