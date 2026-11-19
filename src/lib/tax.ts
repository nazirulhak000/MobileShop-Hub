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

// Thai Personal Income Tax Progressive Brackets (0% - 35%)
export const PIT_BRACKETS = [
  { min: 0, max: 150000, rate: 0.0, label: "0 - 150,000 บาท", rateLabel: "0% (ยกเว้นภาษี)" },
  { min: 150001, max: 300000, rate: 0.05, label: "150,001 - 300,000 บาท", rateLabel: "5%" },
  { min: 300001, max: 500000, rate: 0.1, label: "300,001 - 500,000 บาท", rateLabel: "10%" },
  { min: 500001, max: 750000, rate: 0.15, label: "500,001 - 750,000 บาท", rateLabel: "15%" },
  { min: 750001, max: 1000000, rate: 0.2, label: "750,001 - 1,000,000 บาท", rateLabel: "20%" },
  { min: 1000001, max: 2000000, rate: 0.25, label: "1,000,001 - 2,000,000 บาท", rateLabel: "25%" },
  { min: 2000001, max: 5000000, rate: 0.3, label: "2,000,001 - 5,000,000 บาท", rateLabel: "30%" },
  { min: 5000001, max: Infinity, rate: 0.35, label: "5,000,001 บาทขึ้นไป", rateLabel: "35%" },
];

// Thai Corporate Income Tax SME Brackets
export const CIT_SME_BRACKETS = [
  { min: 0, max: 300000, rate: 0.0, label: "0 - 300,000 บาท", rateLabel: "0% (ยกเว้นภาษี)" },
  { min: 300001, max: 3000000, rate: 0.15, label: "300,001 - 3,000,000 บาท", rateLabel: "15%" },
  { min: 3000001, max: Infinity, rate: 0.2, label: "3,000,001 บาทขึ้นไป", rateLabel: "20%" },
];

