export function validateExtractedData(data: {
  idName?: string;
  idNumber?: string;
  idDOB?: string;
  idExpiryDate?: string;
  idIssuer?: string;
}) {
  const errors: string[] = [];

  if (!data.idName || data.idName.length < 2) {
    errors.push("Invalid or missing name");
  }

  if (!data.idNumber || data.idNumber.length < 4) {
    errors.push("Invalid or missing ID number");
  }

  if (!data.idDOB || !isValidDate(data.idDOB)) {
    errors.push("Invalid or missing date of birth");
  }

  if (!data.idExpiryDate || !isValidDate(data.idExpiryDate)) {
    errors.push("Invalid or missing expiry date");
  }

  if (!data.idIssuer || data.idIssuer.length < 2) {
    errors.push("Invalid or missing issuer");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}
