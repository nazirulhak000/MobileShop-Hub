export const RepairStatus = {
  PENDING: "PENDING",
  DIAGNOSING: "DIAGNOSING",
  WAITING_PARTS: "WAITING_PARTS",
  REPAIRING: "REPAIRING",
  QC_PASSED: "QC_PASSED",
  READY: "READY",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type RepairStatusType = keyof typeof RepairStatus;

export const RepairStatusMap: Record<
  RepairStatusType,
  { label: string; color: string; bg: string; border: string }
> = {
  PENDING: {
    label: "รอตรวจรับ",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  DIAGNOSING: {
    label: "กำลังตรวจเช็ค",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  WAITING_PARTS: {
    label: "รออะไหล่",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  REPAIRING: {
    label: "กำลังซ่อม",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
  QC_PASSED: {
    label: "ผ่าน QC แล้ว",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
  },
  READY: {
    label: "พร้อมส่งมอบ",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  COMPLETED: {
    label: "ส่งมอบเสร็จสิ้น",
    color: "text-gray-700",
    bg: "bg-gray-100",
    border: "border-gray-300",
  },
  CANCELLED: {
    label: "ยกเลิกการซ่อม",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
};

export const ProductCategory = {
  ACCESSORY: "ACCESSORY",
  SPARE_PART: "SPARE_PART",
  DEVICE: "DEVICE",
} as const;

export type ProductCategoryType = keyof typeof ProductCategory;

export const UserRole = {
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  TECHNICIAN: "TECHNICIAN",
  CASHIER: "CASHIER",
} as const;

export type UserRoleType = keyof typeof UserRole;

export const PaymentMethod = {
  CASH: "CASH",
  PROMPTPAY: "PROMPTPAY",
  CARD: "CARD",
  SPLIT: "SPLIT",
} as const;

export type PaymentMethodType = keyof typeof PaymentMethod;
