import { NextResponse } from "next/server";
const cloudinary = require("cloudinary").v2;
import axios, { AxiosError } from "axios"; // Import AxiosError
import FormData from "form-data";
import { Readable } from "stream";
import { validateExtractedData } from "../utils/idValidation";
import { createUserIfNeeded } from "../utils/conditionalRegistration";
import { extractIDInfo } from "../utils/extractIDInfo";
import { matchFace } from "../utils/faceMatch";
import { getServerSession } from "next-auth"; // Import getServerSession
import { authOptions } from "@/app/auth/authOptions"; // Import authOptions
import { UserRole } from "@prisma/client"; // Import UserRole

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
    const oauthName = formData.get("name")?.toString() || null; // Capture name from OAuth if available
    const oauthContactPhone = formData.get("contactPhone")?.toString() || null; // Capture phone from OAuth if available

    // Get session to check if it's an authenticated Google user
    const session = await getServerSession(authOptions);
    const isGoogleAuth = !!(session?.user?.email && session.user.email === oauthEmail);


    if (!selfieFile || !idFile) {
      console.error("❌ [VERIFY ERROR]: Missing selfie or ID file.");
      return NextResponse.json({ error: "Missing files" }, { status: 400 });
    }

    // === Upload files to Cloudinary ===
    console.log("⚙️ [VERIFY]: Uploading files to Cloudinary...");
    const [selfieUrl, idUrl] = await Promise.all([
      uploadToCloudinary(selfieFile, "selfies"),
      uploadToCloudinary(idFile, "ids"),
    ]);
    console.log(`✅ [VERIFY]: Cloudinary uploads complete. Selfie: ${selfieUrl}, ID: ${idUrl}`);


    // === Send to Taggun ===
    console.log("⚙️ [VERIFY]: Sending ID image to Taggun for OCR...");
    const ocrResponse = await sendOriginalToTaggun(idFile);
    console.log("✅ [VERIFY]: Taggun OCR response received.");


    const extractedData = extractIDInfo(ocrResponse);
    console.log("⚙️ [VERIFY]: Extracted ID info:", extractedData);

    const validationResult = validateExtractedData(extractedData); // Use the new validation function
    if (!validationResult.isValid) {
      console.error("❌ [VERIFY ERROR]: Invalid ID document. Errors:", validationResult.errors);
      return NextResponse.json({
        error: "Invalid ID document",
        details: validationResult.errors,
      }, { status: 422 });
    }
    console.log("✅ [VERIFY]: ID document validation successful.");


    // === Face Comparison ===
    console.log("⚙️ [VERIFY]: Performing face comparison...");
    const matchResult = await matchFace(selfieUrl, idUrl);
    console.log(`✅ [VERIFY]: Face comparison complete. Match: ${matchResult.isMatch}, Confidence: ${matchResult.confidence}`);

    if (!matchResult.isMatch) {
      console.error("❌ [VERIFY ERROR]: Face does not match ID.");
      return NextResponse.json({
        error: "Face does not match ID",
        confidence: matchResult.confidence,
      }, { status: 401 });
    }

    // === Conditional User Creation/Update ===
    // This block handles the final registration/update for PROVIDERs after all checks pass.
    if (shouldRegister && oauthEmail && role === "PROVIDER") {
      console.log("⚙️ [VERIFY]: shouldRegister is true for PROVIDER. Creating/updating user record.");
      const user = await createUserIfNeeded({
        email: oauthEmail,
        name: oauthName || extractedData.idName || undefined, // Use OAuth name, then extracted name, then undefined
        contactPhone: oauthContactPhone || undefined, // Use OAuth phone if available
        role: role as UserRole, // Ensure role is UserRole enum type
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
        verified: true, // Mark as verified after successful process
      });

      console.log("✅ [VERIFY]: User record created/updated successfully for PROVIDER.");
      return NextResponse.json({
        success: true,
        verified: true,
        user,
        selfieUrl,
        imageUrl: idUrl,
        extractedData,
      });
    }

    // If not a PROVIDER registration, or not shouldRegister, return verification results
    console.log("✅ [VERIFY]: Verification successful. Returning data without user creation/update.");
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
    // --- MODIFIED ERROR LOGGING ---
    console.error("❌ [VERIFY ERROR]: An error occurred during verification.");
    if (axios.isAxiosError(err)) {
      // Log Axios-specific error details
      console.error("  Axios Error Details:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        headers: err.response?.headers,
        config: err.config, // Request configuration
      });
    } else if (err instanceof Error) {
      // Log standard Error object details
      console.error("  Standard Error Details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
      });
    } else {
      // Log anything else
      console.error("  Unknown Error Type:", err);
    }
    // --- END MODIFIED ERROR LOGGING ---

    // Return a generic error response to the client
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
