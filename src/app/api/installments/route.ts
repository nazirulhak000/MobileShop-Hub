import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Initial mock installment contracts if none in DB
let mockInstallments: any[] = [
  {
    id: "inst-001",
    contractNo: "INS-202611-001",
    customerName: "คุณธนกร รัตนสิทธิ",
    customerPhone: "081-234-5678",
    nationalId: "1100400123451",
    deviceModel: "iPhone 14 Pro Max 256GB Deep Purple",
    imei: "354928110293847",
    totalPrice: 28900,
    downPayment: 8900,
    financedAmount: 20000,
    termMonths: 10,
    monthlyInterestRate: 1.5,
    monthlyPayment: 2300,
    startDate: "2026-08-01",
    status: "ACTIVE",
    paidMonths: 4,
    nextDueDate: "2026-12-01",
    isOverdue: false,
    payments: [
      { month: 1, dueDate: "2026-09-01", amount: 2300, paidDate: "2026-09-01", status: "PAID", ref: "TXN-9012" },
      { month: 2, dueDate: "2026-10-01", amount: 2300, paidDate: "2026-09-30", status: "PAID", ref: "TXN-9034" },
      { month: 3, dueDate: "2026-11-01", amount: 2300, paidDate: "2026-11-01", status: "PAID", ref: "TXN-9088" },
      { month: 4, dueDate: "2026-12-01", amount: 2300, paidDate: "2026-11-28", status: "PAID", ref: "TXN-9110" },
      { month: 5, dueDate: "2027-01-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
      { month: 6, dueDate: "2027-02-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
      { month: 7, dueDate: "2027-03-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
      { month: 8, dueDate: "2027-04-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
      { month: 9, dueDate: "2027-05-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
      { month: 10, dueDate: "2027-06-01", amount: 2300, paidDate: null, status: "PENDING", ref: null },
    ],
  },
  {
    id: "inst-002",
    contractNo: "INS-202611-002",
    customerName: "คุณพิมพ์ชนก สิริพร",
    customerPhone: "089-876-5432",
    nationalId: "3100500987654",
    deviceModel: "Samsung Galaxy S23 Ultra 512GB",
    imei: "359182736451099",
    totalPrice: 24900,
    downPayment: 6900,
    financedAmount: 18000,
    termMonths: 6,
    monthlyInterestRate: 0,
    monthlyPayment: 3000,
    startDate: "2026-06-15",
    status: "OVERDUE",
    paidMonths: 3,
    nextDueDate: "2026-10-15",
    isOverdue: true,
    overdueDays: 35,
    payments: [
      { month: 1, dueDate: "2026-07-15", amount: 3000, paidDate: "2026-07-14", status: "PAID", ref: "TXN-8762" },
      { month: 2, dueDate: "2026-08-15", amount: 3000, paidDate: "2026-08-15", status: "PAID", ref: "TXN-8891" },
      { month: 3, dueDate: "2026-09-15", amount: 3000, paidDate: "2026-09-18", status: "PAID", ref: "TXN-8945" },
      { month: 4, dueDate: "2026-10-15", amount: 3000, paidDate: null, status: "OVERDUE", ref: null },
      { month: 5, dueDate: "2026-11-15", amount: 3000, paidDate: null, status: "OVERDUE", ref: null },
      { month: 6, dueDate: "2026-12-15", amount: 3000, paidDate: null, status: "PENDING", ref: null },
    ],
  },
  {
    id: "inst-003",
    contractNo: "INS-202610-008",
    customerName: "คุณอนันต์ พัฒนเดช",
    customerPhone: "095-555-1234",
    nationalId: "1100600456789",
    deviceModel: "iPhone 13 128GB Midnight",
    imei: "354928110293848",
    totalPrice: 14900,
    downPayment: 4900,
    financedAmount: 10000,
    termMonths: 4,
    monthlyInterestRate: 1.0,
    monthlyPayment: 2600,
    startDate: "2026-07-01",
    status: "COMPLETED",
    paidMonths: 4,
    nextDueDate: null,
    isOverdue: false,
    payments: [
      { month: 1, dueDate: "2026-08-01", amount: 2600, paidDate: "2026-08-01", status: "PAID", ref: "TXN-8011" },
      { month: 2, dueDate: "2026-09-01", amount: 2600, paidDate: "2026-09-01", status: "PAID", ref: "TXN-8120" },
      { month: 3, dueDate: "2026-10-01", amount: 2600, paidDate: "2026-10-01", status: "PAID", ref: "TXN-8245" },
      { month: 4, dueDate: "2026-11-01", amount: 2600, paidDate: "2026-11-01", status: "PAID", ref: "TXN-8390" },
    ],
  },
];

export async function GET(request: NextRequest) {
  return NextResponse.json({ success: true, data: mockInstallments });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerName,
      customerPhone,
      nationalId,
      deviceModel,
      imei,
      totalPrice,
      downPayment,
      termMonths,
      monthlyInterestRate,
    } = body;

    const financedAmount = Number(totalPrice) - Number(downPayment);
    const interestTotal = financedAmount * (Number(monthlyInterestRate) / 100) * Number(termMonths);
    const monthlyPayment = Math.round((financedAmount + interestTotal) / Number(termMonths));

    const contractNo = `INS-202611-${String(mockInstallments.length + 1).padStart(3, "0")}`;

    const payments = [];
    const now = new Date();
    for (let m = 1; m <= Number(termMonths); m++) {
      const dueDate = new Date(now);
      dueDate.setMonth(dueDate.getMonth() + m);
      payments.push({
        month: m,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: monthlyPayment,
        paidDate: null,
        status: "PENDING",
        ref: null,
      });
    }

    const newContract = {
      id: `inst-${Date.now()}`,
      contractNo,
      customerName,
      customerPhone,
      nationalId,
      deviceModel,
      imei,
      totalPrice: Number(totalPrice),
      downPayment: Number(downPayment),
      financedAmount,
      termMonths: Number(termMonths),
      monthlyInterestRate: Number(monthlyInterestRate),
      monthlyPayment,
      startDate: now.toISOString().split("T")[0],
      status: "ACTIVE",
      paidMonths: 0,
      nextDueDate: payments[0]?.dueDate,
      isOverdue: false,
      payments,
    };

    mockInstallments.unshift(newContract);

    return NextResponse.json({ success: true, data: newContract }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractId, monthIndex, paymentRef } = body;

    const contract = mockInstallments.find((c) => c.id === contractId);
    if (!contract) {
      return NextResponse.json({ success: false, error: "Contract not found" }, { status: 404 });
    }

    const payment = contract.payments[monthIndex];
    if (payment) {
      payment.status = "PAID";
      payment.paidDate = new Date().toISOString().split("T")[0];
      payment.ref = paymentRef || `TXN-${Math.floor(1000 + Math.random() * 9000)}`;
      contract.paidMonths += 1;

      if (contract.paidMonths >= contract.termMonths) {
        contract.status = "COMPLETED";
        contract.nextDueDate = null;
        contract.isOverdue = false;
      } else {
        const nextPending = contract.payments.find((p: any) => p.status === "PENDING" || p.status === "OVERDUE");
        contract.nextDueDate = nextPending ? nextPending.dueDate : null;
        contract.isOverdue = contract.payments.some((p: any) => p.status === "OVERDUE");
      }
    }

    return NextResponse.json({ success: true, data: contract });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
