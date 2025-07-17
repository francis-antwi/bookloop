// utils/idValidation.ts

// The type for data is inferred from the function signature provided by the user.
// It's a subset of ExtractedIDInfo, focusing on fields for this specific validation.
interface ValidationData {
  idName?: string;
  idNumber?: string;
  idDOB?: string;
  idExpiryDate?: string;
  idIssuer?: string;
  // Note: personalIdNumber, idType are not in this specific validation's input,
  // but might be validated elsewhere or derived.
}

/**
 * Helper function to check if a string represents a valid date.
 * @param dateStr The date string to validate.
 * @returns True if the string can be parsed into a valid Date object, false otherwise.
 */
function isValidDate(dateStr: string | undefined): boolean {
  if (!dateStr) {
    console.warn("⚠️ [ID Validation - Date]: Date string is undefined or null.");
    return false;
  }
  const date = new Date(dateStr);
  const isValid = !isNaN(date.getTime());
  if (!isValid) {
    console.warn(`⚠️ [ID Validation - Date]: Invalid date format or value: "${dateStr}"`);
  }
  return isValid;
}

/**
 * Validates the extracted ID information, providing specific error messages.
 * This function performs checks on the presence and basic validity of key ID fields.
 * @param data The extracted ID information to validate.
 * @returns An object containing a boolean `isValid` and an array of `errors`.
 */
export function validateExtractedData(data: ValidationData): { isValid: boolean; errors: string[] } {
  console.log("🔍 [ID Validation]: Starting validation for extracted data:", data);

  const errors: string[] = [];

  // Validate idName
  if (!data.idName || data.idName.trim().length < 2) {
    errors.push("Invalid or missing name");
    console.error("❌ [ID Validation]: Invalid or missing name.");
  }

  // Validate idNumber (assuming it's a primary identifier)
  if (!data.idNumber || data.idNumber.trim().length < 4) {
    errors.push("Invalid or missing ID number");
    console.error("❌ [ID Validation]: Invalid or missing ID number.");
  }

  // Validate idDOB
  if (!data.idDOB || !isValidDate(data.idDOB)) {
    errors.push("Invalid or missing date of birth");
    console.error("❌ [ID Validation]: Invalid or missing date of birth.");
  }

  // Validate idExpiryDate
  if (!data.idExpiryDate || !isValidDate(data.idExpiryDate)) {
    errors.push("Invalid or missing expiry date");
    console.error("❌ [ID Validation]: Invalid or missing expiry date.");
  }

  // Validate idIssuer
  if (!data.idIssuer || data.idIssuer.trim().length < 2) {
    errors.push("Invalid or missing issuer");
    console.error("❌ [ID Validation]: Invalid or missing issuer.");
  }

  const isValid = errors.length === 0;
  if (isValid) {
    console.log("✅ [ID Validation]: Extracted data passed validation. No errors.");
  } else {
    console.error("❌ [ID Validation]: Extracted data failed validation. Errors:", errors);
  }

  return {
    isValid,
    errors,
  };
}
