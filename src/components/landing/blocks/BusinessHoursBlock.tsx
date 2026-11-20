"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  CalendarCheck,
  CalendarDays,
  PhoneCall,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { StorefrontThemeColor, THEME_PALETTES } from "@/lib/storefrontTheme";
import { BusinessHoursBlockProps, BusinessDaySchedule } from "./types";

const DEFAULT_SCHEDULE: BusinessDaySchedule[] = [
  {
    day: "วันจันทร์ - วันศุกร์ (Mon - Fri)",
    openTime: "09:00",
    closeTime: "19:30",
    hoursText: "09:00 - 19:30 น.",
    isClosed: false,
  },
  {
    day: "วันเสาร์ (Saturday)",
    openTime: "10:00",
    closeTime: "18:30",
    hoursText: "10:00 - 18:30 น.",
    isClosed: false,
  },
  {
    day: "วันอาทิตย์ (Sunday)",
    openTime: "10:00",
    closeTime: "18:30",
    hoursText: "10:00 - 18:30 น.",
    isClosed: false,
  },
  {
    day: "วันหยุดนักขัตฤกษ์ (Public Holidays)",
    openTime: "10:00",
    closeTime: "18:00",
    hoursText: "10:00 - 18:00 น. (เปิดปกติ)",
    isClosed: false,
  },
];

/**
 * Calculates whether the store is currently open based on Bangkok time (UTC+7)
 */
function getBangkokCurrentStatus(schedule: BusinessDaySchedule[]) {
  try {
    if (!Array.isArray(schedule) || schedule.length === 0) {
      return {
        isOpen: true,
        message: "เปิดให้บริการตามเวลาทำการ",
        subMessage: "สอบถามเพิ่มเติมได้ตลอดเวลา",
      };
    }

    const now = new Date();
    // Format to Bangkok time
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour12: false,
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
    });

    const parts = formatter.formatToParts(now);
    let weekday = "";
    let hour = 0;
    let minute = 0;

    for (const part of parts) {
      if (part.type === "weekday") weekday = part.value; // e.g. Mon, Tue, Sat, Sun
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    }

    const currentMinutes = hour * 60 + minute;

    // Map weekday to typical schedule item
    let relevantItem: BusinessDaySchedule | undefined;
    if (["Mon", "Tue", "Wed", "Thu", "Fri"].includes(weekday)) {
      relevantItem = schedule.find(
        (s) =>
          s?.day?.includes("จันทร์") ||
          s?.day?.includes("ศุกร์") ||
          s?.day?.includes("Mon")
      );
    } else if (weekday === "Sat") {
      relevantItem =
        schedule.find((s) => s?.day?.includes("เสาร์") || s?.day?.includes("Sat")) ||
        schedule.find((s) => s?.day?.includes("อาทิตย์"));
    } else if (weekday === "Sun") {
      relevantItem =
        schedule.find((s) => s?.day?.includes("อาทิตย์") || s?.day?.includes("Sun")) ||
        schedule.find((s) => s?.day?.includes("เสาร์"));
    }

    if (!relevantItem || relevantItem.isClosed) {
      return {
        isOpen: false,
        message: "ขณะนี้ปิดทำการ",
        subMessage: "เปิดให้บริการในวันทำการถัดไป",
      };
    }

    const [openH, openM] = String(relevantItem.openTime || "09:00").split(":").map(Number);
    const [closeH, closeM] = String(relevantItem.closeTime || "19:30").split(":").map(Number);

    const openMinutes = (Number(openH) || 9) * 60 + (Number(openM) || 0);
    const closeMinutes = (Number(closeH) || 19) * 60 + (Number(closeM) || 30);

    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      return {
        isOpen: true,
        message: "เปิดให้บริการอยู่ (Open Now)",
        subMessage: `ปิดให้บริการเวลา ${relevantItem.closeTime || "19:30"} น.`,
      };
    } else {
      return {
        isOpen: false,
        message: "ขณะนี้ปิดทำการ (Closed)",
        subMessage: `เปิดให้บริการวันถัดไปเวลา ${relevantItem.openTime || "09:00"} น.`,
      };
    }
  } catch (_) {
    return {
      isOpen: true,
      message: "เปิดให้บริการตามเวลาทำการ",
      subMessage: "สอบถามเพิ่มเติมได้ตลอดเวลา",
    };
  }
}

