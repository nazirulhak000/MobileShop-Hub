"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Search, Wrench, Plus, AlertCircle, Check } from "lucide-react";
import { formatTHB } from "@/lib/utils";

interface SparePartItem {
  id: string;
  code: string;
  name: string;
  brand?: string | null;
  model?: string | null;
  compatibleModels?: string | null;
  costPrice: number;
  sellPrice: number;
  stock: number;
}

interface PartsPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  repairJobId: string;
  branchId: string;
  onPartAdded: (updatedJob: any) => void;
}

export function PartsPickerModal({
  isOpen,
  onClose,
  repairJobId,
  branchId,
  onPartAdded,
}: PartsPickerModalProps) {
  const [parts, setParts] = useState<SparePartItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchParts();
    }
  }, [isOpen, branchId, search]);

  const fetchParts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/inventory/parts?branchId=${branchId}&search=${encodeURIComponent(search)}`
      );
      const json = await res.json();
      if (json.success) {
        setParts(json.data);
      } else {
        setError(json.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load parts");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPart = async (part: SparePartItem) => {
    if (part.stock <= 0) {
      alert("อะไหล่ชิ้นนี้สินค้าหมดในสต็อกสาขาปัจจุบัน");
      return;
    }

    setAddingId(part.id);
    setError(null);
    try {
      const res = await fetch(`/api/repairs/${repairJobId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: part.id,
          quantity: 1,
        }),
      });

      const json = await res.json();
      if (json.success) {
        onPartAdded(json.data);
        fetchParts(); // Refresh stock counts
      } else {
        alert(json.error || "เกิดข้อผิดพลาดในการเบิกอะไหล่");
      }
    } catch (err: any) {
      alert(err.message || "Failed to add part");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-slate-100">
          <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            เบิกอะไหล่จากคลังสต็อก (Spare Parts Picker)
          </DialogTitle>
          <div className="pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ค้นหาชื่ออะไหล่, รหัสอะไหล่, หรือรุ่นที่รองรับ (เช่น iPhone 14, S23)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              กำลังค้นหาอะไหล่ในสต็อก...
            </div>
          ) : parts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              ไม่พบรายการอะไหล่ที่ตรงกับคำค้นหา
            </div>
          ) : (
            parts.map((p) => {
              let compatible: string[] = [];
              if (p.compatibleModels) {
                try {
                  const parsed = JSON.parse(p.compatibleModels);
                  compatible = Array.isArray(parsed) ? parsed : [String(parsed)];
                } catch {
                  compatible = p.compatibleModels.split(",").map((s) => s.trim()).filter(Boolean);
                }
              }

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all"
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {p.code}
                      </span>
                      <span className="font-semibold text-xs text-slate-900">
                        {p.name}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {p.brand && <span>แบรนด์: {p.brand}</span>}
                      {compatible.length > 0 && (
                        <span>
                          • รองรับ: {compatible.join(", ")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs pt-0.5">
                      <span className="font-semibold text-blue-700">
                        ราคาขาย: {formatTHB(p.sellPrice)}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        (ต้นทุน: {formatTHB(p.costPrice)})
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          p.stock > 0
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        สต็อก {p.stock} ชิ้น
                      </span>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      variant={p.stock > 0 ? "primary" : "secondary"}
                      disabled={p.stock <= 0 || addingId === p.id}
                      onClick={() => handleAddPart(p)}
                      className="h-8 px-3 text-xs gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{addingId === p.id ? "กำลังเบิก..." : "เบิกใช้"}</span>
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
