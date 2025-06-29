// utils/formatGhanaPhone.ts

export function formatGhanaPhone(input: string): string | null {
  // Remove spaces, dashes, etc.
  const cleaned = input.replace(/[^0-9]/g, '');

  // Starts with 0 and is 10 digits like 0501234567
  if (/^0[2354567]\d{8}$/.test(cleaned)) {
    return `+233${cleaned.slice(1)}`; // replace 0 with +233
  }

  // Already in +233 format
  if (/^233[2354567]\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }

  // Already full format like +233501234567
  if (/^\+233[2354567]\d{7}$/.test(input)) {
    return input;
  }

  return null; // invalid
}
