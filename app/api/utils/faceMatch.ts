import axios from "axios";

export async function matchFace(
  imageUrl1: string,
  imageUrl2: string
): Promise<{ confidence: number; isMatch: boolean }> {
  const apiKey = process.env.FACEPP_API_KEY!;
  const apiSecret = process.env.FACEPP_API_SECRET!;

  const endpoint = "https://api-us.faceplusplus.com/facepp/v3/compare";

  try {
    const response = await axios.post(endpoint, null, {
      params: {
        api_key: apiKey,
        api_secret: apiSecret,
        image_url1: imageUrl1,
        image_url2: imageUrl2,
      },
    });

    const { confidence } = response.data;
    const isMatch = confidence >= 80;

    return { confidence, isMatch };
  } catch (error: any) {
    console.error("Face++ comparison failed:", error?.response?.data || error.message);
    throw new Error("Face comparison failed");
  }
}
