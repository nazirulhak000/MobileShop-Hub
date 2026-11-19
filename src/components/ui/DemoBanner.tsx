import { AlertTriangle } from "lucide-react";

/**
 * Shown on pages whose data is sample/mock and is NOT saved to the database.
 * Keeps staff from treating demo numbers as real records.
 */
export function DemoBanner({ message }: { message?: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <span className="font-semibold">โหมดตัวอย่าง (DEMO)</span>{" "}
        {message ?? "ข้อมูลในหน้านี้เป็นตัวอย่าง ยังไม่ได้เชื่อมต่อฐานข้อมูล การบันทึกจะไม่ถูกเก็บจริง"}
      </div>
    </div>
  );
}
