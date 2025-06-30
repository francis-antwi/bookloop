export function extractIDInfo(data: any) {
  const rawText = data?.text?.text;
  if (typeof rawText !== "string") {
    console.error("❌ OCR text is not valid");
    return {};
  }

  const lines = rawText.split("\n").map(line => line.trim()).filter(Boolean);
  const fullText = lines.join(" ");
  const lowerText = fullText.toLowerCase();

  const getDate = (str: string): string | null => {
    const dateMatch = str.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
    if (!dateMatch) return null;
    const [_, day, month, year] = dateMatch;
    return `${year}-${month}-${day}`;
  };

  const findLine = (keywords: string[]) => {
    return lines.find(line =>
      keywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );
  };

  const extractValueAfterKeyword = (line: string, keyword: string) => {
    const index = line.toLowerCase().indexOf(keyword.toLowerCase());
    return index !== -1 ? line.slice(index + keyword.length).trim() : "";
  };

  const surnameLine = findLine(["Surname", "Nom"]);
  const firstnameLine = findLine(["Firstnames", "Prénoms"]);
  const idName =
    `${extractValueAfterKeyword(firstnameLine || "", "Firstnames") || ""} ${extractValueAfterKeyword(surnameLine || "", "Surname") || ""}`.trim();

  const dobLine = findLine(["Date of Birth", "DOB"]);
  const idDOB = getDate(dobLine || "");

  const issueLine = findLine(["Date of Issuance", "Issued"]);
  const idIssueDate = getDate(issueLine || "");

  const expiryLine = findLine(["Date of Expiry", "Expires"]);
  const idExpiryDate = getDate(expiryLine || "");

  const genderLine = findLine(["Sex", "Gender"]);
  const gender = extractValueAfterKeyword(genderLine || "", "Sex").match(/[MF]/i)?.[0].toUpperCase() || null;

  const nationalityLine = findLine(["Nationality", "Nationalité"]);
  const nationality = extractValueAfterKeyword(nationalityLine || "", "Nationality").split(" ")[0] || null;

  const personalIdNumber = fullText.match(/GHA[-\s]?\d{12}/)?.[0].replace(/\s/g, "") || null;

  const idNumber = fullText.match(/\b[A-Z]{2}\d{6,8}\b/)?.[0] ?? personalIdNumber;

  const idIssuer = fullText.match(/\b(ACCRA|KUMASI|TAMALE|TAKORADI|BOLGATANGA)\b/i)?.[0].toUpperCase() || null;

  let idType: string | null = null;
  if (lowerText.includes("ghana card") || lowerText.includes("identity card")) {
    idType = "ghana_card";
  } else if (lowerText.includes("passport")) {
    idType = "passport";
  } else if (lowerText.includes("driver") || lowerText.includes("license")) {
    idType = "driver_license";
  }
  return {
    idName: idName || null,
    idNumber: idNumber || null,
    personalIdNumber,
    idDOB,
    idIssueDate,
    idExpiryDate,
    idIssuer,
    gender,
    nationality,
    idType,
    rawText,
  };
}