export function BusinessHoursBlock({
  title,
  subtitle,
  schedule,
  hours,
  emergencyNote,
  showLiveStatus = true,
  phone,
  lineId,
  themeColor = "emerald",
  className = "",
  data,
}: BusinessHoursBlockProps) {
  const resolvedTitle = title || data?.title || "เวลาทำการและตารางเปิดให้บริการ";
  const resolvedSubtitle =
    subtitle ||
    data?.subtitle ||
    "ยินดีต้อนรับทุกท่าน พร้อมให้บริการงานซ่อมด่วน ตรวจเช็คสภาพเครื่อง และปรึกษาปัญหาทางเทคนิค";
  const resolvedSchedule: BusinessDaySchedule[] = useMemo(() => {
    const rawList = schedule || hours || data?.schedule || data?.hours;
    if (Array.isArray(rawList) && rawList.length > 0) {
      const valid = rawList.filter(Boolean);
      if (valid.length > 0) {
        return valid.map((item: any) => ({
          day: String(item?.day || ""),
          openTime: item?.openTime || item?.open || "09:00",
          closeTime: item?.closeTime || item?.close || "19:30",
          hoursText:
            item?.hoursText ||
            (item?.open && item?.close
              ? `${item.open} - ${item.close} น.`
              : item?.openTime && item?.closeTime
              ? `${item.openTime} - ${item.closeTime} น.`
              : undefined),
          isClosed: Boolean(item?.isClosed),
        }));
      }
    }
    return DEFAULT_SCHEDULE;
  }, [schedule, hours, data?.schedule, data?.hours]);

  const resolvedEmergencyNote =
    emergencyNote ||
    data?.emergencyNote ||
    "สำหรับเคสฉุกเฉินนอกเวลาทำการ สามารถส่งข้อความผ่าน LINE OA ไว้ได้ตลอด 24 ชั่วโมง เจ้าหน้าที่จะรีบติดต่อกลับโดยเร็วที่สุด";

  const resolvedPhone = phone || data?.phone;
  const resolvedLineId = lineId || data?.lineId;
  const resolvedShowLive =
    showLiveStatus !== undefined
      ? showLiveStatus
      : data?.showLiveStatus !== undefined
      ? Boolean(data?.showLiveStatus)
      : true;

  const [liveStatus, setLiveStatus] = useState(() =>
    getBangkokCurrentStatus(resolvedSchedule)
  );

  // Update live status periodically
  useEffect(() => {
    if (!resolvedShowLive) return;
    const interval = setInterval(() => {
      setLiveStatus(getBangkokCurrentStatus(resolvedSchedule));
    }, 60000);
    return () => clearInterval(interval);
  }, [resolvedShowLive, resolvedSchedule]);

  const palette = THEME_PALETTES[themeColor] || THEME_PALETTES.emerald;

  return (
    <section
      className={`w-full py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto ${className}`}
      aria-label="Business Hours"
    >
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-10 md:p-12 shadow-2xl backdrop-blur-md">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md shadow-sm border-slate-700/80 bg-slate-900/80 text-white">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>เวลาทำการ</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {resolvedTitle}
          </h2>

          {resolvedSubtitle && (
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              {resolvedSubtitle}
            </p>
          )}

          {/* Live Status Badge */}
          {resolvedShowLive && (
            <div className="pt-2 flex justify-center">
              <div
                className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-md text-xs sm:text-sm font-bold ${
                  liveStatus.isOpen
                    ? "bg-emerald-950/80 text-emerald-300 border-emerald-700/80"
                    : "bg-rose-950/80 text-rose-300 border-rose-700/80"
                }`}
              >
                <span className="relative flex h-3 w-3">
                  {liveStatus.isOpen && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex rounded-full h-3 w-3 ${
                      liveStatus.isOpen ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                </span>
                <span>{liveStatus.message}</span>
                <span className="text-slate-400 font-normal">
                  — {liveStatus.subMessage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Schedule Table */}
        <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-slate-950/60 overflow-hidden shadow-inner">
          {resolvedSchedule.map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 hover:bg-slate-900/40 transition-colors gap-2"
            >
              <div className="flex items-center gap-3">
                <CalendarDays className="w-5 h-5 text-emerald-400 shrink-0" />
                <span className="text-white font-medium text-sm sm:text-base">
                  {item.day}
                </span>
              </div>

              <div className="pl-8 sm:pl-0 flex items-center gap-2">
                {item.isClosed ? (
                  <span className="px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/80">
                    ปิดทำการ
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-lg text-xs sm:text-sm font-semibold bg-slate-800 text-slate-200 border border-slate-700">
                    {item.hoursText || `${item.openTime || "09:00"} - ${item.closeTime || "19:30"} น.`}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Emergency Note / Notice */}
        {resolvedEmergencyNote && (
          <div className="mt-8 p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3 text-slate-300 text-xs sm:text-sm leading-relaxed">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <p>{resolvedEmergencyNote}</p>
          </div>
        )}

        {/* Contact Links */}
        {(resolvedPhone || resolvedLineId) && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-center gap-4">
            {resolvedPhone && (
              <a
                href={`tel:${resolvedPhone.replace(/[^\d+]/g, "")}`}
                className="min-h-[44px] min-w-[44px] px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-sm font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>โทรนัดหมาย: {resolvedPhone}</span>
              </a>
            )}

            {resolvedLineId && (
              <a
                href={`https://line.me/R/ti/p/${encodeURIComponent(
                  resolvedLineId.startsWith("@") ? resolvedLineId : `@${resolvedLineId}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] min-w-[44px] px-6 py-2.5 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-sm font-semibold flex items-center gap-2 shadow-md shadow-[#06C755]/20 transition-all hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>สอบถาม LINE: {resolvedLineId}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default BusinessHoursBlock;