// Calculate Personal Income Tax
export function calculatePIT(revenue: number, settings: TaxSettings) {
  // 1. Calculate Expenses
  let expenseAmount = 0;
  if (settings.expenseDeductionMethod === "FLAT_60") {
    expenseAmount = revenue * 0.6; // Flat 60% deduction for 40(8) retail/repair
  } else {
    expenseAmount = settings.actualExpenses;
  }
  const incomeAfterExpenses = Math.max(0, revenue - expenseAmount);

  // 2. Calculate Allowances
  // Group 1: Personal & Family
  const g1Personal = 60000;
  const g1Spouse = settings.spouseAllowance ? 60000 : 0;
  const g1Child = (settings.childCount || 0) * 30000;
  const g1Parents = Math.min(4, settings.parentsCount || 0) * 30000;
  const g1ParentsHealth = Math.min(15000, settings.parentsHealthInsurance || 0);
  const group1Total = g1Personal + g1Spouse + g1Child + g1Parents + g1ParentsHealth;

  // Group 2: Insurance & Retirement
  // General Life (max 100k) + Health (max 25k), combined max 100k
  const rawHealth = Math.min(25000, settings.healthInsurance || 0);
  const rawLife = Math.min(100000, settings.lifeInsurance || 0);
  const g2LifeAndHealth = Math.min(100000, rawLife + rawHealth);
  const g2SocialSecurity = Math.min(9000, settings.socialSecurity || 0);

  // Retirement funds combined limit (max 500,000 excl. Thai ESG)
  const rawRmf = Math.min(500000, settings.rmfFund || 0);
  const rawSsf = Math.min(200000, settings.ssfFund || 0);
  const rawPvd = Math.min(500000, settings.providentFund || 0);
  const retirementPool = Math.min(500000, rawRmf + rawSsf + rawPvd);

  // Thai ESG has separate cap 300,000 (new 2568)
  const g2ThaiEsg = Math.min(300000, settings.thaiEsgFund || 0);
  const group2Total = g2LifeAndHealth + g2SocialSecurity + retirementPool + g2ThaiEsg;

  // Group 3: Stimulus & Real Estate
  const g3HomeLoan = Math.min(100000, settings.homeLoanInterest || 0);
  const g3EasyEReceipt = Math.min(50000, settings.easyEReceipt || 0);
  const group3Total = g3HomeLoan + g3EasyEReceipt;

  // Pre-donation net income
  const totalAllowancesBeforeDonations = group1Total + group2Total + group3Total;
  const preDonationNetIncome = Math.max(0, incomeAfterExpenses - totalAllowancesBeforeDonations);

  // Group 4: Donations (Cap 10% of preDonationNetIncome each)
  const donationCap = preDonationNetIncome * 0.1;
  const g4Education2x = Math.min(donationCap, (settings.educationDonation || 0) * 2);
  const g4General = Math.min(donationCap - g4Education2x > 0 ? donationCap - g4Education2x : 0, settings.generalDonation || 0);
  const group4Total = g4Education2x + g4General;

  const totalAllowances = totalAllowancesBeforeDonations + group4Total;
  const netTaxableIncome = Math.max(0, incomeAfterExpenses - totalAllowances);

  // 3. Progressive Tax Calculation
  let remaining = netTaxableIncome;
  let totalTax = 0;
  const bracketDetails = PIT_BRACKETS.map((b) => {
    if (remaining <= 0) {
      return { ...b, taxableInBracket: 0, taxAmount: 0 };
    }
    const bracketSpan = b.max === Infinity ? Infinity : b.max - b.min;
    const taxableInBracket = Math.min(remaining, bracketSpan);
    const taxAmount = taxableInBracket * b.rate;
    remaining -= taxableInBracket;
    totalTax += taxAmount;
    return { ...b, taxableInBracket, taxAmount };
  });

  // Flat 0.5% check for 40(8) if revenue > 1,000,000
  const flatHalfPercent = revenue > 1000000 ? revenue * 0.005 : 0;
  const finalTaxPayable = Math.max(totalTax, flatHalfPercent);

  return {
    revenue,
    expenseAmount,
    incomeAfterExpenses,
    allowanceBreakdown: {
      group1: { title: "ลดหย่อนส่วนตัวและครอบครัว", total: group1Total, items: { g1Personal, g1Spouse, g1Child, g1Parents, g1ParentsHealth } },
      group2: { title: "ประกัน การออม และกองทุนลดหย่อนภาษี (SSF/RMF/Thai ESG)", total: group2Total, items: { g2LifeAndHealth, g2SocialSecurity, retirementPool, g2ThaiEsg } },
      group3: { title: "กระตุ้นเศรษฐกิจ & อสังหาริมทรัพย์ (Easy E-Receipt)", total: group3Total, items: { g3HomeLoan, g3EasyEReceipt } },
      group4: { title: "เงินบริจาค (การศึกษา/ทั่วไป)", total: group4Total, items: { g4Education2x, g4General } },
      totalAllowances,
    },
    netTaxableIncome,
    bracketDetails,
    progressiveTax: totalTax,
    flatHalfPercent,
    finalTaxPayable,
    effectiveTaxRate: revenue > 0 ? (finalTaxPayable / revenue) * 100 : 0,
  };
}

// Calculate Corporate Income Tax (CIT)
export function calculateCIT(revenue: number, expenses: number, isSme: boolean = true) {
  const netProfit = Math.max(0, revenue - expenses);

  if (!isSme) {
    const tax = netProfit * 0.2;
    return {
      revenue,
      expenses,
      netProfit,
      isSme: false,
      brackets: [{ min: 0, max: Infinity, rate: 0.2, taxable: netProfit, tax }],
      totalTax: tax,
      effectiveTaxRate: netProfit > 0 ? (tax / netProfit) * 100 : 0,
    };
  }

  let remaining = netProfit;
  let totalTax = 0;
  const brackets = CIT_SME_BRACKETS.map((b) => {
    if (remaining <= 0) return { ...b, taxable: 0, tax: 0 };
    const span = b.max === Infinity ? Infinity : b.max - b.min;
    const taxable = Math.min(remaining, span);
    const tax = taxable * b.rate;
    remaining -= taxable;
    totalTax += tax;
    return { ...b, taxable, tax };
  });

  return {
    revenue,
    expenses,
    netProfit,
    isSme: true,
    brackets,
    totalTax,
    effectiveTaxRate: netProfit > 0 ? (totalTax / netProfit) * 100 : 0,
  };
}

export { formatTHB } from "@/lib/utils";

