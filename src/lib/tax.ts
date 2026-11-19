// Thai Tax Calculation Engine & 2568 Allowances Library

export interface TaxSettings {
  taxYear: number;
  taxpayerType: "INDIVIDUAL" | "CORPORATE";
  businessCategory: string; // e.g. "ขายสินค้า / ซ่อมโทรศัพท์มือถือ (มาตรา 40(8))"
  expenseDeductionMethod: "FLAT_60" | "ACTUAL";
  actualExpenses: number;

  // Group 1: Personal & Family
  selfAllowance: number; // 60,000
  spouseAllowance: boolean; // 60,000 if true
  childCount: number; // 30,000 per child
  parentsCount: number; // 30,000 per parent (up to 4)
  parentsHealthInsurance: number; // Max 15,000

  // Group 2: Insurance & Savings / Retirement
  lifeInsurance: number; // Max 100,000
  healthInsurance: number; // Max 25,000 (total life+health <= 100k)
  socialSecurity: number; // Max 9,000
  providentFund: number; // Max 15% of salary, <= 500k
  rmfFund: number; // Max 30% of income, <= 500k
  ssfFund: number; // Max 30% of income, <= 200k
  thaiEsgFund: number; // Thai ESG Max 300,000 (new 2568 rule)

  // Group 3: Economic Stimulus & Real Estate
  homeLoanInterest: number; // Max 100,000
  easyEReceipt: number; // Max 50,000 (ช้อปดีมีคืน / Easy E-Receipt)

  // Group 4: Donations
  educationDonation: number; // 2x deduction (max 10% of net income)
  generalDonation: number; // 1x deduction (max 10% of net income)
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  taxYear: 2568,
  taxpayerType: "INDIVIDUAL",
  businessCategory: "พาณิชยกรรม ขายปลีกสินค้าและบริการซ่อม (มาตรา 40(8))",
  expenseDeductionMethod: "FLAT_60",
  actualExpenses: 450000,

  selfAllowance: 60000,
  spouseAllowance: false,
  childCount: 1,
  parentsCount: 1,
  parentsHealthInsurance: 0,

  lifeInsurance: 30000,
  healthInsurance: 15000,
  socialSecurity: 9000,
  providentFund: 0,
  rmfFund: 50000,
  ssfFund: 0,
  thaiEsgFund: 50000,

  homeLoanInterest: 45000,
  easyEReceipt: 30000,

  educationDonation: 5000,
  generalDonation: 2000,
};

type Bracket = { min: number; max: number; rate: number; label: string; rateLabel: string };

/**
 * Each bracket's `min` equals the previous bracket's `max`, so spans are exact
 * (150,000-300,000 is 150,000 wide). Labels keep the familiar "150,001" wording.
 */
function buildBrackets(rows: Array<{ max: number; rate: number }>): Bracket[] {
  let prev = 0;
  return rows.map(({ max, rate }) => {
    const min = prev;
    prev = max;
    const fmt = (n: number) => n.toLocaleString("en-US");
    const label = max === Infinity ? `${fmt(min + 1)} บาทขึ้นไป` : `${min === 0 ? "0" : fmt(min + 1)} - ${fmt(max)} บาท`;
    const rateLabel = rate === 0 ? "0% (ยกเว้นภาษี)" : `${Math.round(rate * 100)}%`;
    return { min, max, rate, label, rateLabel };
  });
}

// Thai Personal Income Tax progressive brackets (0% - 35%)
const PIT_BRACKETS = buildBrackets([
  { max: 150000, rate: 0 },
  { max: 300000, rate: 0.05 },
  { max: 500000, rate: 0.1 },
  { max: 750000, rate: 0.15 },
  { max: 1000000, rate: 0.2 },
  { max: 2000000, rate: 0.25 },
  { max: 5000000, rate: 0.3 },
  { max: Infinity, rate: 0.35 },
]);

// Thai Corporate Income Tax SME brackets (paid-up capital <= 5M and revenue <= 30M)
export const CIT_SME_BRACKETS = buildBrackets([
  { max: 300000, rate: 0 },
  { max: 3000000, rate: 0.15 },
  { max: Infinity, rate: 0.2 },
]);

const round2 = (n: number) => Math.round(n * 100) / 100;

function applyBrackets(amount: number, brackets: Bracket[]) {
  let total = 0;
  const details = brackets.map((b) => {
    const span = b.max - b.min; // Infinity for the top bracket
    const taxable = Math.max(0, Math.min(amount - b.min, span));
    const tax = round2(taxable * b.rate);
    total += tax;
    return { ...b, taxable, tax };
  });
  return { details, total: round2(total) };
}

export interface PitOptions {
  /** ภ.ง.ด.94 (Jan-Jun): personal/family allowances are halved. */
  halfYear?: boolean;
}

