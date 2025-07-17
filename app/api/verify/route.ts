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

// === Cloudinary Config ===
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Validate verificationStep
    if (!["identity", "business"].includes(verificationStep)) {
      return NextResponse.json({ error: "Invalid verification step" }, { status: 400 });
    }

    // === Business Documents ===
    const tinCertificateFile = formData.get("tinCertificate") as File | null;
    const incorporationCertFile = formData.get("incorporationCert") as File | null;
    const vatCertificateFile = formData.get("vatCertificate") as File | null;
    const ssnitCertFile = formData.get("ssnitCert") as File | null;

    let tinCertificateUrl: string | null = null;
    let incorporationCertUrl: string | null = null;
    let vatCertificateUrl: string | null = null;
    let ssnitCertUrl: string | null = null;

    // Upload business documents if any are provided
    if (tinCertificateFile || incorporationCertFile || vatCertificateFile || ssnitCertFile) {
      console.log("⚙️ [VERIFY]: Uploading business documents to Cloudinary...");
      
      const uploadPromises = [
        tinCertificateFile ? uploadToCloudinary(tinCertificateFile, "business/tin") : Promise.resolve(null),
        incorporationCertFile ? uploadToCloudinary(incorporationCertFile, "business/incorporation") : Promise.resolve(null),
        vatCertificateFile ? uploadToCloudinary(vatCertificateFile, "business/vat") : Promise.resolve(null),
        ssnitCertFile ? uploadToCloudinary(ssnitCertFile, "business/ssnit") : Promise.resolve(null),
      ];

      try {
        [
          tinCertificateUrl,
          incorporationCertUrl,
          vatCertificateUrl,
          ssnitCertUrl,
        ] = await Promise.all(uploadPromises);
        console.log(`✅ [VERIFY]: Business document uploads done.`);
      } catch (uploadError) {
        console.error("❌ [VERIFY ERROR]: Failed to upload business documents:", uploadError);
        return NextResponse.json({ error: "Failed to upload business documents" }, { status: 500 });
      }
    }

    // === Identity Uploads (used in both identity + business if required) ===
    let selfieUrl: string | null = null;
    let idUrl: string | null = null;
    let extractedData: any = {};
    let matchConfidence: number | null = null;

    // === Identity Verification ===
    if (verificationStep === "identity") {
      const selfieFile = formData.get("selfie") as File | null;
      const idFile = formData.get("idImage") as File | null;

      if (!selfieFile || !idFile) {
        console.error("❌ [VERIFY ERROR]: Missing selfie or ID file for identity verification.");
        return NextResponse.json({ error: "Missing identity files" }, { status: 400 });
      }

      // Validate file types
      const validationResult = validateFiles(selfieFile, idFile);
      if (!validationResult.isValid) {
        return NextResponse.json({ error: validationResult.error }, { status: 400 });
      }

      console.log("⚙️ [VERIFY]: Uploading selfie and ID to Cloudinary...");
      try {
        [selfieUrl, idUrl] = await Promise.all([
          uploadToCloudinary(selfieFile, "selfies"),
          uploadToCloudinary(idFile, "ids"),
        ]);
        console.log(`✅ [VERIFY]: Uploads done. Selfie: ${selfieUrl}, ID: ${idUrl}`);
      } catch (uploadError) {
        console.error("❌ [VERIFY ERROR]: Failed to upload identity files:", uploadError);
        return NextResponse.json({ error: "Failed to upload identity files" }, { status: 500 });
      }

      console.log("⚙️ [VERIFY]: Sending ID image to Taggun...");
      try {
        const ocrResponse = await sendOriginalToTaggun(idFile);
        console.log("✅ [VERIFY]: OCR response received.");

        extractedData = extractIDInfo(ocrResponse);
        console.log("⚙️ [VERIFY]: Extracted ID data:", extractedData);

        const validationResult = validateExtractedData(extractedData);
        if (!validationResult.isValid) {
          console.error("❌ [VERIFY ERROR]: ID validation failed:", validationResult.errors);
          return NextResponse.json({ 
            error: "Invalid ID document", 
            details: validationResult.errors 
          }, { status: 422 });
        }
      } catch (ocrError) {
        console.error("❌ [VERIFY ERROR]: OCR processing failed:", ocrError);
        return NextResponse.json({ error: "Failed to process ID document" }, { status: 500 });
      }

      console.log("⚙️ [VERIFY]: Performing face match...");
      try {
        const matchResult = await matchFace(selfieUrl, idUrl);
        matchConfidence = matchResult.confidence;

        if (!matchResult.isMatch) {
          console.error("❌ [VERIFY ERROR]: Face mismatch. Confidence:", matchResult.confidence);
          return NextResponse.json({ 
            error: "Face does not match ID", 
            confidence: matchResult.confidence 
          }, { status: 401 });
        }
      } catch (matchError) {
        console.error("❌ [VERIFY ERROR]: Face matching failed:", matchError);
        return NextResponse.json({ error: "Failed to perform face matching" }, { status: 500 });
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

    // === Business Verification (now requires selfie + ID too) ===
    if (verificationStep === "business") {
      const selfieFile = formData.get("selfie") as File | null;
      const idFile = formData.get("idImage") as File | null;

      if (!selfieFile || !idFile) {
        console.error("❌ [VERIFY ERROR]: Missing selfie or ID file for business verification.");
        return NextResponse.json({ 
          error: "Missing identity files for business verification" 
        }, { status: 400 });
      }

      // Validate file types
      const validationResult = validateFiles(selfieFile, idFile);
      if (!validationResult.isValid) {
        return NextResponse.json({ error: validationResult.error }, { status: 400 });
      }

      console.log("⚙️ [VERIFY-BUSINESS]: Uploading selfie and ID to Cloudinary...");
      try {
        [selfieUrl, idUrl] = await Promise.all([
          uploadToCloudinary(selfieFile, "selfies"),
          uploadToCloudinary(idFile, "ids"),
        ]);
        console.log(`✅ [VERIFY-BUSINESS]: Selfie: ${selfieUrl}, ID: ${idUrl}`);
      } catch (uploadError) {
        console.error("❌ [VERIFY ERROR]: Failed to upload identity files for business verification:", uploadError);
        return NextResponse.json({ error: "Failed to upload identity files" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "Business documents processed.",
        tinCertificateUrl,
        incorporationCertUrl,
        vatCertificateUrl,
        ssnitCertUrl,
        selfieUrl,
        idUrl,
      });
    }

    // This should never be reached due to validation above
    console.warn("⚠️ [VERIFY]: Unknown verificationStep. This should not happen.");
    return NextResponse.json({ error: "Invalid verification step" }, { status: 400 });

  } catch (err: any) {
    console.error("❌ [VERIFY ERROR]: An error occurred during verification.");
    
    if (axios.isAxiosError(err)) {
      console.error("  Axios Error:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      
      // Handle specific axios errors
      if (err.code === 'ECONNABORTED') {
        return NextResponse.json({ error: "Request timeout" }, { status: 408 });
      }
      if (err.response?.status === 401) {
        return NextResponse.json({ error: "API authentication failed" }, { status: 500 });
      }
      
    } else if (err instanceof Error) {
      console.error("  Error:", err.message, err.stack);
    } else {
      console.error("  Unknown error:", err);
    }

    return NextResponse.json({ 
      error: err.message || "Verification failed" 
    }, { status: 500 });
  }
}

// === Helpers ===
async function uploadToCloudinary(file: File, folder: string): Promise<string> {
  console.log(`⚙️ [Cloudinary]: Uploading file "${file.name}" to folder "${folder}"...`);
  
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const upload = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { 
          folder,
          resource_type: "auto",
          max_file_size: 10000000, // 10MB limit
        }, 
        (error, result) => {
          if (error || !result) {
            console.error(`❌ [Cloudinary]: Upload failed for file "${file.name}":`, error);
            return reject(error || new Error("Upload failed"));
          }
          console.log(`✅ [Cloudinary]: Upload successful for "${file.name}". URL: ${result.secure_url}`);
          resolve(result as any);
        }
      );
      
      Readable.from(buffer).pipe(stream);
    });
    
    return upload.secure_url;
  } catch (error) {
    console.error(`❌ [Cloudinary]: Failed to upload "${file.name}":`, error);
    throw new Error(`Failed to upload ${file.name}`);
  }
}

async function sendOriginalToTaggun(idFile: File) {
  console.log(`⚙️ [Taggun]: Sending file "${idFile.name}" to Taggun for OCR...`);
  
  try {
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
  } catch (error) {
    console.error(`❌ [Taggun]: Failed to process "${idFile.name}":`, error);
    throw new Error(`Failed to process ID document: ${error}`);
  }
}

// File validation helper
function validateFiles(selfieFile: File, idFile: File): { isValid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(selfieFile.type)) {
    return { isValid: false, error: "Invalid selfie file type. Only JPEG, PNG, and WebP are allowed." };
  }

  if (!allowedTypes.includes(idFile.type)) {
    return { isValid: false, error: "Invalid ID file type. Only JPEG, PNG, and WebP are allowed." };
  }

  if (selfieFile.size > maxSize) {
    return { isValid: false, error: "Selfie file size too large. Maximum 10MB allowed." };
  }

  if (idFile.size > maxSize) {
    return { isValid: false, error: "ID file size too large. Maximum 10MB allowed." };
  }

  return { isValid: true };
}