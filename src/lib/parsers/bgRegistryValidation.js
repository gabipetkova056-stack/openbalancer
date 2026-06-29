/**
 * Lightweight BG registry-oriented validation helpers for invoice records.
 * VIES registry checks require server-side SOAP calls; here we validate local
 * syntax/checksum and whether a BG VAT number is VIES-eligible.
 */

function allDigits(value) {
  return (value || '').replace(/\D/g, '');
}

export function validateEik(value) {
  const eik = allDigits(value);
  if (!/^\d{9}(\d{4})?$/.test(eik)) return false;

  if (eik.length === 9) {
    const w1 = [1, 2, 3, 4, 5, 6, 7, 8];
    const w2 = [3, 4, 5, 6, 7, 8, 9, 10];
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(eik[i]) * w1[i];
    let check = sum % 11;
    if (check === 10) {
      sum = 0;
      for (let i = 0; i < 8; i++) sum += Number(eik[i]) * w2[i];
      check = sum % 11;
      if (check === 10) check = 0;
    }
    return check === Number(eik[8]);
  }

  // 13-digit Bulstat extension: first 9 digits + 4-digit branch checksum.
  if (!validateEik(eik.slice(0, 9))) return false;
  const ext = eik.slice(8);
  const w = [2, 7, 3, 5];
  let sum = 0;
  for (let i = 0; i < 4; i++) sum += Number(ext[i]) * w[i];
  let check = sum % 11;
  if (check === 10) {
    const w2 = [4, 9, 5, 7];
    sum = 0;
    for (let i = 0; i < 4; i++) sum += Number(ext[i]) * w2[i];
    check = sum % 11;
    if (check === 10) check = 0;
  }
  return check === Number(ext[4]);
}

export function normalizeBgVatNumber(value, eik) {
  const raw = allDigits(value);
  if (raw.length === 9 || raw.length === 10) return `BG${raw}`;
  const eikDigits = allDigits(eik);
  if (eikDigits.length === 9 || eikDigits.length === 10) return `BG${eikDigits}`;
  return null;
}

export function validateBgVatNumber(value) {
  const vat = (value || '').toUpperCase().replace(/\s+/g, '');
  if (!/^BG\d{9,10}$/.test(vat)) return false;
  return validateEik(vat.slice(2));
}

export function buildRegistryValidation({ eik, vatNumber }) {
  const normalizedVat = normalizeBgVatNumber(vatNumber, eik);
  return {
    eik: eik || null,
    eikValid: validateEik(eik),
    vatNumber: normalizedVat,
    vatValid: validateBgVatNumber(normalizedVat),
    viesEligible: Boolean(normalizedVat && /^BG\d{9,10}$/.test(normalizedVat)),
    source: 'local-checksum',
  };
}
