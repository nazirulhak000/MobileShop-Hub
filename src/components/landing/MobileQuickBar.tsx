"use client";

import React, { useState } from "react";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "./trackingToken";
import {
  Search,
  Phone,
  MessageCircle,
  Calculator,
  X,
  ArrowRight,
  Smartphone,
  AlertCircle,
} from "lucide-react";

interface MobileQuickBarProps {
  /** Real shop phone; the call button is hidden when missing. */
  phone?: string | null;
  /** LINE OA id (e.g. "@myshop"); the LINE button is hidden when missing. */
  lineId?: string | null;
  /** Show the "ประเมินราคา" shortcut (only when the page renders #estimate). */
  showEstimate?: boolean;
}

export function MobileQuickBar({ phone, lineId, showEstimate = true }: MobileQuickBarProps = {}) {
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [modalError, setModalError] = useState("");

  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractTrackingToken(quickCode);
    if (!token) {
      setModalError(TRACKING_INPUT_ERROR);
      return;
    }
    setModalError("");
    window.location.href = `/track/${token}`;
  };

  const lineUrl = lineId
    ? `https://line.me/R/ti/p/${encodeURIComponent(lineId.trim().startsWith("@") ? lineId.trim() : `@${lineId.trim()}`)}`
    : "";
  const columns = 1 + (showEstimate ? 1 : 0) + (phone ? 1 : 0) + (lineUrl ? 1 : 0);
  const gridCols = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4"][columns - 1];

  return (
    <>
      {/* Mobile Fixed Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 pb-safe shadow-xs">
        <div className={`grid ${gridCols} gap-1 items-center`}>
          {/* Action 1: Track Repair */}
          <button
            type="button"
            onClick={() => {
              setShowTrackModal(true);
              setModalError("");
            }}
            className="min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="ตรวจสอบสถานะงานซ่อม"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200">
              <Search className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium mt-1 tracking-tight">เช็คสถานะ</span>
          </button>

          {/* Action 2: Price Estimator */}
          {showEstimate && (
          <a
            href="#estimate"
            className="min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="ประเมินราคาซ่อม"
          >
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
              <Calculator className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium mt-1 tracking-tight">ประเมินราคา</span>
          </a>
          )}

          {/* Action 3: Call Phone (real number only) */}
          {phone && (
          <a
            href={`tel:${phone.replace(/[^\d+]/g, "")}`}
            className="min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label={`โทรสอบถาม ${phone}`}
          >
            <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200">
              <Phone className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium mt-1 tracking-tight">โทร</span>
          </a>
          )}

          {/* Action 4: LINE Chat (real LINE OA only) */}
          {lineUrl && (
          <a
            href={lineUrl}
            target="_blank"
            rel="noreferrer"
            className="min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-emerald-800 hover:bg-emerald-50 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="ทักแชท LINE ปรึกษาช่าง"
          >
            <div className="h-7 w-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium mt-1 tracking-tight">
              แชท LINE
            </span>
          </a>
          )}
        </div>
      </div>

      {/* Quick Track Bottom Sheet Modal for Mobile */}
      {showTrackModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-emerald-700" />
                </div>
                <h3 id="track-modal-title" className="text-sm font-semibold text-slate-900">
                  ตรวจสอบสถานะงานซ่อม (Live Tracking)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackModal(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 inline-flex items-center justify-center"
                aria-label="ปิดหน้าต่างค้นหา"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTrackSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="mobile-track-code" className="text-xs font-medium text-slate-700 block">
                  วางลิงก์ติดตามจากใบรับเครื่อง (หรือสแกน QR บนใบรับเครื่อง):
                </label>
                <input
                  id="mobile-track-code"
                  type="text"
                  placeholder="https://…/track/…"
                  value={quickCode}
                  onChange={(e) => {
                    setQuickCode(e.target.value);
                    if (modalError) setModalError("");
                  }}
                  className={`w-full min-h-[44px] px-3.5 rounded-xl border bg-slate-50 focus:bg-white text-xs sm:text-sm font-mono tracking-wide tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 ${
                    modalError ? "border-rose-400" : "border-slate-300"
                  }`}
                  autoFocus
                />
              </div>

              {modalError && (
                <div className="flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full min-h-[44px] bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors duration-150"
              >
                <span>ค้นหางานซ่อม</span>
                <ArrowRight className="h-4 w-4 text-emerald-400" />
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
