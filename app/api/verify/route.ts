import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";

// === Debug Env Variables ===
console.log("✅ CLOUD_NAME:", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
console.log("✅ API_KEY:", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY);
console.log("✅ API_SECRET defined:", !!process.env.CLOUDINARY_API_SECRET);
console.log("✅ FACEPP_API_KEY defined:", !!process.env.FACEPP_API_KEY);
console.log("✅ FACEPP_API_SECRET defined:", !!process.env.FACEPP_API_SECRET);

// === Fail Fast If Missing ===
if (
  !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  !process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET ||
  !process.env.FACEPP_API_KEY ||
  !process.env.FACEPP_API_SECRET
) {
  throw new Error("❌ Missing one or more required environment variables.");
}

cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      return NextResponse.json({ error: "Both images are required." }, { status: 400 });
    }

    const uploadFile = async (file: File) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const dataURI = `data:${file.type};base64,${base64}`;
      console.log("⬆ Uploading to Cloudinary...");

      const upload = await cloudinary.v2.uploader.upload(dataURI, {
        folder: "face_compare",
      });

      console.log("✅ Uploaded:", upload.secure_url);
      return upload.secure_url;
    };

    const selfieUrl = await uploadFile(selfie);
    const idUrl = await uploadFile(id);

    console.log("🔁 Sending to Face++:", { selfieUrl, idUrl });

    const faceRes = await axios.post(
      "https://api-us.faceplusplus.com/facepp/v3/compare",
      new URLSearchParams({
        api_key: process.env.FACEPP_API_KEY!,
        api_secret: process.env.FACEPP_API_SECRET!,
        image_url1: selfieUrl,
        image_url2: idUrl,
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const confidence = faceRes.data?.confidence ?? 0;

    console.log("🎯 Face++ Result:", faceRes.data);

    return NextResponse.json({
      confidence,
      selfieUrl,
      idUrl,
      match: confidence >= 86,
    });

  } catch (error: any) {
    console.error("🔴 Face Verification Error:");

    if (axios.isAxiosError(error)) {
      console.error("🔻 Axios Error Message:", error.message);
      console.error("🔻 Axios Response Data:", error.response?.data);
      console.error("🔻 Axios Status:", error.response?.status);
    } else if (error instanceof Error) {
      console.error("🔻 General Error:", error.message);
    } else {
      console.error("🔻 Unknown Error:", error);
    }

    return NextResponse.json(
      {
        error: "Verification failed",
        detail: axios.isAxiosError(error)
          ? error.response?.data || error.message
          : error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
