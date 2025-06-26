import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";

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
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
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
      match: confidence >= 86,
    });

  } catch (error: any) {
    let errorMessage = "Face verification failed. Please try again.";
    let statusCode = 500;

    if (axios.isAxiosError(error)) {
      const faceppError = error.response?.data?.error_message;

      if (faceppError?.includes("IMAGE_FILE_TOO_LARGE")) {
        errorMessage = "One of the images is too large. Please upload an image smaller than 2MB.";
        statusCode = 413; // 413 Payload Too Large
      } else if (faceppError) {
        errorMessage = `Verification error: ${faceppError}`;
        statusCode = 400;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}
