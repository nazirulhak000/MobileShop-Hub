/**
 * Payroll & Attendance calculation utilities with exact integer satang precision.
 */

// Thai Social Security (SSF) Section 33 Policy
export const SSO_RATE = 0.05;
export const SSO_WAGE_MIN = 1_650;
export const SSO_WAGE_MAX = 15_000;
export const SSO_MAX_DEDUCTION = 750;
export const SSO_EMPLOYER_MATCH = 1;

/** Integer Satang utilities ensuring exact integer precision with zero remainder. */
export function toSatang(amount: number): number {
  return Math.round(Number(amount || 0) * 100);
}

export function fromSatang(satang: number): number {
  return Math.round(satang) / 100;
}

/**
 * Calculates OT pay with satang precision:
 * Thai Labor standard hourly base = (baseSalary / 30 / 8)
 * otPay = ot15Hours * 1.5 * hourlyBase + ot20Hours * 2.0 * hourlyBase + ot30Hours * 3.0 * hourlyBase
 */
export function calculateOtPay(
  baseSalary: number,
  ot15Hours: number,
  ot20Hours: number,
  ot30Hours: number
): number {
  if (baseSalary <= 0) return 0;
  const hourlyBaseSatang = (baseSalary / 30 / 8) * 100; // in satang
  const ot15Satang = Math.round(ot15Hours * 1.5 * hourlyBaseSatang);
  const ot20Satang = Math.round(ot20Hours * 2.0 * hourlyBaseSatang);
  const ot30Satang = Math.round(ot30Hours * 3.0 * hourlyBaseSatang);
  return fromSatang(ot15Satang + ot20Satang + ot30Satang);
}

/**
 * Employee SSO contribution in whole baht, strictly capped at 750 THB.
 * Gross >= 15,000 THB => 750 THB.
 */
export function ssoOf(grossBaht: number): number {
  if (grossBaht <= 0) return 0;
  const base = Math.min(Math.max(grossBaht, SSO_WAGE_MIN), SSO_WAGE_MAX);
  const ssoBaht = Math.round(base * SSO_RATE);
  return Math.min(ssoBaht, SSO_MAX_DEDUCTION);
}
