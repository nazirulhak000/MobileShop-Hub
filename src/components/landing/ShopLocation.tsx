"use client";

import React from "react";
import {
  MapPin,
  Clock,
  Phone,
  Navigation,
  ExternalLink,
  Car,
  Train,
  MessageCircle,
} from "lucide-react";

interface ShopLocationProps {
  shopName?: string;
  branchName?: string;
  /** Real branch address. When missing, map / navigation buttons are hidden. */
  address?: string | null;
  /** Real branch phone. When missing, the call button is hidden. */
  phone?: string | null;
  /** LINE OA id (e.g. "@myshop"). When missing, the LINE card is hidden. */
  lineId?: string | null;
  /** Custom Google Maps URL. Overrides the auto-generated query when present. */
  googleMapsUrl?: string | null;
  /**
   * true = platform demo landing (/landing): shows sample content clearly labelled as an example.
   * false (tenant storefront, default): renders only the tenant's real data.
   */
  demo?: boolean;
}

const DEMO = {
  branchName: "สาขาตัวอย่าง (ข้อมูลสาธิต)",
  address: "ที่อยู่ตัวอย่าง — ร้านจริงจะแสดงที่อยู่สาขาของร้านที่นี่",
};

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function lineHref(lineId: string) {
  const id = lineId.trim();
  return `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith("@") ? id : `@${id}`)}`;
}

export function ShopLocation({
  shopName = "MobileShop-Hub",
  branchName,
  address,
  phone,
  lineId,
  googleMapsUrl,
  demo = false,
}: ShopLocationProps = {}) {
  const shownBranch = branchName || (demo ? DEMO.branchName : shopName);
  const shownAddress = address || (demo ? DEMO.address : "");
  const mapsQuery = address ? encodeURIComponent(`${shopName} ${address}`) : "";
  const mapsHref = googleMapsUrl || (mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}` : "");
  const mapsEmbed = mapsQuery ? `https://www.google.com/maps?q=${mapsQuery}&output=embed` : "";
  const showRightColumn = Boolean(mapsEmbed || lineId || googleMapsUrl);

  return (
    <section id="location" className="py-16 sm:py-24 bg-slate-50 relative border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white text-slate-800 text-xs font-medium border border-slate-200">
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>{demo ? "ตัวอย่างส่วนแสดงที่ตั้งร้าน" : "ที่ตั้งและช่องทางติดต่อ"}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            สาขาและที่ตั้งศูนย์บริการ {shopName}
          </h2>
          {demo && (
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              ข้อมูลในส่วนนี้เป็นตัวอย่าง หน้าร้านจริงจะแสดงที่อยู่ เบอร์โทร และแผนที่ของสาขาที่ร้านตั้งค่าไว้
            </p>
          )}
        </div>

        {/* Location Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Store Details, Contact */}
          <div
            className={`${showRightColumn ? "lg:col-span-7" : "lg:col-span-12"} space-y-6 flex flex-col justify-between`}
          >
            <div className="space-y-6">
              {/* Main Store Info Card */}
              <div className="p-6 sm:p-7 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900">{shownBranch}</h3>
                    {shownAddress && (
                      <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed tabular-nums">
                        {shownAddress}
                      </p>
                    )}
                  </div>

                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-[44px] min-w-[44px] p-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors duration-150 motion-reduce:transition-none shrink-0 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                      title="เปิดแผนที่นำทาง"
                      aria-label="เปิดแผนที่นำทาง Google Maps"
                    >
                      <Navigation className="h-5 w-5" />
                    </a>
                  )}
                </div>

                {demo && (
                  <>
                    {/* Operating Hours Box (sample content, demo landing only) */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs flex-wrap sm:flex-nowrap gap-3">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-emerald-700 shrink-0" />
                        <div>
                          <div className="font-semibold text-slate-900">เวลาทำการ (ตัวอย่าง)</div>
                          <div className="text-slate-500 mt-0.5 tabular-nums font-mono">จันทร์ - อาทิตย์: 09:00 - 20:00 น.</div>
                        </div>
                      </div>
                    </div>

                    {/* Transportation & Parking Badges (sample) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 text-xs">
                        <div className="h-9 w-9 rounded-lg bg-white text-slate-800 border border-slate-200 flex items-center justify-center shrink-0">
                          <Train className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">การเดินทาง (ตัวอย่าง)</div>
                          <div className="text-slate-500 tabular-nums">ใกล้รถไฟฟ้า</div>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3 text-xs">
                        <div className="h-9 w-9 rounded-lg bg-white text-slate-800 border border-slate-200 flex items-center justify-center shrink-0">
                          <Car className="h-5 w-5 text-emerald-700" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">ที่จอดรถ (ตัวอย่าง)</div>
                          <div className="text-slate-500 tabular-nums">มีที่จอดรถหน้าร้าน</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Direct Quick Contact Button (only a real number) */}
              {phone && (
                <a
                  href={telHref(phone)}
                  className="min-h-[44px] flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-400 transition-colors duration-150 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-slate-100 text-slate-800 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-colors">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">โทรหาร้าน</div>
                      <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">{phone}</div>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 group-hover:text-slate-900" />
                </a>
              )}
            </div>

            {/* Google Maps External Button */}
            {mapsHref && (
              <a
                href={mapsHref}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] w-full py-3.5 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <Navigation className="h-4 w-4 text-emerald-400" />
                <span>เปิดระบบนำทางด้วย Google Maps</span>
              </a>
            )}
          </div>

          {/* Right Column: Map + LINE OA box — only rendered when real data exists */}
          {showRightColumn && (
            <div className="lg:col-span-5 space-y-6 flex flex-col justify-between">
              {mapsEmbed && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] flex items-center justify-center">
                  <iframe
                    title={`แผนที่ ${shownBranch}`}
                    src={mapsEmbed}
                    className="w-full h-full border-0"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs flex items-center gap-1.5 text-xs font-semibold text-slate-900 pointer-events-none">
                    <MapPin className="h-4 w-4 text-emerald-700" />
                    <span>{shownBranch}</span>
                  </div>
                </div>
              )}

              {lineId && (
                <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase text-emerald-400 font-medium block">
                        LINE Official Account
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-1">แอด LINE เพื่อสอบถามร้าน</h4>
                    </div>
                    <div className="h-9 w-9 rounded-lg bg-slate-800 text-emerald-400 flex items-center justify-center border border-slate-700">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div className="text-slate-300">เพิ่มเพื่อนด้วย LINE ID:</div>
                    <div className="font-mono text-xs font-semibold text-emerald-400 bg-slate-800 px-3 py-1 rounded-md inline-block border border-slate-700 tabular-nums">
                      {lineId}
                    </div>
                  </div>

                  <a
                    href={lineHref(lineId)}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[44px] w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl flex items-center justify-center gap-2 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  >
                    <span>เปิดแอปพลิเคชัน LINE</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
