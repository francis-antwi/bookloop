import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { validateExtractedData } from "../utils/idValidation";
import { createUserIfNeeded } from "../utils/conditionalRegistration";
import { extractIDInfo } from "../utils/extractIDInfo";
import { matchFace } from "../utils/faceMatch";

// === Cloudinary Config ===
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const selfieFile = formData.get("selfie") as File | null;
    const idFile = formData.get("idImage") as File | null;
    const role = formData.get("role")?.toString() || "CUSTOMER";
    const shouldRegister = formData.get("shouldRegister")?.toString() === "true";
    const oauthEmail = formData.get("email")?.toString() || null;

    if (!selfieFile || !idFile) {
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    // === Upload files to Cloudinary ===
    const [selfieUrl, idUrl] = await Promise.all([
      uploadToCloudinary(selfieFile, "selfies"),
      uploadToCloudinary(idFile, "ids"),
    ]);

    // === Send to Taggun ===
    const ocrResponse = await sendOriginalToTaggun(idFile);
    console.log("\uD83D\uDCC4 [RAW OCR RESPONSE from Taggun]:", JSON.stringify(ocrResponse, null, 2));

    const extractedData = extractIDInfo(ocrResponse);
    console.log("\uD83D\uDCE6 [Extracted ID Fields]:", extractedData);

    const isValid = validateExtractedData(extractedData);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid ID document" }, { status: 422 });
    }

    // === Face Comparison ===
    const matchResult = await matchFace(selfieUrl, idUrl);
    console.log("\uD83E\uDE1D [Face Match Confidence]:", matchResult.confidence);
    if (!matchResult.isMatch) {
      return NextResponse.json({
        error: "Face does not match ID",
        confidence: matchResult.confidence,
      }, { status: 401 });
    }

    if (shouldRegister && oauthEmail && role === "PROVIDER") {
  const user = await createUserIfNeeded({
    email: oauthEmail,
    role,
    selfieImage: selfieUrl,
    idImage: idUrl,
    idName: extractedData.idName,
    idNumber: extractedData.idNumber || extractedData.personalIdNumber,
    personalIdNumber: extractedData.personalIdNumber,
    idType: extractedData.idType,
    idDOB: extractedData.idDOB,
    idExpiryDate: extractedData.idExpiryDate,
    idIssueDate: extractedData.idIssueDate,
    idIssuer: extractedData.idIssuer,
    nationality: extractedData.nationality,
    gender: extractedData.gender,
    placeOfIssue: extractedData.placeOfIssue,
    rawText: extractedData.rawText,
    isVerified: true,
  });

  return NextResponse.json({
    success: true,
    verified: true,
    user,
    selfieUrl,
    imageUrl: idUrl,
    extractedData,
  });
}


    return NextResponse.json({
      success: true,
      verified: true,
      selfieUrl,
      imageUrl: idUrl,
      matchConfidence: matchResult.confidence,
      extractedData: {
        ...extractedData,
        selfieUrl,
        idUrl,
        faceConfidence: matchResult.confidence,
      },
    });
  } catch (err: any) {
    console.error("\u274C [VERIFY ERROR]:", err);
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) return reject(error);
      resolve(result as any);
    });
    Readable.from(buffer).pipe(stream);
  });
  return upload.secure_url;
}

async function sendOriginalToTaggun(idFile: File) {
  const buffer = Buffer.from(await idFile.arrayBuffer());

  const form = new FormData();
  form.append("file", buffer, {
    filename: idFile.name || "id.jpg",
    contentType: idFile.type || "image/jpeg",
  });
  form.append("extractLineItems", "true");
  form.append("extractTime", "false");
  form.append("refresh", "false");
  form.append("incognito", "false");

  const response = await axios.post("https://api.taggun.io/api/receipt/v1/verbose/file", form, {
    headers: {
      ...form.getHeaders(),
      apikey: process.env.TAGGUN_API_KEY!,
      accept: "application/json",
    },
    maxBodyLength: Infinity,
    timeout: 60000,
  });

  return response.data;
}
