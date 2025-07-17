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
import { UserRole } from "@prisma/client"; 

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
      console.log(
        `  - ${pair[0]}: ${
          typeof pair[1] === "object" && pair[1] !== null && "name" in pair[1]
            ? (pair[1] as File).name
            : pair[1]
        }`
      );
    }

    const verificationStep = formData.get("verificationStep")?.toString() || "identity";

    // === Business Docs Upload ===
    const tinCertificateFile = formData.get("tinCertificate") as File | null;
    const incorporationCertFile = formData.get("incorporationCert") as File | null;
    const vatCertificateFile = formData.get("vatCertificate") as File | null;
    const ssnitCertFile = formData.get("ssnitCert") as File | null;

    let tinCertificateUrl: string | null = null;
    let incorporationCertUrl: string | null = null;
    let vatCertificateUrl: string | null = null;
    let ssnitCertUrl: string | null = null;

    if (tinCertificateFile || incorporationCertFile || vatCertificateFile || ssnitCertFile) {
      console.log("⚙️ [VERIFY]: Uploading business documents to Cloudinary...");
      [
        tinCertificateUrl,
        incorporationCertUrl,
        vatCertificateUrl,
        ssnitCertUrl,
      ] = await Promise.all([
        tinCertificateFile ? uploadToCloudinary(tinCertificateFile, "business/tin") : Promise.resolve(null),
        incorporationCertFile ? uploadToCloudinary(incorporationCertFile, "business/incorporation") : Promise.resolve(null),
        vatCertificateFile ? uploadToCloudinary(vatCertificateFile, "business/vat") : Promise.resolve(null),
        ssnitCertFile ? uploadToCloudinary(ssnitCertFile, "business/ssnit") : Promise.resolve(null),
      ]);
      console.log(`✅ [VERIFY]: Business uploads done.`);
    }

    // === Identity Verification ===
    let selfieUrl: string | null = null;
    let idUrl: string | null = null;
    let extractedData: any = {};
    let matchConfidence: number | null = null;

    if (verificationStep === "identity") {
      const selfieFile = formData.get("selfie") as File | null;
      const idFile = formData.get("idImage") as File | null;

      if (!selfieFile || !idFile) {
        console.error("❌ [VERIFY ERROR]: Missing selfie or ID file for identity verification.");
        return NextResponse.json({ error: "Missing identity files" }, { status: 400 });
      }

      console.log("⚙️ [VERIFY]: Uploading selfie and ID...");
      [selfieUrl, idUrl] = await Promise.all([
        uploadToCloudinary(selfieFile, "selfies"),
        uploadToCloudinary(idFile, "ids"),
      ]);
      console.log(`✅ [VERIFY]: Uploaded Selfie: ${selfieUrl}, ID: ${idUrl}`);

      const ocrResponse = await sendOriginalToTaggun(idFile);
      extractedData = extractIDInfo(ocrResponse);

      const validationResult = validateExtractedData(extractedData);
      if (!validationResult.isValid) {
        return NextResponse.json({ error: "Invalid ID document", details: validationResult.errors }, { status: 422 });
      }

      const matchResult = await matchFace(selfieUrl, idUrl);
      matchConfidence = matchResult.confidence;

      if (!matchResult.isMatch) {
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

    // === Business response ===
    if (verificationStep === "business") {
      return NextResponse.json({
        success: true,
        message: "Business documents processed.",
        tinCertificateUrl,
        incorporationCertUrl,
        vatCertificateUrl,
        ssnitCertUrl,
      });
    }

    console.warn("⚠️ [VERIFY]: Unknown verificationStep. Returning generic response.");
    return NextResponse.json({ success: true, message: "Verification step completed." });

  } catch (err: any) {
    console.error("❌ [VERIFY ERROR]:", err);

    if (axios.isAxiosError(err)) {
      console.error("Axios error:", err.response?.data || err.message);
    } else if (err instanceof Error) {
      console.error("Standard error:", err.message);
    }

    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}

// === Helpers ===
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (error, result) => {
      if (error || !result) {
        return reject(error);
      }
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
