import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import axios from "axios";
import sharp from "sharp";

cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

function cleanText(text: string): string {
  return text
    .replace(/[^\x00-\x7F\r\n]/g, " ")
    .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
    .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
    .trim();
}

function getLines(text: string): string[] {
  return text.split(/\r?\n/).map(line => cleanText(line)).filter(line => line.length > 0);
}

function extractName(lines: string[]): string | null {
  let surname = null;
  let firstname = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();

    if ((line.includes('surname') || line.includes('nom')) && !surname && i + 1 < lines.length) {
      surname = lines[i + 1].trim();
      i++;
    }

    if ((line.includes('firstname') || line.includes('prénom') || line.includes('firstnames/prénoms')) && !firstname && i + 1 < lines.length) {
      firstname = lines[i + 1].trim();
      i++;
    }
  }

  if (surname && firstname) {
    return `${surname} ${firstname}`.replace(/\s+/g, ' ').trim();
  }

  for (const line of lines) {
    if (line.match(/^[A-Z][a-zA-Z-]+ [A-Z][a-zA-Z-]+$/) &&
        line.length > 5 && line.length < 30 &&
        !line.match(/number|date|id|card|ghana|ecowas|republic|expiry|issue|place|nationality|sex/i)) {
      return line.trim();
    }
  }

  return null;
}

function extractDates(lines: string[]): { date: string, line: string, index: number }[] {
  const datePatterns = [
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/g,
    /(\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g
  ];

  const allDates: { date: string, line: string, index: number }[] = [];

  lines.forEach((line, index) => {
    datePatterns.forEach(pattern => {
      const matches = line.match(pattern);
      if (matches) {
        matches.forEach(match => {
          if (match.length >= 8) {
            allDates.push({ date: match.trim(), line, index });
          }
        });
      }
    });
  });

  return allDates;
}

function normalizeDate(dateStr: string): Date {
  const parts = dateStr.split(/[\/\-\.]/).map(p => p.trim());
  if (parts.length === 3) {
    let [day, month, year] = parts;

    if (year.length === 2) {
      year = parseInt(year) > 30 ? `19${year}` : `20${year}`;
    }

    return new Date(`${year}-${month}-${day}`);
  }
  return new Date(dateStr);
}

function extractIDNumber(lines: string[]): string | null {
  const patterns = [
    /(GHA[\- ]?[A-Z0-9]{7,})/i,
    /([A-Z]{2}\d{6,})/,
    /(\d{6,}[A-Z]{0,2})/
  ];

  const idKeywords = ['id number', 'document', 'card no', 'number'];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (idKeywords.some(keyword => line.includes(keyword))) {
      const searchLines = [lines[i], lines[i + 1]].filter(Boolean);
      for (const searchLine of searchLines) {
        for (const pattern of patterns) {
          const match = searchLine.match(pattern);
          if (match) return match[0];
        }
      }
    }
  }

  const fullText = lines.join(' ');
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match) return match[0];
  }

  return null;
}

function extractPlaceOfIssue(lines: string[]): string | null {
  const placeKeywords = ['place', 'issued', 'lieu'];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (placeKeywords.some(keyword => line.includes(keyword))) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.match(/^[A-Z]{2,}$/)) {
        return nextLine;
      }
      const placeMatch = line.match(/accra|kumasi|tema|cape coast|takoradi/i);
      if (placeMatch) return placeMatch[0].toUpperCase();
    }
  }

  for (const line of lines) {
    if (line === 'ACCRA') return line;
  }

  return null;
}

