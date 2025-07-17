export function extractIDInfo(data: any) {
  console.log("⚙️ [ID Extraction]: Starting ID info extraction from OCR response.");

  const rawText = data?.text?.text;
  if (typeof rawText !== "string") {
    console.error("❌ OCR text is not a string:", rawText);
    return {};
  }

  const lines = rawText
    .split("\n")
    .map(line => line.trim().replace(/[^\x00-\x7F]/g, "")) // remove special chars
    .filter(Boolean);

  const normalize = (text: string): string => {
    return text
      .replace(/[\u2013\u2014]/g, "-")  // normalize dashes
      .replace(/[“”‘’]/g, '"')         // normalize quotes
      .replace(/[^\w\s\-\/]/g, "")     // remove unwanted symbols
      .toUpperCase();
  };

  const fullText = normalize(lines.join(" "));
  const parseDate = (line: string): string | null => {
    const dateMatch = line.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    return dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
  };

  const findLine = (labelKeywords: string[]): string | null => {
    const regex = new RegExp(labelKeywords.join("|"), "i");
    const line = lines.find(l => regex.test(l));
    return line ?? null;
  };

  const extractAfterLabel = (line: string, labelKeywords: string[]): string | null => {
    for (const label of labelKeywords) {
      const idx = line.toLowerCase().indexOf(label.toLowerCase());
      if (idx >= 0) {
        const after = line.slice(idx + label.length).trim();
        const match = after.match(/[A-Z0-9\s\-]+/);
        return match ? match[0].trim() : null;
      }
    }
    return null;
  };

  const getField = (keywords: string[], isDate = false): string | null => {
    const line = findLine(keywords);
    if (!line) return null;
    return isDate ? parseDate(line) : extractAfterLabel(line, keywords);
  };

  const idDOB = getField(["date of birth", "dob"], true);
  const idIssueDate = getField(["date of issuance", "issue date"], true);
  const idExpiryDate = getField(["date of expiry", "expiry date"], true);
  const surname = getField(["surname", "nom"]);
  const firstnames = getField(["firstnames", "prenoms", "given name"]);
  const idNumber =
    getField(["document number", "card number", "passport no"]) ??
    fullText.match(/\b[A-Z]{2}\d{6,}\b/)?.[0] ??
    fullText.match(/\b\d{9,12}\b/)?.[0] ?? null;

  const idName = [firstnames, surname].filter(Boolean).join(" ");
  const idIssuer = getField(["place of issuance", "issued at", "authority"]) ??
    fullText.match(/\b(ACCRA|KUMASI|TAMALE|TAKORADI)\b/i)?.[0];

  const personalIdNumber =
    fullText.match(/\bGHA[- ]?\d{12}\b/i)?.[0].replace(" ", "-") ?? null;

  const gender =
    getField(["sex", "gender"]) ??
    fullText.match(/\b(MALE|FEMALE|M|F)\b/i)?.[0].charAt(0).toUpperCase();

  const nationality = getField(["nationality"]) ??
    fullText.match(/\b(GHANAIAN|NIGERIAN|TOGOLESE|IVORIAN)\b/i)?.[0].toUpperCase();

  let idType: string | null = null;
  if (/ghana card/i.test(fullText)) idType = "ghana_card";
  else if (/passport/i.test(fullText)) idType = "passport";
  else if (/driver|license/i.test(fullText)) idType = "driver_license";

  const result = {
    idName: idName || null,
    idNumber: idNumber || null,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer: idIssuer || null,
    personalIdNumber,
    gender: gender || null,
    nationality: nationality || null,
    idType,
    rawText,
  };

  console.log("✅ [ID Extraction] Result:", result);
  return result;
}
