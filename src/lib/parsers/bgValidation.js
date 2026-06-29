/**
 * bgValidation.js — Bulgarian EIK/VAT validation helpers.
 */

function digitsOnly(v) {
  return String(v ?? '').replace(/\D+/g, '');
}

function isValidEik9(eik9) {
  if (!/^\d{9}$/.test(eik9)) return false;
  const d = eik9.split('').map(Number);
  const first = d.slice(0, 8).reduce((sum, val, i) => sum + val * (i + 1), 0) % 11;
  const c1 = first === 10
    ? d.slice(0, 8).reduce((sum, val, i) => sum + val * (i + 3), 0) % 11
    : first;
  return (c1 === 10 ? 0 : c1) === d[8];
}

function isValidVat13(vat13) {
  if (!/^\d{13}$/.test(vat13)) return false;
  if (!isValidEik9(vat13.slice(0, 9))) return false;
  const branch = vat13.slice(9).split('').map(Number);
  const sum1 = branch[0] * 2 + branch[1] * 7 + branch[2] * 3;
  let check = sum1 % 11;
  if (check === 10) {
    const sum2 = branch[0] * 4 + branch[1] * 9 + branch[2] * 5;
    check = sum2 % 11;
  }
  return (check === 10 ? 0 : check) === branch[3];
}

/**
 * Validate Bulgarian EIK/BULSTAT identifier (9 or 13 digits).
 * @param {string} value
 * @returns {{normalized:string,isValid:boolean,reason:string}}
 */
export function validateBulgarianEik(value) {
  const normalized = digitsOnly(value);
  if (!normalized) return { normalized, isValid: false, reason: 'missing' };
  if (normalized.length === 9) {
    return {
      normalized,
      isValid: isValidEik9(normalized),
      reason: isValidEik9(normalized) ? 'ok' : 'invalid_checksum',
    };
  }
  if (normalized.length === 13) {
    return {
      normalized,
      isValid: isValidVat13(normalized),
      reason: isValidVat13(normalized) ? 'ok' : 'invalid_checksum',
    };
  }
  return { normalized, isValid: false, reason: 'invalid_length' };
}
