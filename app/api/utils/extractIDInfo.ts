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
    const result = extractIDData(fullText, lowerText, rawText, lines);
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

function extractIDData(fullText: string, lowerText: string, rawText: string, lines: string[]): IDInfo {
  // Extract names using line-by-line approach for better accuracy
  const { surname, firstnames } = extractNames(lines, fullText);
  const idName = buildFullName(firstnames, surname);
  
  console.log(`🧾 [ID Extraction]: Name => "${idName}"`);

  // Extract dates with multiple patterns
  const idDOB = extractDate(fullText, [
    /Date of Birth.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /Date de Naissance.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{2}\/\d{2}\/\d{4})/g // Fallback for any date pattern
  ]);
  
  const idIssueDate = extractDate(fullText, [
    /Date of Issuance.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /Date d'émission.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{2}\/01\/\d{4})/g // Common issuance pattern
  ]);
  
  const idExpiryDate = extractDate(fullText, [
    /Date of Expiry.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /Date d'expiration.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{2}\/01\/\d{4})/g // Common expiry pattern
  ]);

  // Extract document numbers with better patterns
  const idNumber = extractDocumentNumber(fullText, lines);
  const personalIdNumber = extractPersonalIdNumber(fullText);
  
  // Extract issuer
  const idIssuer = extractIssuer(fullText, lines);
  
  // Extract personal details
  const gender = extractGender(fullText, lines);
  const nationality = extractNationality(fullText, lines);

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

function extractNames(lines: string[], fullText: string): { surname: string | null; firstnames: string | null } {
  let surname: string | null = null;
  let firstnames: string | null = null;
  
  // Method 1: Look for lines after Surname/Nom and Firstnames/Prénoms
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Handle both "Surname/Nom" and "Surname Nom" patterns
    if (line.match(/Surname[\s\/]+Nom/i) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.match(/Firstnames|Prénoms/i)) {
        surname = nextLine.trim();
      }
    }
    
    if (line.match(/Firstnames\/Prénoms/i) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.match(/Previous|Précédents/i)) {
        firstnames = nextLine.trim();
      }
    }
  }
  
  // Method 2: Extract from same line patterns
  if (!surname) {
    const surnamePatterns = [
      /Surname\/Nom\s+([A-Z]+)/i,
      /Surname\s+Nom\s+([A-Z]+)/i
    ];
    
    for (const pattern of surnamePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        surname = match[1];
        break;
      }
    }
  }
  
  if (!firstnames) {
    const firstnamesMatch = fullText.match(/Firstnames\/Prénoms\s+([A-Z]+)/i);
    if (firstnamesMatch) firstnames = firstnamesMatch[1];
  }
  
  return { surname, firstnames };
}

function extractDate(fullText: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      // For global patterns, get the first match
      const dateString = Array.isArray(matches) ? matches[1] || matches[0] : matches[1];
      const parsed = parseDate(dateString);
      if (parsed) return parsed;
    }
  }
  return null;
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

function extractPersonalIdNumber(fullText: string): string | null {
  const patterns = [
    // Pattern for "Personal ID Number ... GHA-1234567890" - captures full GHA-number
    /Personal ID Number[^G]*(GHA-[0-9]{10,12})/i,
    // Direct pattern for GHA-numbers - captures full GHA-number
    /\b(GHA-[0-9]{10,12})\b/g,
    // Fallback pattern for any GHA- followed by numbers - captures full GHA-number
    /(GHA-[0-9]+)/gi
  ];
  
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match) {
      const idNumber = match[1];
      
      // Add null check and ensure it's a string
      if (idNumber && typeof idNumber === 'string') {
        // The idNumber should already have GHA- prefix, so just return it
        return idNumber;
      }
    }
  }
  
  return null;
}

