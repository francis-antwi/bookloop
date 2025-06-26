import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";

// === Fail Fast If Missing ===
if (
  !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  !process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
  !process.env.CLOUDINARY_API_SECRET ||
  !process.env.FACEPP_API_KEY ||
  !process.env.FACEPP_API_SECRET
) {
  throw new Error("Missing one or more required environment variables.");
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
      const upload = await cloudinary.v2.uploader.upload(dataURI, {
        folder: "face_compare",
      });
      return upload.secure_url;
    };

    const selfieUrl = await uploadFile(selfie);
    const idUrl = await uploadFile(id);

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

    return NextResponse.json({
      confidence,
      selfieUrl,
      idUrl,
      match: confidence >= 80,
    });

  } catch (error: any) {
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
