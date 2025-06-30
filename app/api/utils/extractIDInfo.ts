export function extractIDInfo(data: any) {
  // Defensive extraction of nested text string:
  const rawText = data?.text?.text;

  if (typeof rawText !== "string") {
    console.error("extractIDInfo: OCR text is not a string", rawText);
    return {};
  }

  const lines = rawText.split("\n").map((line: string) => line.trim());

  let idName = "";
  let idNumber = "";
  let idDOB = "";
  let idExpiryDate = "";
  let idIssuer = "";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (!idName && /name|surname/.test(lower)) {
      idName = line.split(":").pop()?.trim() || line;
    }
    if (!idNumber && /id|number/.test(lower)) {
      idNumber = line.split(":").pop()?.trim() || line;
    }
    if (!idDOB && /(dob|date of birth)/.test(lower)) {
      idDOB = line.split(":").pop()?.trim() || line;
    }
    if (!idExpiryDate && /(expiry|exp|expires)/.test(lower)) {
      idExpiryDate = line.split(":").pop()?.trim() || line;
    }
    if (!idIssuer && /(authority|issuer|issued)/.test(lower)) {
      idIssuer = line.split(":").pop()?.trim() || line;
    }
  }

  return { idName, idNumber, idDOB, idExpiryDate, idIssuer };
}
