import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import sharp from "sharp";

// ========== Constants ==========
const OCR_MAX_RETRIES = 3;
const OCR_TIMEOUT_MS = 60000;
const ABSOLUTE_MIN_SIZE = 20000;
const RECOMMENDED_MIN_SIZE = 50000;
const MAX_IMAGE_SIZE = 5_000_000;
const MIN_REQUIRED_FIELDS = 1;
const FACE_MATCH_THRESHOLD = 80;
const CLOUDINARY_UPLOAD_TIMEOUT = 30000;
const FACEPP_COMPARE_TIMEOUT = 20000;
const ID_KEYWORDS = ["passport", "driver", "license", "identity", "id card", "ghana card", "ecowas"];
const USER_SERVICE_TIMEOUT = 15000;

// ========== Types ==========
interface IDInfo {
  idName: string | null;
  idNumber: string | null;
  personalIdNumber: string | null;
  idDOB: string | null;
  idIssueDate: string | null;
  idExpiryDate: string | null;
  idIssuer: string | null;
  placeOfIssue: string | null;
  rawText: string;
  extractionWarnings: string[];
}

interface VerificationResult {
  success: boolean;
  verification: {
    faceMatch: boolean;
    confidence: number;
    threshold: number;
  };
  document: {
    type: string;
    imageUrl: string;
    selfieUrl: string;
    extractionComplete: boolean;
  } & IDInfo;
}

interface UserRegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirth: string;
  idImageUrl: string;
  selfieImageUrl: string;
}

interface RegistrationResult {
  success: boolean;
  userId?: string;
  error?: string;
}

interface CombinedResponse {
  verification: VerificationResult;
  registration?: RegistrationResult;
}

// ========== Configuration Validator ==========
class ConfigValidator {
  static validate() {
    const requiredEnvVars = [
      'NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME',
      'NEXT_PUBLIC_CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'OCR_SPACE_API_KEY',
      'FACEPP_API_KEY',
      'FACEPP_API_SECRET',
      'USER_SERVICE_URL'
    ];

    const missingVars = requiredEnvVars.filter(key => !process.env[key]);
    if (missingVars.length) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
}

// ========== Cloudinary Service ==========
class CloudinaryService {
  private static initialized = false;