function extractIDInfo(parsedText: string) {
  const lines = getLines(parsedText);
  const allDates = extractDates(lines);

  const sortedDates = allDates.sort((a, b) => {
    const dateA = normalizeDate(a.date);
    const dateB = normalizeDate(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  return {
    idName: extractName(lines),
    idNumber: extractIDNumber(lines),
    idDOB: sortedDates[0]?.date || null,
    idIssueDate: sortedDates[1]?.date || null,
    idExpiryDate: sortedDates[sortedDates.length - 1]?.date || null,
    idIssuer: /REPUBLIC OF GHANA/i.test(parsedText) ? "Republic of Ghana" : null,
    placeOfIssue: extractPlaceOfIssue(lines),
    rawText: parsedText
  };
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const id = formData.get("idImage") as File;

    if (!selfie || !id) {
      return NextResponse.json({ error: "Both selfie and ID image are required." }, { status: 400 });
    }

    if (
      !(selfie.type?.startsWith("image/")) ||
      !(id.type?.startsWith("image/")) ||
      selfie.size > 5 * 1024 * 1024 ||
      id.size > 5 * 1024 * 1024
    ) {
      return NextResponse.json({ error: "Invalid image files. Must be <5MB." }, { status: 400 });
    }

    const uploadFile = async (file: File): Promise<{ secure_url: string }> => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const optimizedBuffer = await sharp(buffer)
        .resize({ width: 800 })
        .grayscale()
        .normalize()
        .jpeg({ quality: 85 })
        .toBuffer();

      const dataURI = `data:${file.type};base64,${optimizedBuffer.toString("base64")}`;
      return await cloudinary.v2.uploader.upload(dataURI, {
        folder: "face_compare",
        timeout: 30000
      });
    };

    const [selfieUpload, idUpload] = await Promise.all([
      uploadFile(selfie),
      uploadFile(id)
    ]);

    const idBuffer = Buffer.from(await id.arrayBuffer());
    const base64Image = `data:image/jpeg;base64,${await sharp(idBuffer)
      .resize({ width: 800 })
      .grayscale()
      .normalize()
      .jpeg({ quality: 85 })
      .toBuffer()
      .then(b => b.toString("base64"))}`;

    const ocrRes = await axios.post(
      "https://api.ocr.space/parse/image",
      new URLSearchParams({
        apikey: process.env.OCR_SPACE_API_KEY!,
        base64Image,
        language: "eng",
        OCREngine: "2"
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 20000 }
    );

    if (!ocrRes.data?.ParsedResults?.[0]?.ParsedText) {
      return NextResponse.json({ error: "Could not extract text from ID. Please try a clearer image." }, { status: 400 });
    }

    const parsedText = ocrRes.data.ParsedResults[0].ParsedText;

    const idKeywords = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
    if (!idKeywords.some(keyword => parsedText.toLowerCase().includes(keyword))) {
      return NextResponse.json({ error: "The uploaded image doesn't appear to be a valid ID document." }, { status: 400 });
    }

    const extractedInfo = extractIDInfo(parsedText);

    if (!extractedInfo.idName || !extractedInfo.idNumber || !extractedInfo.idDOB) {
      return NextResponse.json({ error: "Could not extract required ID information." }, { status: 400 });
    }

    const dob = normalizeDate(extractedInfo.idDOB);
    const age = new Date().getFullYear() - dob.getFullYear();
    if (age < 15 || age > 100) {
      return NextResponse.json({ error: "ID date of birth seems invalid." }, { status: 400 });
    }

    const faceRes = await axios.post(
      "https://api-us.faceplusplus.com/facepp/v3/compare",
      new URLSearchParams({
        api_key: process.env.FACEPP_API_KEY!,
        api_secret: process.env.FACEPP_API_SECRET!,
        image_url1: selfieUpload.secure_url,
        image_url2: idUpload.secure_url,
        return_landmark: "0",
        return_attributes: "none"
      }),
      { timeout: 15000 }
    );

    if (!faceRes.data?.faces1?.[0] || !faceRes.data?.faces2?.[0]) {
      return NextResponse.json({ error: "Could not detect faces in one or both images." }, { status: 400 });
    }

    const matchThreshold = 80;
    let confidence = 0;

    try {
      confidence = Number(faceRes.data.confidence) || 0;
    } catch (_) {}

    return NextResponse.json({
      success: true,
      verification: {
        faceMatch: confidence >= matchThreshold,
        confidence: parseFloat(confidence.toFixed(2)),
        threshold: matchThreshold
      },
      document: {
        type: "ID",
        imageUrl: idUpload.secure_url,
        ...extractedInfo
      },
      selfie: {
        imageUrl: selfieUpload.secure_url
      }
    });

  } catch (error: any) {
    console.error("Verification error:", error);
    const errorMessage = error instanceof Error ? error.message : "Verification failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