// Calculate Personal Income Tax (estimate only)
export function calculatePIT(revenue: number, settings: TaxSettings, options: PitOptions = {}) {
  const half = options.halfYear ? 0.5 : 1;

  // 1. Expenses
  const expenseAmount = settings.expenseDeductionMethod === "FLAT_60"
    ? revenue * 0.6 // Flat 60% for 40(8) retail/repair
    : Math.max(0, settings.actualExpenses || 0);
  const incomeAfterExpenses = Math.max(0, revenue - expenseAmount);

  // 2. Allowances
  // Group 1: Personal & Family (halved for ภ.ง.ด.94)
  const g1Personal = 60000 * half;
  const g1Spouse = settings.spouseAllowance ? 60000 * half : 0;
  const g1Child = Math.max(0, settings.childCount || 0) * 30000 * half;
  const g1Parents = Math.min(4, Math.max(0, settings.parentsCount || 0)) * 30000 * half;
  const g1ParentsHealth = Math.min(15000, settings.parentsHealthInsurance || 0);
  const group1Total = g1Personal + g1Spouse + g1Child + g1Parents + g1ParentsHealth;

  // Group 2: Insurance & Retirement
  // Life (max 100k) + Health (max 25k), combined max 100k
  const rawHealth = Math.min(25000, settings.healthInsurance || 0);
  const rawLife = Math.min(100000, settings.lifeInsurance || 0);
  const g2LifeAndHealth = Math.min(100000, rawLife + rawHealth);
  const g2SocialSecurity = Math.min(9000, settings.socialSecurity || 0);

  // Retirement funds: each has a percentage-of-income cap, then a combined 500,000 cap.
  const g2Rmf = Math.min(500000, revenue * 0.3, settings.rmfFund || 0); // RMF: 30% of income
  const g2Ssf = Math.min(200000, revenue * 0.3, settings.ssfFund || 0); // SSF: 30% of income
  const g2Pvd = Math.min(500000, revenue * 0.15, settings.providentFund || 0); // PVD: 15% of wages
  const retirementPool = Math.min(500000, g2Rmf + g2Ssf + g2Pvd);

  // Thai ESG: 30% of income, max 300,000, outside the 500,000 retirement cap
  const g2ThaiEsg = Math.min(300000, revenue * 0.3, settings.thaiEsgFund || 0);
  const group2Total = g2LifeAndHealth + g2SocialSecurity + retirementPool + g2ThaiEsg;

  // Group 3: Stimulus & Real Estate
  const g3HomeLoan = Math.min(100000, settings.homeLoanInterest || 0);
  const g3EasyEReceipt = Math.min(50000, settings.easyEReceipt || 0);
  const group3Total = g3HomeLoan + g3EasyEReceipt;

  const totalAllowancesBeforeDonations = group1Total + group2Total + group3Total;
  const preDonationNetIncome = Math.max(0, incomeAfterExpenses - totalAllowancesBeforeDonations);

  // Group 4: Donations. Education (2x) <= 10% of net income; general <= 10% of net income after the education donation.
  const g4Education2x = Math.min(preDonationNetIncome * 0.1, (settings.educationDonation || 0) * 2);
  const g4General = Math.min(Math.max(0, preDonationNetIncome - g4Education2x) * 0.1, settings.generalDonation || 0);
  const group4Total = g4Education2x + g4General;

  const totalAllowances = totalAllowancesBeforeDonations + group4Total;
  const netTaxableIncome = round2(Math.max(0, incomeAfterExpenses - totalAllowances));

  // 3. Progressive tax
  const progressive = applyBrackets(netTaxableIncome, PIT_BRACKETS);
  const bracketDetails = progressive.details.map((b) => ({ ...b, taxableInBracket: b.taxable, taxAmount: b.tax }));

  // Minimum tax for non-salary income >= 1,000,000: 0.5% of income, waived when it is <= 5,000.
  const halfPct = revenue >= 1000000 ? round2(revenue * 0.005) : 0;
  const flatHalfPercent = halfPct > 5000 ? halfPct : 0;
  const finalTaxPayable = Math.max(progressive.total, flatHalfPercent);

  return {
    revenue,
    expenseAmount: round2(expenseAmount),
    incomeAfterExpenses: round2(incomeAfterExpenses),
    halfYear: !!options.halfYear,
    allowanceBreakdown: {
      group1: { title: "ลดหย่อนส่วนตัวและครอบครัว", total: group1Total, items: { g1Personal, g1Spouse, g1Child, g1Parents, g1ParentsHealth } },
      group2: {
        title: "ประกัน การออม และกองทุนลดหย่อนภาษี (SSF/RMF/Thai ESG)",
        total: round2(group2Total),
        items: { g2LifeAndHealth, g2SocialSecurity, retirementPool: round2(retirementPool), g2Rmf: round2(g2Rmf), g2Ssf: round2(g2Ssf), g2Pvd: round2(g2Pvd), g2ThaiEsg: round2(g2ThaiEsg) },
      },
      group3: { title: "กระตุ้นเศรษฐกิจ & อสังหาริมทรัพย์ (Easy E-Receipt)", total: group3Total, items: { g3HomeLoan, g3EasyEReceipt } },
      group4: { title: "เงินบริจาค (การศึกษา/ทั่วไป)", total: round2(group4Total), items: { g4Education2x: round2(g4Education2x), g4General: round2(g4General) } },
      totalAllowances: round2(totalAllowances),
    },
    netTaxableIncome,
    bracketDetails,
    progressiveTax: progressive.total,
    flatHalfPercent,
    finalTaxPayable,
    effectiveTaxRate: revenue > 0 ? (finalTaxPayable / revenue) * 100 : 0,
  };
}

// Calculate Corporate Income Tax (estimate only)
export function calculateCIT(revenue: number, expenses: number, isSme: boolean = true) {
  const netProfit = Math.max(0, revenue - expenses);

  if (!isSme) {
    const tax = round2(netProfit * 0.2);
    return {
      revenue,
      expenses,
      netProfit,
      isSme: false,
      brackets: [{ min: 0, max: Infinity, rate: 0.2, label: "ทุกจำนวน", rateLabel: "20%", taxable: netProfit, tax }],
      totalTax: tax,
      effectiveTaxRate: netProfit > 0 ? (tax / netProfit) * 100 : 0,
    };
  }

  const { details, total } = applyBrackets(netProfit, CIT_SME_BRACKETS);
  return {
    revenue,
    expenses,
    netProfit,
    isSme: true,
    brackets: details,
    totalTax: total,
    effectiveTaxRate: netProfit > 0 ? (total / netProfit) * 100 : 0,
  };
}

export { formatTHB } from "@/lib/utils";

