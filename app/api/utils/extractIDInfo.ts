interface IDInfo {
  idName: string | null;
  idNumber: string | null;
  idDOB: string | null;
  idIssueDate: string | null;
  idExpiryDate: string | null;
  idIssuer: string | null;
  personalIdNumber: string | null;
  gender: string | null;
  nationality: string | null;
  idType: string | null;
  rawText: string;
}

interface OCRData {
  text?: {
    text?: string;
  };
}

export function extractIDInfo(data: OCRData): IDInfo {
  console.log("⚙️ [ID Extraction]: Starting ID info extraction from OCR response.");

  const rawText = data?.text?.text;
  if (typeof rawText !== "string") {
    console.error("❌ [ID Extraction]: OCR text is not a string:", rawText);
    return createEmptyResult("");
  }

  const lines = rawText
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
  const fullText = lines.join(" ");
  const lowerText = fullText.toLowerCase();

  console.log("📜 [ID Extraction]: Full text for processing:", fullText);

  try {
    const result = extractIDData(fullText, lowerText, rawText);
    console.log("✅ [ID Extraction]: Finished with parsed result:", result);
    return result;
  } catch (error) {
    console.error("❌ [ID Extraction]: Error during extraction:", error);
    return createEmptyResult(rawText);
  }
}

function createEmptyResult(rawText: string): IDInfo {
  return {
    idName: null,
    idNumber: null,
    idDOB: null,
    idIssueDate: null,
    idExpiryDate: null,
    idIssuer: null,
    personalIdNumber: null,
    gender: null,
    nationality: null,
    idType: null,
    rawText,
  };
}

function extractIDData(fullText: string, lowerText: string, rawText: string): IDInfo {
  // Extract basic information
  const surname = extractMatch(fullText, /Surname\/Nom\s+([A-Z\s]+)/i);
  const firstnames = extractMatch(fullText, /Firstnames\/Prénoms\s+([A-Z\s]+)/i);
  const idName = buildFullName(firstnames, surname);
  
  console.log(`🧾 [ID Extraction]: Name => "${idName}"`);

  // Extract dates
  const idDOB = parseDate(extractMatch(fullText, /Date of Birth.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i));
  const idIssueDate = parseDate(extractMatch(fullText, /Date of Issuance.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i));
  const idExpiryDate = parseDate(extractMatch(fullText, /Date of Expiry.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i));

  // Extract document numbers and identifiers
  const idNumber = extractDocumentNumber(fullText);
  const idIssuer = extractIssuer(fullText);
  const personalIdNumber = extractMatch(fullText, /\b(GHA-\d{12})\b/);
  
  // Extract personal details
  const gender = extractMatch(fullText, /Sex\/Sexe\s+([MF])\b/i);
  const nationality = extractMatch(fullText, /Nationality\/Nationalité\s+([A-Z]+)/i);

  // Infer document type
  const idType = inferDocumentType(lowerText);

  return {
    idName,
    idNumber,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer,
    personalIdNumber,
    gender,
    nationality,
    idType,
    rawText,
  };
}

function parseDate(dateString: string | null): string | null {
  if (!dateString) return null;
  
  const match = dateString.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
  if (!match) {
    console.warn(`⚠️ [ID Extraction - Date]: Failed to parse date from: "${dateString}"`);
    return null;
  }
  
  const [, dd, mm, yyyy] = match;
  
  // Basic validation
  const day = parseInt(dd, 10);
  const month = parseInt(mm, 10);
  const year = parseInt(yyyy, 10);
  
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
    console.warn(`⚠️ [ID Extraction - Date]: Invalid date values: ${dd}/${mm}/${yyyy}`);
    return null;
  }
  
  return `${yyyy}-${mm}-${dd}`;
}

function extractMatch(text: string, regex: RegExp): string | null {
  const match = text.match(regex);
  return match ? match[1]?.trim() || null : null;
}

function buildFullName(firstnames: string | null, surname: string | null): string | null {
  const parts = [firstnames, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function extractDocumentNumber(fullText: string): string | null {
  // Try specific document number patterns first
  const patterns = [
    /Document Number.*?([A-Z0-9]+)/i,
    /Passport No.*?([A-Z0-9]+)/i,
    /License No.*?([A-Z0-9]+)/i,
    /Card No.*?([A-Z0-9]+)/i,
    /([A-Z]{2}[0-9]{7,})/,  // Ghana card pattern
    /([A-Z][0-9]{7,})/      // General pattern
  ];
  
  for (const pattern of patterns) {
    const match = extractMatch(fullText, pattern);
    if (match && match.length >= 6) { // Minimum reasonable length
      return match;
    }
  }
  
  return null;
}

function extractIssuer(fullText: string): string | null {
  // Try specific issuer patterns
  const patterns = [
    /Place of Issuance.*?([A-Z\s]+)/i,
    /Issued by.*?([A-Z\s]+)/i,
    /Issuing Authority.*?([A-Z\s]+)/i,
    /\b(ACCRA|KUMASI|TAKORADI|TAMALE|CAPE COAST|SUNYANI|BOLGATANGA|HO|KOFORIDUA|WA)\b/i
  ];
  
  for (const pattern of patterns) {
    const match = extractMatch(fullText, pattern);
    if (match) {
      return match;
    }
  }
  
  return null;
}

function inferDocumentType(lowerText: string): string | null {
  const typeMap = [
    { keywords: ["ghana card", "identity card", "national id"], type: "ghana_card" },
    { keywords: ["passport"], type: "passport" },
    { keywords: ["driver", "license", "driving"], type: "driver_license" },
    { keywords: ["voter", "voting"], type: "voter_id" },
    { keywords: ["student"], type: "student_id" }
  ];
  
  for (const { keywords, type } of typeMap) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return type;
    }
  }
  
  return null;
}