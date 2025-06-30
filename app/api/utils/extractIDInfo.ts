export function extractIDInfo(data: any) {
  const rawText = data?.text?.text;

  if (typeof rawText !== "string") {
    console.error("extractIDInfo: OCR text is not a string", rawText);
    return {};
  }

  const lines = rawText.split("\n").map((line: string) => line.trim()).filter(Boolean);
  const fullText = lines.join(" ");

  const getDate = (text: string) => {
    const match = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
  };

  const extractMatch = (regex: RegExp, join = false) => {
    const match = fullText.match(regex);
    return match ? (join ? match.slice(1).join(" ") : match[1]) : null;
  };

  const surname = extractMatch(/Surname\/Nom\s+([A-Z]+)/i);
  const firstnames = extractMatch(/Firstnames\/Prénoms\s+([A-Z]+)/i);
  const idName = [firstnames, surname].filter(Boolean).join(" ");

  const idDOB = getDate(extractMatch(/Date of Birth.*?(\d{2}\/\d{2}\/\d{4})/i) ?? "");
  const idIssueDate = getDate(extractMatch(/Date of Issuance.*?(\d{2}\/\d{2}\/\d{4})/i) ?? "");
  const idExpiryDate = getDate(extractMatch(/Date of Expiry.*?(\d{2}\/\d{2}\/\d{4})/i) ?? "");

  const idNumber = extractMatch(/Document Number.*?([A-Z0-9]+)/i)
    ?? extractMatch(/([A-Z]{2}[0-9]{7,})/); // fallback if not labeled

  const idIssuer = extractMatch(/Place of Issuance.*?([A-Z]+)/i)
    ?? extractMatch(/ACCRA|KUMASI|TAKORADI|TAMALE/i);

  const personalIdNumber = extractMatch(/(GHA-\d{12})/);

  const gender = extractMatch(/Sex\/Sexe\s+([MF])\b/i);
  const nationality = extractMatch(/Nationality\/Nationalité\s+([A-Z]+)/i);

  return {
    idName: idName || null,
    idNumber: idNumber || null,
    idDOB: idDOB || null,
    idIssueDate: idIssueDate || null,
    idExpiryDate: idExpiryDate || null,
    idIssuer: idIssuer || null,
    personalIdNumber: personalIdNumber || null,
    gender: gender || null,
    nationality: nationality || null,
    rawText,
  };
}