function extractDocumentNumber(fullText: string, lines: string[]): string | null {
  // Method 1: Look for lines after Document Number
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/Document Number/i) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.match(/^[A-Z0-9]+$/)) {
        return nextLine.trim();
      }
    }
  }
  
  // Method 2: Extract from patterns in full text
  const patterns = [
    /Document Number[^\w]*([A-Z0-9]{6,})/i,
    /numéro du document[^\w]*([A-Z0-9]{6,})/i,
    /^([A-Z]{2}[0-9]{6,})$/m, // Ghana card pattern like AJ6235360
    /\b([A-Z]{1,3}[0-9]{6,})\b/g // General alphanumeric pattern
  ];
  
  for (const pattern of patterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      const docNumber = matches[1];
      if (docNumber && typeof docNumber === 'string' && docNumber.length >= 6 && docNumber.length <= 20) {
        return docNumber;
      }
    }
  }
  
  return null;
}
function extractIssuer(fullText: string, lines: string[]): string | null {
  // Method 1: Look for lines after Place of Issuance
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/Place of Issuance/i) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (nextLine && nextLine.match(/^[A-Z\s]+$/)) {
        return nextLine.trim();
      }
    }
  }
  
  // Method 2: Extract from patterns
  const patterns = [
    /Place of Issuance[^\w]*([A-Z\s]+)/i,
    /Lieu de délivrance[^\w]*([A-Z\s]+)/i,
    /\b(ACCRA|KUMASI|TAKORADI|TAMALE|CAPE COAST|SUNYANI|BOLGATANGA|HO|KOFORIDUA|WA)\b/i
  ];
  
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractGender(fullText: string, lines: string[]): string | null {
  // Look for M or F after Sex/Sexe
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/Sex\/Sexe/i)) {
      // Check same line first
      const sameLineMatch = line.match(/Sex\/Sexe\s+([MF])/i);
      if (sameLineMatch) return sameLineMatch[1].toUpperCase();
      
      // Check next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        // Handle "GHANAIAN M" pattern
        const nextLineMatch = nextLine.match(/^(?:GHANAIAN\s+)?([MF])$/i) || nextLine.match(/([MF])$/i);
        if (nextLineMatch) return nextLineMatch[1].toUpperCase();
      }
    }
  }
  
  // Look for pattern in full text - handle "GHANAIAN M" pattern
  const patterns = [
    /Sex\/Sexe\s+[A-Z\s]*([MF])\b/i,
    /GHANAIAN\s+([MF])\b/i, // Common pattern in Ghana cards
    /Nationality\/Nationalité\s+Sex\/Sexe\s+GHANAIAN\s+([MF])/i // Handle concatenated pattern
  ];
  
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }
  
  return null;
}

function extractNationality(fullText: string, lines: string[]): string | null {
  // Look for lines after Nationality/Nationalité
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/Nationality\/Nationalité/i)) {
      // Check same line first - handle "Nationality/Nationalité Sex/Sexe"
      if (line.includes('Sex/Sexe')) {
        // This means nationality and sex are on same line, look for next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          // Extract nationality from "GHANAIAN M" pattern
          const nationalityMatch = nextLine.match(/^([A-Z]+)\s+[MF]$/i);
          if (nationalityMatch) return nationalityMatch[1];
        }
      } else {
        // Normal case - nationality on next line
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          if (nextLine && nextLine.match(/^[A-Z]+$/)) {
            return nextLine.trim();
          }
        }
      }
    }
  }
  
  // Extract from patterns in full text
  const patterns = [
    /Nationality\/Nationalité\s+([A-Z]+)/i,
    /Nationality\/Nationalité\s+Sex\/Sexe\s+([A-Z]+)\s+[MF]/i, // Handle concatenated pattern
    /\b(GHANAIAN)\b/i // Common nationality
  ];
  
  for (const pattern of patterns) {
    const match = fullText.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return null;
}

function buildFullName(firstnames: string | null, surname: string | null): string | null {
  const parts = [firstnames, surname].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function inferDocumentType(lowerText: string): string | null {
  const typeMap = [
    { keywords: ["ghana card", "identity card", "national id", "ecowas"], type: "ghana_card" },
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