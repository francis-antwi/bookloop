import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { validateExtractedData } from "../utils/idValidation";
import { createUserIfNeeded } from "../utils/conditionalRegistration";
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
    const formData = await req.formData();

    const verificationStep = formData.get("verificationStep")?.toString() || "identity";
    const email = formData.get("email")?.toString() || null;
    const role = formData.get("role")?.toString() || "CUSTOMER";
    const shouldRegister = formData.get("shouldRegister")?.toString() === "true";

    const selfieFile = formData.get("selfie") as File | null;
    const idFile = formData.get("idImage") as File | null;

    const oauthName = formData.get("name")?.toString() || null;
    const oauthContactPhone = formData.get("contactPhone")?.toString() || null;

    const tinNumber = formData.get("tinNumber")?.toString() || null;
    const registrationNumber = formData.get("registrationNumber")?.toString() || null;
    const businessName = formData.get("businessName")?.toString() || null;
    const businessType = formData.get("businessType")?.toString() || null;
    const businessAddress = formData.get("businessAddress")?.toString() || null;

    const tinCertificateFile = formData.get("tinCertificate") as File | null;
    const incorporationCertFile = formData.get("incorporationCert") as File | null;
    const vatCertificateFile = formData.get("vatCertificate") as File | null;
    const ssnitCertFile = formData.get("ssnitCert") as File | null;

    const session = await getServerSession(authOptions);
    const isGoogleAuth = !!(session?.user?.email && session.user.email === email);

    // === Step 1: Identity Verification ===
    if (verificationStep === "identity" || verificationStep === "full") {
      if (!selfieFile || !idFile) {
        return NextResponse.json({ error: "Missing selfie or ID file" }, { status: 400 });
      }

      const [selfieUrl, idUrl] = await Promise.all([
        uploadToCloudinary(selfieFile, "selfies"),
        uploadToCloudinary(idFile, "ids"),
      ]);

      const ocrResponse = await sendOriginalToTaggun(idFile);
      const extractedData = extractIDInfo(ocrResponse);
      const validationResult = validateExtractedData(extractedData);

      if (!validationResult.isValid) {
        return NextResponse.json({ error: "Invalid ID document", details: validationResult.errors }, { status: 422 });
      }

      const matchResult = await matchFace(selfieUrl, idUrl);
      if (!matchResult.isMatch) {
        return NextResponse.json({ error: "Face does not match ID", confidence: matchResult.confidence }, { status: 401 });
      }

      if (shouldRegister && email) {
        const user = await createUserIfNeeded({
          email,
          name: oauthName || extractedData.idName || undefined,
          contactPhone: oauthContactPhone || undefined,
          role: role as UserRole,
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
          verified: true,
        });

        return NextResponse.json({
          success: true,
          verified: true,
          step: "identity",
          user,
          selfieUrl,
          imageUrl: idUrl,
          extractedData,
        });
      }

      return NextResponse.json({
        success: true,
        verified: true,
        step: "identity",
        selfieUrl,
        imageUrl: idUrl,
        matchConfidence: matchResult.confidence,
        extractedData,
      });
    }

    // === Step 2: Business Verification ===
    if ((verificationStep === "business" || verificationStep === "full") && email && role === "PROVIDER") {
      const [
        tinCertificateUrl,
        incorporationCertUrl,
        vatCertificateUrl,
        ssnitCertUrl,
      ] = await Promise.all([
        tinCertificateFile ? uploadToCloudinary(tinCertificateFile, "business/tin") : null,
        incorporationCertFile ? uploadToCloudinary(incorporationCertFile, "business/incorporation") : null,
        vatCertificateFile ? uploadToCloudinary(vatCertificateFile, "business/vat") : null,
        ssnitCertFile ? uploadToCloudinary(ssnitCertFile, "business/ssnit") : null,
      ]);

      const user = await createUserIfNeeded({
        email,
        role: "PROVIDER",
        businessVerification: {
          create: {
            tinNumber,
            registrationNumber,
            businessName,
            businessType,
            businessAddress,
            tinCertificateUrl,
            incorporationCertUrl,
            vatCertificateUrl,
            ssnitCertUrl,
            verified: false,
            submittedAt: new Date(),
          },
        },
      });

      return NextResponse.json({
        success: true,
        verified: false,
        step: "business",
        businessData: {
          tinNumber,
          registrationNumber,
          businessName,
          businessType,
          businessAddress,
          tinCertificateUrl,
          incorporationCertUrl,
          vatCertificateUrl,
          ssnitCertUrl,
        },
        user,
      });
    }

    return NextResponse.json({ error: "Invalid request or missing data" }, { status: 400 });
  } catch (err: any) {
    console.error("❌ [VERIFY ERROR]:", err);
    if (axios.isAxiosError(err)) {
      console.error("Axios Error:", err.response?.data);
    }
    return NextResponse.json({ error: err.message || "Verification failed" }, { status: 500 });
  }
}

// === Helpers ===
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