  static initialize() {
    if (!this.initialized) {
      cloudinary.config({
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.initialized = true;
      console.log("Cloudinary initialized successfully");
    }
  }

  static async uploadImage(buffer: Buffer, fileType: string) {
    this.initialize();
    
    const dataURI = `data:${fileType};base64,${buffer.toString("base64")}`;
    try {
      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "face_compare",
        timeout: CLOUDINARY_UPLOAD_TIMEOUT,
        quality_analysis: true,
      });
      console.log(`Upload successful: ${result.secure_url}`);
      return result;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error(`Cloudinary upload failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// ========== Image Processor ==========
class ImageProcessor {
  static validateImage(file: File) {
    if (file.size < ABSOLUTE_MIN_SIZE) {
      throw new Error(`Image too small (${file.size} bytes). Minimum size: ${ABSOLUTE_MIN_SIZE} bytes.`);
    }
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`Image too large (${file.size} bytes). Maximum size: ${MAX_IMAGE_SIZE} bytes.`);
    }
  }

  static async processImage(file: File): Promise<Buffer> {
    this.validateImage(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    
    const optimizationParams = file.size < RECOMMENDED_MIN_SIZE
      ? { width: 1200, sharpenRadius: 2, quality: 95 }
      : { width: 800, sharpenRadius: 1, quality: 85 };

    return sharp(buffer)
      .resize({ width: optimizationParams.width, withoutEnlargement: true })
      .grayscale()
      .normalize()
      .sharpen({ 
        sigma: 1, 
        m1: optimizationParams.sharpenRadius, 
        m2: optimizationParams.sharpenRadius 
      })
      .jpeg({ 
        quality: optimizationParams.quality, 
        mozjpeg: true 
      })
      .toBuffer();
  }
}

// ========== OCR Service ==========
class OCRService {
  static async performOCR(imageBuffer: Buffer): Promise<string> {
    const base64Image = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    const params = new URLSearchParams({
      apikey: process.env.OCR_SPACE_API_KEY!,
      base64Image,
      language: "eng",
      OCREngine: "2",
      isTable: "true",
      detectOrientation: "true",
      scale: "true",
    });

    const response = await axios.post(
      "https://api.ocr.space/parse/image", 
      params, 
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: OCR_TIMEOUT_MS,
      }
    );

    const result = response.data;
    if (result.IsErroredOnProcessing) {
      throw new Error(`OCR Error: ${result.ErrorMessage || result.ErrorDetails || "Unknown error"}`);
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText;
    if (!parsedText || parsedText.trim().length < 10) {
      throw new Error("Insufficient OCR result. Please ensure the image is clear and contains readable text.");
    }

    return parsedText;
  }

  static async performOCRWithRetry(imageBuffer: Buffer): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < OCR_MAX_RETRIES; attempt++) {
      try {
        return await this.performOCR(imageBuffer);
      } catch (error) {
        lastError = error as Error;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error("OCR failed after maximum retries");
  }
}

// ========== Face Comparison Service ==========
class FaceComparisonService {
  static async compareFaces(selfieUrl: string, idUrl: string): Promise<{ confidence: number }> {
    const params = new URLSearchParams({
      api_key: process.env.FACEPP_API_KEY!,
      api_secret: process.env.FACEPP_API_SECRET!,
      image_url1: selfieUrl,
      image_url2: idUrl,
    });

    const response = await axios.post(
      "https://api-us.faceplusplus.com/facepp/v3/compare", 
      params, 
      { timeout: FACEPP_COMPARE_TIMEOUT }
    );

    if (!response.data?.faces1?.length || !response.data?.faces2?.length) {
      throw new Error("No face detected in one or both images.");
    }

    const confidence = Number(response.data?.confidence || 0);
    return { confidence };
  }
}

// ========== User Registration Service ==========
class UserRegistrationService {
  static async registerUser(userData: UserRegistrationData): Promise<RegistrationResult> {
    try {
      const response = await axios.post(
        `${process.env.USER_SERVICE_URL}/register`,
        userData,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: USER_SERVICE_TIMEOUT,
        }
      );

      if (response.data.success) {
        return { 
          success: true, 
          userId: response.data.userId 
        };
      }
      return { 
        success: false, 
        error: response.data.error || "Registration failed" 
      };
    } catch (error: any) {
      console.error("Registration error:", error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || "Registration service unavailable" 
      };
    }
  }

  static extractNames(fullName: string | null): { firstName: string, lastName: string } {
    if (!fullName) return { firstName: '', lastName: '' };
    
    const names = fullName.trim().split(/\s+/);
    if (names.length === 1) return { firstName: names[0], lastName: '' };
    
    const lastName = names.pop() || '';
    const firstName = names.join(' ');
    return { firstName, lastName };
  }
}

// ========== ID Info Extractor ==========
class IDInfoExtractor {
  static cleanText(text: string): string {
    return text
      .replace(/[^\x00-\x7F\r\n]/g, " ")
      .replace(/REPI[\\]?BLIC|REPIBLIC/gi, "REPUBLIC")
      .replace(/[^a-zA-Z0-9\/\-\s]/g, " ")
      .trim();
  }

  static getLines(text: string): string[] {
    return text.split(/\r?\n/)
      .map(this.cleanText)
      .filter(line => line.length > 0);
  }

  static normalizeDate(dateStr: string): string | null {
    try {
      const cleaned = dateStr.replace(/[^\d\/\-.]/g, '');
      const parts = cleaned.split(/[\/\-\.]/).map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) return null;
      
      const [a, b, c] = parts;
      if (a > 1900) return `${a}-${b.toString().padStart(2, '0')}-${c.toString().padStart(2, '0')}`;
      if (c > 1900) return `${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
      return `20${c}-${b.toString().padStart(2, '0')}-${a.toString().padStart(2, '0')}`;
    } catch {
      return null;
    }
  }

  static logFieldSummary(idInfo: IDInfo): void {
    console.log("📋 Final Field Extraction Summary:");
    const fields = [
      ["Name", idInfo.idName],
      ["ID Number", idInfo.idNumber],
      ["DOB", idInfo.idDOB],
      ["Issue Date", idInfo.idIssueDate],
      ["Expiry Date", idInfo.idExpiryDate],
      ["Issuer", idInfo.idIssuer],
      ["Place of Issue", idInfo.placeOfIssue],
    ];
    
    fields.forEach(([label, value]) => {
      console.log(`${label.padEnd(15)}: ${value || "NOT FOUND"}`);
    });
  }

  static extractIDInfo(text: string): IDInfo {
    const lines = this.getLines(text);
    const warnings: string[] = [];

    console.log("🧾 OCR Lines:");
    lines.forEach(line => console.log("•", line));

    // Name extraction
    const name = lines.find(line => 
      /name|surname/i.test(line) || /^[A-Z\s]{8,}$/.test(line)
    ) || null;

    // ID Number extraction
    const idNumber = lines.map(line => 
      line.match(/\b([A-Z0-9]{6,})\b/)?.[1]
    ).find(Boolean) || null;

    // Date extraction
    const dates = lines
      .flatMap((line, idx) =>
        [...line.matchAll(/\b\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g)]
          .map(match => ({ date: match[0], line, idx }))
      )
      .sort((a, b) => a.idx - b.idx);

    const idDOB = this.normalizeDate(dates[0]?.date || "");
    const idIssueDate = this.normalizeDate(dates[1]?.date || "");
    const idExpiryDate = this.normalizeDate(dates.at(-1)?.date || "");

    // Issuer information
    const idIssuer = lines.find(line =>
      /republic|authority/i.test(line)
    ) || null;

    // Place of issue
    const placeOfIssue = lines.find(line =>
      /issue.*(accra|kumasi|tamale|cape coast|takoradi)/i.test(line)
    ) || null;

    // Field validation warnings
    if (!name) warnings.push("Name not found");
    if (!idNumber) warnings.push("ID number not found");
    if (!idDOB) warnings.push("DOB not found");
    if (!idIssuer) warnings.push("Issuer not found");
    if (!placeOfIssue) warnings.push("Place of issue not found");

    const extractedInfo: IDInfo = {
      idName: name,
      idNumber,
      personalIdNumber: null,
      idDOB,
      idIssueDate,
      idExpiryDate,
      idIssuer,
      placeOfIssue,
      rawText: text,
      extractionWarnings: warnings,
    };

    this.logFieldSummary(extractedInfo);
    return extractedInfo;
  }
}

// ========== Main API ==========
export async function POST(req: Request): Promise<NextResponse<CombinedResponse | { error: string }>> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log(`🔍 [${requestId}] Starting verification and registration process`);

  try {
    // Validate configuration first
    ConfigValidator.validate();

    // Parse form data
    const formData = await req.formData();
    const selfie = formData.get("selfieImage") as File;
    const idImage = formData.get("idImage") as File;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!selfie || !idImage || !email || !password) {
      console.error(`❌ [${requestId}] Missing required fields`);
      return NextResponse.json(
        { error: "All fields (selfie, ID image, email, password) are required." }, 
        { status: 400 }
      );
    }

    // Process images
    const [selfieBuffer, idBuffer] = await Promise.all([
      ImageProcessor.processImage(selfie),
      ImageProcessor.processImage(idImage),
    ]);

    // Upload to Cloudinary
    const [selfieUpload, idUpload] = await Promise.all([
      CloudinaryService.uploadImage(selfieBuffer, selfie.type),
      CloudinaryService.uploadImage(idBuffer, idImage.type),
    ]);

    // Perform OCR on ID image
    const ocrText = await OCRService.performOCRWithRetry(idBuffer);

    // Validate ID document type
    const isLikelyID = ID_KEYWORDS.some(keyword => 
      ocrText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (!isLikelyID) {
      console.warn(`⚠️ [${requestId}] OCR output may not be from a valid ID document`);
    }

    // Extract ID information
    const extractedInfo = IDInfoExtractor.extractIDInfo(ocrText);

    // Validate minimum required fields
    const validFields = [
      extractedInfo.idName, 
      extractedInfo.idNumber, 
      extractedInfo.idDOB
    ].filter(Boolean).length;
    
    if (validFields < MIN_REQUIRED_FIELDS) {
      console.error(`❌ [${requestId}] Insufficient ID information extracted`);
      return NextResponse.json(
        { error: "Could not extract sufficient information from the ID document." }, 
        { status: 400 }
      );
    }

    // Compare faces
    const { confidence } = await FaceComparisonService.compareFaces(
      selfieUpload.secure_url, 
      idUpload.secure_url
    );
    const faceMatch = confidence >= FACE_MATCH_THRESHOLD;

    // Create verification result
    const verificationResult: VerificationResult = {
      success: true,
      verification: { 
        faceMatch, 
        confidence, 
        threshold: FACE_MATCH_THRESHOLD 
      },
      document: {
        type: "ID",
        imageUrl: idUpload.secure_url,
        selfieUrl: selfieUpload.secure_url,
        extractionComplete: extractedInfo.extractionWarnings.length === 0,
        ...extractedInfo,
      },
    };

    // Only proceed with registration if verification succeeded
    if (!faceMatch) {
      console.error(`❌ [${requestId}] Face verification failed`);
      return NextResponse.json({
        verification: {
          ...verificationResult,
          success: false
        },
        error: "Face verification failed. Please ensure your selfie matches your ID photo."
      }, { status: 400 });
    }

    // Prepare registration data
    const { firstName, lastName } = UserRegistrationService.extractNames(extractedInfo.idName);
    const registrationData: UserRegistrationData = {
      email,
      password,
      firstName,
      lastName,
      idNumber: extractedInfo.idNumber || '',
      dateOfBirth: extractedInfo.idDOB || '',
      idImageUrl: idUpload.secure_url,
      selfieImageUrl: selfieUpload.secure_url
    };

    // Register user
    const registrationResult = await UserRegistrationService.registerUser(registrationData);
    
    if (!registrationResult.success) {
      console.error(`❌ [${requestId}] Registration failed: ${registrationResult.error}`);
      return NextResponse.json({
        verification: verificationResult,
        registration: registrationResult
      }, { status: 400 });
    }

    // Log completion
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ [${requestId}] Verification and registration completed in ${duration}s`);

    // Return successful response
    return NextResponse.json({
      verification: verificationResult,
      registration: registrationResult
    });

  } catch (error: any) {
    console.error(`❌ [${requestId}] Error:`, error);
    const statusCode = error.message.includes("Missing required") ? 500 : 400;
    const errorMessage = error.message || "An unexpected error occurred during verification";
    
    return NextResponse.json(
      { error: errorMessage }, 
      { status: statusCode }
    );
  }
}