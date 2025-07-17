import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { validateExtractedData } from "../utils/idValidation";
import { extractIDInfo } from "../utils/extractIDInfo";
import { matchFace } from "../utils/faceMatch";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/auth/authOptions";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    console.log("⚙️ [VERIFY]: Received FormData entries:");
    for (const pair of formData.entries()) {
      console.log(`  - ${pair[0]}: ${
        typeof pair[1] === "object" && pair[1] !== null && "name" in pair[1]
          ? (pair[1] as File).name
          : pair[1]
      }`);
    }

    const verificationStep = formData.get("verificationStep")?.toString();
    const selfieFile = formData.get("selfie") as File | null;
    const idFile = formData.get("idImage") as File | null;

    const tinCertificateFile = formData.get("tinCertificate") as File | null;
    const incorporationCertFile = formData.get("incorporationCert") as File | null;
    const vatCertificateFile = formData.get("vatCertificate") as File | null;
    const ssnitCertFile = formData.get("ssnitCert") as File | null;

    let selfieUrl: string | null = null;
    let idUrl: string | null = null;
    let extractedData: any = {};
    let matchConfidence: number | null = null;

    let tinCertificateUrl: string | null = null;
    let incorporationCertUrl: string | null = null;
    let vatCertificateUrl: string | null = null;
    let ssnitCertUrl: string | null = null;

    // Handle identity verification
    if (verificationStep === "identity") {
      if (!selfieFile || !idFile) {
        console.warn("⚠️ [VERIFY]: Skipping identity verification since selfie or ID is missing.");
      } else {
        console.log("⚙️ [VERIFY]: Uploading selfie and ID to Cloudinary...");
        [selfieUrl, idUrl] = await Promise.all([
          uploadToCloudinary(selfieFile, "selfies"),
          uploadToCloudinary(idFile, "ids"),
        ]);
        console.log(`✅ [VERIFY]: Uploads done. Selfie: ${selfieUrl}, ID: ${idUrl}`);

        console.log("⚙️ [VERIFY]: Sending ID image to Taggun...");
        const ocrResponse = await sendOriginalToTaggun(idFile);
        console.log("✅ [VERIFY]: OCR response received.");

        extractedData = extractIDInfo(ocrResponse);
        console.log("⚙️ [VERIFY]: Extracted ID data:", extractedData);

        const validationResult = validateExtractedData(extractedData);
        if (!validationResult.isValid) {
          console.error("❌ [VERIFY ERROR]: ID validation failed:", validationResult.errors);
          return NextResponse.json({ error: "Invalid ID document", details: validationResult.errors }, { status: 422 });
        }

        console.log("⚙️ [VERIFY]: Performing face match...");
        const matchResult = await matchFace(selfieUrl, idUrl);
        matchConfidence = matchResult.confidence;

        if (!matchResult.isMatch) {
          console.error("❌ [VERIFY ERROR]: Face mismatch. Confidence:", matchResult.confidence);
          return NextResponse.json({ error: "Face does not match ID", confidence: matchResult.confidence }, { status: 401 });
        }

        return NextResponse.json({
          success: true,
          verified: true,
          selfieUrl,
          idUrl,
          matchConfidence,
          extractedData,
        });
      }
    }

    // Handle business verification
    if (verificationStep === "business") {
      if (tinCertificateFile || incorporationCertFile || vatCertificateFile || ssnitCertFile) {
        console.log("⚙️ [VERIFY]: Uploading business documents to Cloudinary...");
        [
          tinCertificateUrl,
          incorporationCertUrl,
          vatCertificateUrl,
          ssnitCertUrl
        ] = await Promise.all([
          tinCertificateFile ? uploadToCloudinary(tinCertificateFile, "business/tin") : Promise.resolve(null),
          incorporationCertFile ? uploadToCloudinary(incorporationCertFile, "business/incorporation") : Promise.resolve(null),
          vatCertificateFile ? uploadToCloudinary(vatCertificateFile, "business/vat") : Promise.resolve(null),
          ssnitCertFile ? uploadToCloudinary(ssnitCertFile, "business/ssnit") : Promise.resolve(null),
        ]);
        console.log(`✅ [VERIFY]: Business document uploads done. TIN: ${tinCertificateUrl}, Inc: ${incorporationCertUrl}, VAT: ${vatCertificateUrl}, SSNIT: ${ssnitCertUrl}`);
      }

      return NextResponse.json({
        success: true,
        message: "Business documents processed.",
        tinCertificateUrl,
        incorporationCertUrl,
        vatCertificateUrl,
        ssnitCertUrl,
      });
    }

    // Fallback if unknown or missing verification step
    console.warn("⚠️ [VERIFY]: Unknown verificationStep or missing. Defaulting to success.");
    return NextResponse.json({ success: true, message: "Verification step completed with no data." });
  } catch (err: any) {
    console.error("❌ [VERIFY ERROR]: An error occurred during verification.");
    if (axios.isAxiosError(err)) {
      console.error("  Axios Error Details:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
    } else if (err instanceof Error) {
      console.error("  Standard Error Details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
    } else {
      console.error("  Unknown Error Type:", err);
    }
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}

// === Helpers ===

async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  console.log(`⚙️ [Cloudinary]: Uploading file "${file.name}" to folder "${folder}"...`);
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        console.error(`❌ [Cloudinary]: Upload failed for file "${file.name}":`, error);
        return reject(error);
      }
      console.log(`✅ [Cloudinary]: Upload successful for "${file.name}". URL: ${result.secure_url}`);
      resolve(result as any);
    });
    Readable.from(buffer).pipe(stream);
  });
  return upload.secure_url;
}

async function sendOriginalToTaggun(idFile: File) {
  console.log(`⚙️ [Taggun]: Sending file "${idFile.name}" to Taggun for OCR...`);
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
