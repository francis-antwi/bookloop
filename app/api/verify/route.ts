import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";
import FormData from "form-data";
import { Readable } from "stream";
import { validateExtractedData } from "../utils/idValidation";
import { extractIDInfo } from "../utils/extractIDInfo";
import { matchFace } from "../utils/faceMatch";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // Log received files for debugging
    console.log("⚙️ [VERIFY]: Received FormData entries:");
    for (const [key, value] of formData.entries()) {
      console.log(`- ${key}: ${value instanceof File ? value.name : value}`);
    }

    const verificationStep = formData.get("verificationStep")?.toString() || "identity";

    // === Upload Business Documents (TIN, Incorporation Cert, etc.) ===
    const businessDocs = {
      tinCertificate: formData.get("tinCertificate") as File | null,
      incorporationCert: formData.get("incorporationCert") as File | null,
      vatCertificate: formData.get("vatCertificate") as File | null,
      ssnitCert: formData.get("ssnitCert") as File | null,
    };

    // Upload all provided business docs in parallel
    const businessUrls = await Promise.all([
      businessDocs.tinCertificate ? uploadToCloudinary(businessDocs.tinCertificate, "business/tin") : null,
      businessDocs.incorporationCert ? uploadToCloudinary(businessDocs.incorporationCert, "business/incorporation") : null,
      businessDocs.vatCertificate ? uploadToCloudinary(businessDocs.vatCertificate, "business/vat") : null,
      businessDocs.ssnitCert ? uploadToCloudinary(businessDocs.ssnitCert, "business/ssnit") : null,
    ]);

    // === Identity Verification (Selfie + ID) ===
    if (verificationStep === "identity") {
      const selfieFile = formData.get("selfie") as File | null;
      const idFile = formData.get("idImage") as File | null;

      if (!selfieFile || !idFile) {
        console.error("❌ [VERIFY ERROR]: Missing selfie or ID for identity verification");
        return NextResponse.json(
          { error: "Selfie and ID are required for identity verification" },
          { status: 400 }
        );
      }

      // Upload selfie and ID
      const [selfieUrl, idUrl] = await Promise.all([
        uploadToCloudinary(selfieFile, "selfies"),
        uploadToCloudinary(idFile, "ids"),
      ]);

      // Extract ID data using OCR (Taggun)
      const ocrResponse = await sendToTaggun(idFile);
      const extractedData = extractIDInfo(ocrResponse);

      // Validate extracted ID data
      const validationResult = validateExtractedData(extractedData);
      if (!validationResult.isValid) {
        console.error("❌ [ID VALIDATION ERROR]:", validationResult.errors);
        return NextResponse.json(
          { error: "Invalid ID document", details: validationResult.errors },
          { status: 422 }
        );
      }

      // Face matching
      const { isMatch, confidence } = await matchFace(selfieUrl, idUrl);
      if (!isMatch) {
        console.error("❌ [FACE MATCH ERROR]: Confidence:", confidence);
        return NextResponse.json(
          { error: "Face does not match ID", confidence },
          { status: 401 }
        );
      }

      return NextResponse.json({
        success: true,
        selfieUrl,
        idUrl,
        extractedData,
        matchConfidence: confidence,
      });
    }

    // === Business Verification (Selfie/ID Optional) ===
    if (verificationStep === "business") {
      const selfieFile = formData.get("selfie") as File | null;
      const idFile = formData.get("idImage") as File | null;

      // Upload selfie/ID if provided (optional)
      const [selfieUrl, idUrl] = await Promise.all([
        selfieFile ? uploadToCloudinary(selfieFile, "selfies") : null,
        idFile ? uploadToCloudinary(idFile, "ids") : null,
      ]);

      return NextResponse.json({
        success: true,
        businessDocuments: {
          tinCertificateUrl: businessUrls[0],
          incorporationCertUrl: businessUrls[1],
          vatCertificateUrl: businessUrls[2],
          ssnitCertUrl: businessUrls[3],
        },
        identityDocuments: {
          selfieUrl,
          idUrl,
        },
      });
    }

    return NextResponse.json(
      { error: "Invalid verification step" },
      { status: 400 }
    );
  } catch (error) {
    console.error("❌ [SERVER ERROR]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper: Upload to Cloudinary
async function uploadToCloudinary(file: File, folder: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

// Helper: Send to Taggun for OCR
async function sendToTaggun(file: File) {
  const form = new FormData();
  form.append("file", Buffer.from(await file.arrayBuffer()), {
    filename: file.name,
    contentType: file.type,
  });

  const { data } = await axios.post(
    "https://api.taggun.io/api/receipt/v1/verbose/file",
    form,
    {
      headers: {
        ...form.getHeaders(),
        apikey: process.env.TAGGUN_API_KEY!,
      },
    }
  );
  return data;
}