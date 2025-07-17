// utils/idValidation.ts

interface ValidationData {
  idName?: string;
  idNumber?: string;
  idDOB?: string;
  idExpiryDate?: string;
  idIssuer?: string;
}

function isValidDate(dateStr: string | undefined, opts?: { pastOnly?: boolean; futureOnly?: boolean }): boolean {
  if (!dateStr) return false;

  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  if (opts?.pastOnly && date > now) return false;
  if (opts?.futureOnly && date < now) return false;

  return true;
}

export function validateExtractedData(data: ValidationData): { isValid: boolean; errors: string[] } {
  console.log("🔍 [ID Validation]: Starting validation for extracted data:", data);

  const errors: string[] = [];

  // Helper patterns
  const namePattern = /^[A-Z][a-zA-Z\s\-']{1,}$/;
  const idNumberPattern = /^[A-Z0-9\-]{5,20}$/;
  const issuerPattern = /^[A-Za-z\s]{2,}$/;

  // Validate Name
  if (!data.idName || !namePattern.test(data.idName.trim())) {
    errors.push("Name is missing or in invalid format (e.g., must start with a capital letter and contain only letters)");
  }

  // Validate ID Number
  if (!data.idNumber || !idNumberPattern.test(data.idNumber.trim())) {
    errors.push("ID number is missing or in invalid format (must be alphanumeric and 5–20 characters long)");
  }

  // Validate Date of Birth
  if (!data.idDOB || !isValidDate(data.idDOB, { pastOnly: true })) {
    errors.push("Date of birth is missing or invalid (must be a valid past date)");
  }

  // Validate Expiry Date
  if (!data.idExpiryDate || !isValidDate(data.idExpiryDate, { futureOnly: true })) {
    errors.push("Expiry date is missing or invalid (must be a valid future date)");
  }

  // Validate Issuer
  if (!data.idIssuer || !issuerPattern.test(data.idIssuer.trim())) {
    errors.push("Issuer is missing or in invalid format (must be at least 2 letters)");
  }

  // Final result
  const isValid = errors.length === 0;

  if (isValid) {
    console.log("✅ [ID Validation]: Extracted data passed all validation checks.");
  } else {
    console.error("❌ [ID Validation]: Extracted data failed validation:", errors);
  }

  return { isValid, errors };
}
