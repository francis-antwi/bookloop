import { format, parseISO, isValid } from 'date-fns'; // For robust date parsing and formatting

// Helper to normalize text for better OCR error handling
function normalizeText(text: string): string {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    // Common OCR misreads:
    .replace(/[o0]/g, '0') // Normalize 'o'/'O' to '0'
    .replace(/[ilL]/g, '1') // Normalize 'i'/'l'/'I' to '1'
    .replace(/[sS]/g, '5') // Normalize 's'/'S' to '5'
    .replace(/[bB]/g, '8') // Common confusion between B and 8
    .replace(/[zZ]/g, '2') // Common confusion between Z and 2
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim(); // Trim leading/trailing whitespace
}

// Helper for robust date parsing
const parseDateString = (dateStr: string | null): string | null => {
  if (!dateStr || dateStr.length < 6) return null; // Minimum length for a date like DDMMYY

  // Pre-process common OCR date separators/formats
  let cleanDateStr = dateStr.replace(/[^0-9a-zA-Z]/g, '').trim(); // Remove all non-alphanumeric

  // Try parsing with date-fns, prioritizing common ID formats
  const dateFormatsToTry = [
    'ddmmyyyy', 'dd-mm-yyyy', 'dd/mm/yyyy', 'dd.mm.yyyy',
    'yyyymmdd', 'yyyy-mm-dd', 'yyyy/mm/dd', 'yyyy.mm.dd',
    'dd mon yyyy', // e.g., 01 Jan 2000 (if month is text)
  ];

  for (const fmt of dateFormatsToTry) {
    try {
      const parsedDate = new Date(cleanDateStr); // Try native Date object parsing first for flexibility
      if (isValid(parsedDate)) {
        return format(parsedDate, 'yyyy-MM-dd');
      }
    } catch (e) {
      // Continue to next format if native parsing fails
    }
  }

  // Fallback regex parsing for specific patterns if date-fns fails
  // This is a more robust regex for various date separators
  const match = dateStr.match(/(\d{1,4})[/\-.\s](\d{1,2})[/\-.\s](\d{1,4})/);
  if (match) {
    let [, p1, p2, p3] = match;
    // Heuristic: If one part is 4 digits, assume it's the year
    if (p1.length === 4) { // YYYY-MM-DD
      return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    } else if (p3.length === 4) { // DD-MM-YYYY
      return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    } else if (p1.length === 2 && p2.length === 2 && p3.length === 2) { // DDMMYY format common in MRZ
        // Assuming current year is 2025. This needs to be robust for future/past.
        // For YY, assume 20YY if YY >= current YY - 80 years, else 19YY
        const currentYear = new Date().getFullYear();
        const yearPrefix = parseInt(p3) > (currentYear % 100) + 10 ? '19' : '20'; // Heuristic for 19xx vs 20xx
        return `${yearPrefix}${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
  }

  console.warn(`⚠️ [ID Extraction - Date]: Failed to parse date from: "${dateStr}"`);
  return null;
};

// Helper for extracting a match using multiple patterns
const extractMatch = (
  text: string,
  patterns: RegExp | RegExp[],
  groupIndex: number = 1
): string | null => {
  const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
  for (const regex of patternsArray) {
    const match = text.match(regex);
    if (match && match[groupIndex]) {
      // Clean up extracted match: remove extra spaces, trim
      return match[groupIndex].replace(/\s+/g, ' ').trim();
    }
  }
  return null;
};

// Function to validate Ghana Card Personal ID Number (GHA-XXXXXXXXXXXX)
function validateGhanaCardPersonalID(id: string): string | null {
  const cleanedId = id.replace(/[^a-z0-9]/gi, '').toUpperCase(); // Remove non-alphanumeric, uppercase
  if (!cleanedId.startsWith('GHA') || cleanedId.length !== 15) { // GHA + 12 digits = 15 chars
    return null;
  }
  // Further validation could include a Luhn algorithm or specific checksum if Ghana Card has one.
  // For now, simple format check is sufficient.
  return cleanedId;
}

// Function to parse MRZ (Machine Readable Zone)
function parseMRZ(mrzLines: string[]): {
    documentNumber: string | null;
    dob: string | null;
    expiryDate: string | null;
    gender: string | null;
    nationality: string | null;
    surname: string | null;
    givenNames: string | null;
} {
    if (mrzLines.length < 2) return {}; // MRZ usually 2 lines (Passport) or 3 lines (ID card)

    const mrz1 = mrzLines[0].replace(/[^a-zA-Z0-9<]/g, ''); // Clean line
    const mrz2 = mrzLines[1].replace(/[^a-zA-Z0-9<]/g, ''); // Clean line

    let docNum = null;
    let dob = null;
    let expiry = null;
    let gender = null;
    let nationality = null;
    let surname = null;
    let givenNames = null;

    // Type P (Passport) and ID type 1 (ID card) MRZ structures
    // P<GBRDOCNUM<<<<<<<<<<<<<<<<<<<
    // YYMMDD<F<YYMMDD<GBR<<<<<<<<<<<

    // Basic MRZ parsing for common fields (Highly simplified, full MRZ parsing is complex)
    // Assuming type P< for passports (first char P, second is usually country code)
    if (mrz1.startsWith('p<') && mrz1.length >= 44 && mrz2.length >= 44) {
        docNum = mrz1.substring(2, 11).replace(/</g, ''); // Document number
        dob = parseDateString(mrz2.substring(0, 6)); // YYMMDD format
        gender = mrz2.substring(7, 8) === 'm' ? 'M' : mrz2.substring(7, 8) === 'f' ? 'F' : null;
        expiry = parseDateString(mrz2.substring(8, 14)); // YYMMDD format
        nationality = mrz2.substring(15, 18).replace(/</g, '').toUpperCase();

        // Names are tricky in MRZ, often surname before given names separated by <<
        const namePart = mrz1.substring(5).replace(/</g, ' ').trim(); // From 6th char to end, replace < with space
        const nameParts = namePart.split('  ').filter(Boolean); // Split by double space for surname << given names

        if (nameParts.length > 0) {
            surname = nameParts[0].toUpperCase();
            givenNames = nameParts.slice(1).join(' ').toUpperCase();
        }
    }
    // More MRZ parsing rules for ID cards (TD1, TD2, TD3) would go here
    // For Ghana Card (TD1 format), it would be 3 lines of 30 chars
    // e.g., I<GHA1234567890123<<<<<<<
    // GHA1234567890123<<<<<<<
    // 0001011M2501011GHA<<<<<<

    return {
        documentNumber: docNum,
        dob: dob,
        expiryDate: expiry,
        gender: gender,
        nationality: nationality,
        surname: surname,
        givenNames: givenNames
    };
}


export function extractIDInfo(data: any) {
  console.log("⚙️ [ID Extraction]: Starting ID info extraction from OCR response for Ghana IDs.");

  const rawText = data?.text?.text;
  if (typeof rawText !== "string" || rawText.trim() === "") {
    console.error("❌ [ID Extraction]: OCR text is not a valid string or is empty.");
    return {};
  }

  // --- 1. Robust Pre-processing ---
  const normalizedText = normalizeText(rawText);
  // Split original raw text by lines for MRZ parsing later, then normalize each line
  const lines = rawText.split('\n').map(line => normalizeText(line));

  console.log("📜 [ID Extraction]: Normalized text for processing:", normalizedText);

  let extractedInfo: { [key: string]: string | null } = {
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
    rawText: rawText, // Keep original raw text for reference
  };

  // --- Attempt MRZ parsing first for Passports/Ghana Cards (TD1/TD3) ---
  const mrzCandidateLines = lines.filter(line => line.length >= 30 && line.includes('<') && /[0-9A-Z]/.test(line));
  const mrzData = parseMRZ(mrzCandidateLines);

  if (mrzData.documentNumber) extractedInfo.idNumber = mrzData.documentNumber;
  if (mrzData.dob) extractedInfo.idDOB = mrzData.dob;
  if (mrzData.expiryDate) extractedInfo.idExpiryDate = mrzData.expiryDate;
  if (mrzData.gender) extractedInfo.gender = mrzData.gender;
  if (mrzData.nationality) extractedInfo.nationality = mrzData.nationality;
  if (mrzData.surname || mrzData.givenNames) {
      extractedInfo.idName = [mrzData.givenNames, mrzData.surname].filter(Boolean).join(' ').toUpperCase();
  }
  // Infer type from MRZ if possible
  if (extractedInfo.idNumber && normalizedText.includes("passport")) {
      extractedInfo.idType = "passport";
  } else if (extractedInfo.idNumber && normalizedText.includes("ghana card")) {
      // Ghana Card MRZ usually starts with I<GHA
      if (mrzCandidateLines[0]?.startsWith('i<gha')) {
          extractedInfo.idType = "ghana_card";
          // Also try to extract personal ID from MRZ for Ghana Card
          const matchGhanaCardMRZ = normalizedText.match(/i<gha([0-9lLiI]{12})[<]+/);
          if (matchGhanaCardMRZ) {
              extractedInfo.personalIdNumber = validateGhanaCardPersonalID(`GHA${matchGhanaCardMRZ[1]}`);
          }
      }
  }


  // --- 2. Smarter Pattern Matching & Prioritization (for fields not found in MRZ or specific to other cards) ---

  // Personal ID Number (Ghana Card specific: GHA-XXXXXXXXXXXX)
  // Prioritize this as it's very unique to Ghana Card
  if (!extractedInfo.personalIdNumber) {
      extractedInfo.personalIdNumber = extractMatch(normalizedText, [
        /\b(gha[ -]?[0-9lLiI]{12})\b/ // GHA-123456789012 or GHA 123456789012
      ]);
      extractedInfo.personalIdNumber = extractedInfo.personalIdNumber ? validateGhanaCardPersonalID(extractedInfo.personalIdNumber) : null;
  }

  // ID Type Inference (Refined, prioritize keywords)
  if (normalizedText.includes("ghana card") || normalizedText.includes("identity card") || (extractedInfo.personalIdNumber && extractedInfo.personalIdNumber.startsWith('GHA'))) {
    extractedInfo.idType = "ghana_card";
  } else if (normalizedText.includes("passport") || (extractedInfo.idType === "passport")) {
    extractedInfo.idType = "passport";
  } else if (normalizedText.includes("driver") || normalizedText.includes("license") || normalizedText.includes("driving licence")) {
    extractedInfo.idType = "driver_license";
  } else if (normalizedText.includes("ssnit card") || normalizedText.includes("social security")) {
    extractedInfo.idType = "ssnit_card";
  } else {
    extractedInfo.idType = extractedInfo.idType || "unknown"; // Keep MRZ type if set, otherwise unknown
  }


  // Names (only if not found in MRZ)
  if (!extractedInfo.idName) {
      let surname = extractMatch(normalizedText, [
        /surname[/:;.,]?\s*([a-z.'\s-]+)\b/,
        /nom[/:;.,]?\s*([a-z.'\s-]+)\b/,
        /(?<=(?:last\s+name|family\s+name)[/:;.,]?\s*)([a-z.'\s-]+)\b/ // lookbehind for robustness
      ]);

      let firstnames = extractMatch(normalizedText, [
        /firstnames[/:;.,]?\s*([a-z.'\s-]+)\b/,
        /pr[eé]noms[/:;.,]?\s*([a-z.'\s-]+)\b/,
        /(?<=(?:first\s+name|given\s+names)[/:;.,]?\s*)([a-z.'\s-]+)\b/ // lookbehind
      ]);

      extractedInfo.idName = [firstnames, surname].filter(Boolean).map(s => s.toUpperCase()).join(" ");
  }
  // Fallback for names if still not found (common pattern on IDs: NAME then the name)
  if (!extractedInfo.idName) {
      const nameLineMatch = normalizedText.match(/(?:name|full name|applicant's name)[/:;.,]?\s*([a-z.'\s-]+(?:,\s*[a-z.'\s-]+)?)\b/);
      if (nameLineMatch) {
          extractedInfo.idName = nameLineMatch[1].toUpperCase();
          // Attempt to split into surname and firstnames if comma-separated (Surname, Firstnames)
          if (extractedInfo.idName.includes(',')) {
              const parts = extractedInfo.idName.split(',').map(p => p.trim());
              // extractedInfo.surname = parts[0];
              // extractedInfo.firstnames = parts[1] || null;
          }
      }
  }


  // Document Number / License Number (only if not found in MRZ)
  if (!extractedInfo.idNumber) {
      extractedInfo.idNumber = extractMatch(normalizedText, [
        /document number[/:;.,]?\s*([a-z0-9]+)\b/,
        /id no[/:;.,]?\s*([a-z0-9]+)\b/,
        /licen[cs]e number[/:;.,]?\s*([a-z0-9]+)\b/, // For Driver's License
        /\b([a-z]{2}[0-9lLiI]{7,})\b/, // Common format for doc numbers (e.g., AB1234567)
        /\b([0-9lLiI]{8,})\b/ // Pure numeric, sufficiently long
      ]);
      if (extractedInfo.idNumber) {
          extractedInfo.idNumber = extractedInfo.idNumber.replace(/\s+/g, '').toUpperCase();
      }
  }


  // Dates (only if not found in MRZ)
  if (!extractedInfo.idDOB) {
      extractedInfo.idDOB = parseDateString(extractMatch(normalizedText, [
        /date of birth[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/,
        /dob[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/,
        /\bbirth date[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/
      ]));
  }
  if (!extractedInfo.idIssueDate) {
      extractedInfo.idIssueDate = parseDateString(extractMatch(normalizedText, [
        /date of issu(?:ance|e)[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/, // Handles 'issuance' or 'issue'
        /issue date[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/
      ]));
  }
  if (!extractedInfo.idExpiryDate) {
      extractedInfo.idExpiryDate = parseDateString(extractMatch(normalizedText, [
        /date of expir(?:y|ation)[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/, // Handles 'expiry' or 'expiration'
        /expiry date[/:;.,]?\s*(\d{1,4}[/\-.\s]\d{1,2}[/\-.\s]\d{1,4})/
      ]));
  }

  // Issuer (Ghanaian context)
  extractedInfo.idIssuer = extractMatch(normalizedText, [
    /place of issu(?:ance|e)[/:;.,]?\s*([a-z\s]+)\b/,
    /\b(accra|kumasi|takoradi|tamale|tema|ho|cape coast|ghana|immigration|authority|ministry of foreign affairs|national identification authority|nia)\b/ // More common Ghanaian cities/authorities
  ]);
  if (extractedInfo.idIssuer) {
      extractedInfo.idIssuer = extractedInfo.idIssuer.toUpperCase();
  }


  // Gender (only if not found in MRZ)
  if (!extractedInfo.gender) {
      const rawGender = extractMatch(normalizedText, [
        /sex[/:;.,]?\s*([mf])\b/,
        /gender[/:;.,]?\s*([mf])\b/,
        /\b(male|female)\b/ // Sometimes spelled out
      ]);
      if (rawGender) {
        if (rawGender.startsWith('m')) extractedInfo.gender = 'M';
        else if (rawGender.startsWith('f')) extractedInfo.gender = 'F';
        else extractedInfo.gender = null; // Unrecognized
      }
  }

  // Nationality (only if not found in MRZ)
  if (!extractedInfo.nationality) {
      extractedInfo.nationality = extractMatch(normalizedText, [
        /nationality[/:;.,]?\s*([a-z]+)\b/,
        /nationalit[eé][/:;.,]?\s*([a-z]+)\b/ // French spelling
      ]);
      if (extractedInfo.nationality) {
          extractedInfo.nationality = extractedInfo.nationality.toUpperCase();
      }
      // Ghana is GH or GHA in MRZ/standard short codes
      if (extractedInfo.nationality === 'GH' || extractedInfo.nationality === 'GHA') {
          extractedInfo.nationality = 'GHANAIAN';
      }
  }


  // --- 3. Post-processing and Validation ---

  // Sanity check for dates: Expiry should be after Issue, DOB should be realistic
  if (extractedInfo.idIssueDate && extractedInfo.idExpiryDate) {
    const issueDate = new Date(extractedInfo.idIssueDate);
    const expiryDate = new Date(extractedInfo.idExpiryDate);
    if (issueDate > expiryDate) {
      console.warn("⚠️ [ID Extraction]: Issue date is after expiry date. Setting expiry to null.");
      extractedInfo.idExpiryDate = null; // Invalidate if expiry is before issue
    }
  }

  if (extractedInfo.idDOB) {
      const dobDate = new Date(extractedInfo.idDOB);
      const currentYear = new Date().getFullYear(); // Current year is 2025
      const age = currentYear - dobDate.getFullYear();
      if (age < 12 || age > 110) { // Age range for ID holders
          console.warn(`⚠️ [ID Extraction]: Unrealistic DOB detected (age ${age}): ${extractedInfo.idDOB}. Setting to null.`);
          extractedInfo.idDOB = null; // Invalidate if unrealistic
      }
  }

  // Specific SSNIT Number extraction if idType is SSNIT Card
  if (extractedInfo.idType === 'ssnit_card') {
      const ssnitNumber = extractMatch(normalizedText, [
          /(?:ssnit number|social security number)[/:;.,]?\s*([0-9lLiI]{13})\b/, // SSNIT numbers are 13 digits
          /\b([0-9lLiI]{13})\b/ // Generic 13-digit number
      ]);
      if (ssnitNumber) {
          extractedInfo.idNumber = ssnitNumber.replace(/\s+/g, ''); // Ensure no spaces
      }
  }


  console.log("✅ [ID Extraction]: Finished with parsed result:");
  console.log(extractedInfo);

  return extractedInfo;
}