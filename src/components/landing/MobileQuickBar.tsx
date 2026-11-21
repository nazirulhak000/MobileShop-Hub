"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { extractTrackingToken, TRACKING_INPUT_ERROR } from "./trackingToken";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import {
  Search,
  Phone,
  MessageCircle,
  Calculator,
  X,
  ArrowRight,
  Smartphone,
  AlertCircle,
  CalendarDays,
} from "lucide-react";

interface MobileQuickBarProps {
  /** Real shop phone; the call button is hidden when missing. */
  phone?: string | null;
  /** LINE OA id (e.g. "@myshop"); the LINE button is hidden when missing. */
  lineId?: string | null;
  /** Tenant shop slug for tenant-scoped portal navigation. */
  shopSlug?: string;
  /** Show the "ประเมินราคา" shortcut (only when the page renders #estimate). */
  showEstimate?: boolean;
  /** Theme color palette */
  themeColor?: StorefrontThemeColor;
}

export function MobileQuickBar({ phone, lineId, shopSlug, showEstimate = true, themeColor = "blue" }: MobileQuickBarProps = {}) {
  const theme = THEME_PALETTES[themeColor] || THEME_PALETTES.blue;
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [quickCode, setQuickCode] = useState("");
  const [modalError, setModalError] = useState("");
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  // Keyboard accessibility: Escape key listener, Tab focus trap, and body scroll lock
  useEffect(() => {
    if (!showTrackModal) return;

    // Lock body scroll
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setShowTrackModal(false);
        triggerButtonRef.current?.focus();
        return;
      }

      // Tab key focus trap inside modal dialog
      if (e.key === "Tab" && modalContainerRef.current) {
        const focusableElements = modalContainerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [showTrackModal]);

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
  const columns = 1 + (shopSlug ? 1 : 0) + (showEstimate ? 1 : 0) + (phone ? 1 : 0) + (lineUrl ? 1 : 0);
  const gridCols = ["grid-cols-1", "grid-cols-2", "grid-cols-3", "grid-cols-4", "grid-cols-5"][
    Math.max(0, Math.min(4, columns - 1))
  ] || "grid-cols-1";

  return (
    <>
      {/* Mobile Fixed Bottom Action Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2 pb-safe shadow-xs">
        <div className={`grid ${gridCols} gap-1 items-center`}>
          {/* Action 1: Track Repair */}
          <button
            ref={triggerButtonRef}
            type="button"
            onClick={() => {
              setShowTrackModal(true);
              setModalError("");
            }}
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
            aria-label="ตรวจสอบสถานะงานซ่อม"
          >
            <div className={`h-7 w-7 rounded-lg ${theme.lightBg} ${theme.lightText} flex items-center justify-center border ${theme.lightBorder}`}>
              <Search className="h-4 w-4" />
            </div>
            <span className="text-[11px] font-medium mt-1 tracking-tight">เช็คสถานะ</span>
          </button>

          {/* Action 2: Book / Customer Portal (when shopSlug present) */}
          {shopSlug && (
            <Link
              href={`/s/${shopSlug}`}
              className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-teal-800 hover:bg-teal-50 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
              aria-label="พอร์ทัลลูกค้าและจองคิว"
            >
              <div className="h-7 w-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium mt-1 tracking-tight">จองคิว/ลูกค้า</span>
            </Link>
          )}

          {/* Action 2: Price Estimator */}
          {showEstimate && (
          <a
            href="#estimate"
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
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
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
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
            className={`min-h-[48px] flex flex-col items-center justify-center py-1 px-1 rounded-xl text-slate-800 hover:bg-slate-100 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 ${theme.focusVisibleRing}`}
            aria-label="ทักแชท LINE ปรึกษาช่าง"
          >
            <div className={`h-7 w-7 rounded-lg ${theme.navCta} flex items-center justify-center shadow-2xs`}>
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
          ref={modalContainerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="track-modal-title"
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
                  <Smartphone className={`h-4 w-4 ${theme.lightAccentText}`} />
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
                  className={`w-full min-h-[44px] px-3.5 rounded-xl border bg-slate-50 focus:bg-white text-xs sm:text-sm font-mono tracking-wide tabular-nums focus:outline-none focus:ring-2 ${theme.focusRing} ${
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
                <ArrowRight className={`h-4 w-4 ${theme.accentText}`} />
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
