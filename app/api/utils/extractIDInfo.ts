export function extractIDInfo(data: any) {
  console.log("⚙️ [ID Extraction]: Starting ID info extraction from OCR response.");

  const rawText = data?.text?.text;
  if (typeof rawText !== "string") {
    console.error("❌ [ID Extraction]: OCR text is not a string:", rawText);
    return {};
  }

  const lines = rawText
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);
  const fullText = lines.join(" ");
  const lowerText = fullText.toLowerCase();

  console.log("📜 [ID Extraction]: Full text for processing:", fullText);

  const parseDate = (text: string): string | null => {
    const match = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (match) {
      const [, dd, mm, yyyy] = match;
      return `${yyyy}-${mm}-${dd}`;
    }
    console.warn(`⚠️ [ID Extraction - Date]: Failed to parse date from: "${text}"`);
    return null;
  };

  const extractMatch = (regex: RegExp, join = false): string | null => {
    const match = fullText.match(regex);
    return match ? (join ? match.slice(1).join(" ") : match[1]) : null;
  };

  const surname = extractMatch(/Surname\/Nom\s+([A-Z]+)/i);
  const firstnames = extractMatch(/Firstnames\/Prénoms\s+([A-Z]+)/i);
  const idName = [firstnames, surname].filter(Boolean).join(" ");
  console.log(`🧾 [ID Extraction]: Name => "${idName}"`);

  const idDOB = parseDate(extractMatch(/Date of Birth.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ?? "");
  const idIssueDate = parseDate(extractMatch(/Date of Issuance.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ?? "");
  const idExpiryDate = parseDate(extractMatch(/Date of Expiry.*?(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i) ?? "");

  const idNumber =
    extractMatch(/Document Number.*?([A-Z0-9]+)/i) ??
    extractMatch(/([A-Z]{2}[0-9]{7,})/);
  const idIssuer =
    extractMatch(/Place of Issuance.*?([A-Z]+)/i) ??
    extractMatch(/\b(ACCRA|KUMASI|TAKORADI|TAMALE)\b/i);

  const personalIdNumber = extractMatch(/\b(GHA-\d{12})\b/);
  const gender = extractMatch(/Sex\/Sexe\s+([MF])\b/i);
  const nationality = extractMatch(/Nationality\/Nationalité\s+([A-Z]+)/i);

  // Infer ID type
  let idType: string | null = null;
  if (lowerText.includes("ghana card") || lowerText.includes("identity card")) {
    idType = "ghana_card";
  } else if (lowerText.includes("passport")) {
    idType = "passport";
  } else if (lowerText.includes("driver") || lowerText.includes("license")) {
    idType = "driver_license";
  }

  console.log("✅ [ID Extraction]: Finished with parsed result:");
  console.log({
    idName, idNumber, idDOB, idIssueDate, idExpiryDate,
    idIssuer, personalIdNumber, gender, nationality, idType
  });

  return {
    idName: idName || null,
    idNumber: idNumber || null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer: idIssuer || null,
    personalIdNumber: personalIdNumber || null,
    gender: gender || null,
    nationality: nationality || null,
    idType,
    rawText,
  };
}
