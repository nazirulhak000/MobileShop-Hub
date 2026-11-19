"use client";

import React, { useState } from "react";
import {
  HelpCircle,
  ChevronDown,
  Lock,
  Clock,
  ShieldCheck,
  DollarSign,
  Smartphone,
  CreditCard,
  Package,
  MessageCircle,
} from "lucide-react";

interface FaqItem {
  id: string;
  question: string;
  icon: React.ElementType;
  answer: string;
  highlight?: string;
}

const FAQS: FaqItem[] = [
  {
    id: "faq-1",
    question: "ซ่อมมือถือแล้วข้อมูล รูปภาพ หรือแอปพลิเคชันในเครื่องจะสูญหายหรือไม่",
    icon: Lock,
    highlight: "ข้อมูลไม่สูญหาย 100% ปลอดภัย ไม่จำเป็นต้องแจ้งรหัสผ่านหน้าจอ",
    answer:
      "สำหรับงานซ่อมฮาร์ดแวร์ทั่วไป เช่น การเปลี่ยนชุดหน้าจอแท้ เปลี่ยนแบตเตอรี่ มอก. ลอกกระจกจอ OCA ซ่อมก้นชาร์จ หรือเปลี่ยนฝาหลัง ข้อมูลและแอปพลิเคชันทั้งหมดจะยังคงอยู่ครบถ้วน 100% ลูกค้าไม่จำเป็นต้องแจ้งรหัสผ่านปลดล็อคหน้าจอ หรือสามารถเปิดโหมดบำรุงรักษา (Maintenance Mode) ในระบบ Android ได้ ช่างของเราทำการทดสอบฮาร์ดแวร์ผ่านระบบฉุกเฉินและเมนูฮาร์ดแวร์เทสโดยไม่เข้าถึงข้อมูลส่วนตัว",
  },
  {
    id: "faq-2",
    question: "ใช้ระยะเวลาในการซ่อมนานเท่าใด สามารถนั่งรอรับเครื่องได้หรือไม่",
    icon: Clock,
    highlight: "งานซ่อมเปลี่ยนอะไหล่ทั่วไปใช้เวลาประมาณ 30 - 60 นาที นั่งรอรับได้เลย",
    answer:
      "งานซ่อมยอดนิยม เช่น เปลี่ยนหน้าจอแท้ OLED, เปลี่ยนแบตเตอรี่มาตรฐาน มอก., ลอกกระจกจอแท้ OCA หรือเปลี่ยนชุดพอร์ตชาร์จ ช่างจะลงมือซ่อมทันทีในแล็บหน้าร้าน ใช้เวลาเฉลี่ย 30 - 60 นาที มีห้องรับรองติดแอร์และบริการ Wi-Fi หากเป็นงานซ่อมวงจรเมนบอร์ดชิป IC หรือเครื่องตกน้ำ จะใช้เวลาประมาณ 1 - 3 ชั่วโมง ซึ่งลูกค้าสามารถติดตามความคืบหน้าผ่านระบบ Live Tracking ได้ตลอดเวลา",
  },
  {
    id: "faq-3",
    question: "ศูนย์บริการรับประกันงานซ่อมนานเท่าใด และมีเงื่อนไขอย่างไร",
    icon: ShieldCheck,
    highlight: "รับประกันอะไหล่ 90 - 180 วัน และแบตเตอรี่ มอก. รับประกัน 1 ปีเต็ม",
    answer:
      "งานซ่อมและเปลี่ยนอะไหล่ทุกชิ้นมีประกันคุณภาพอย่างเป็นทางการ 90 ถึง 180 วัน โดยระบบจะบันทึกข้อมูลการรับประกันไว้ในฐานข้อมูลดิจิทัลตามเลข IMEI 15 หลักประจำเครื่อง พร้อมสติ๊กเกอร์ QR Code ติดบนเครื่อง ลูกค้าไม่จำเป็นต้องพกใบเสร็จกระดาษ หากเกิดอาการผิดปกติจากการใช้งานทั่วไป สามารถนำเครื่องเข้ามาตรวจเช็คและเปลี่ยนอะไหล่ใหม่ได้ทันที",
  },
  {
    id: "faq-4",
    question: "หากนำเครื่องมาตรวจเช็คแล้วตัดสินใจไม่ซ่อม มีค่าใช้จ่ายหรือไม่",
    icon: DollarSign,
    highlight: "ตรวจเช็ควิเคราะห์อาการ 10 จุดฟรี ไม่มีค่าเปิดเครื่อง",
    answer:
      "ไม่มีค่าบริการใดๆ ทั้งสิ้น ทางเราให้บริการตรวจเช็คสภาพเครื่อง 10 จุด ตรวจวัดกระแสไฟและคลื่นความถี่ระดับแล็บ และวิเคราะห์อาการเสียฟรี พร้อมแจ้งราคาประเมินค่าอะไหล่และค่าแรงให้คุณทราบก่อนเสมอ หากพิจารณาแล้วไม่ประสงค์จะซ่อม สามารถรับเครื่องกลับได้ทันทีโดยไม่มีค่าเปิดเครื่อง",
  },
  {
    id: "faq-5",
    question: "ระบบติดตามงานซ่อมออนไลน์ (Live Tracking) ใช้งานอย่างไร",
    icon: Smartphone,
    highlight: "สแกน QR Code หรือเปิดลิงก์จากใบรับเครื่อง ตรวจดูสถานะได้ 24 ชั่วโมง",
    answer:
      "เมื่อนำเครื่องมาเปิดใบรับซ่อมที่หน้าร้าน ระบบจะพิมพ์ QR Code ลิงก์ติดตามงานเฉพาะเครื่องของคุณไว้บนใบรับเครื่อง ลูกค้าสแกนด้วยกล้องมือถือหรือเปิดลิงก์เพื่อดูสถานะงานซ่อมและกำหนดเสร็จโดยประมาณได้ทันที การอนุมัติราคาประเมินทำผ่านบัญชีลูกค้าหรือแจ้งร้านโดยตรง",
  },
  {
    id: "faq-6",
    question: "รองรับช่องทางการชำระเงินใดบ้าง และมีบริการผ่อนชำระหรือไม่",
    icon: CreditCard,
    highlight: "รองรับการโอนผ่าน Thai QR PromptPay, เงินสด, บัตรเครดิต และผ่อนชำระ",
    answer:
      "เรารองรับการชำระเงินหลากหลายรูปแบบ ได้แก่ สแกนจ่าย Thai QR PromptPay ทุกธนาคาร, บัตรเครดิตและเดบิตทุกสถาบันการเงิน รวมถึงมีบริการผ่อนเครื่องหรือผ่อนค่าซ่อมผ่านสัญญาสินเชื่อถูกต้องตามกฎหมาย อนุมัติรวดเร็วด้วยบัตรประชาชนใบเดียว",
  },
  {
    id: "faq-7",
    question: "อยู่ต่างจังหวัดหรือไม่สะดวกเดินทางมาหน้าร้าน สามารถส่งพัสดุได้หรือไม่",
    icon: Package,
    highlight: "สามารถส่งพัสดุทางไปรษณีย์หรือขนส่งเอกชน มีวิดีโอบันทึกขณะเปิดกล่องทุกชิ้น",
    answer:
      "สามารถส่งเครื่องมาซ่อมทางพัสดุได้จากทั่วประเทศ เมื่อพัสดุมาถึงศูนย์บริการ เจ้าหน้าที่จะบันทึกวิดีโอขณะเปิดกล่องพัสดุเพื่อความโปร่งใส ตรวจสอบประวัติเครื่องและเลข IMEI 15 หลักตามบัตร ปชช. และส่งลิงก์ Live Tracking ให้ลูกค้าทาง LINE ทันที เมื่อซ่อมเสร็จและผ่าน QC จะแพ็กกันกระแทกอย่างหนาแน่นและส่งกลับพร้อมประกันภัยพัสดุ",
  },
];

function lineAddFriendUrl(lineId: string) {
  const id = lineId.trim();
  return `https://line.me/R/ti/p/${encodeURIComponent(id.startsWith("@") ? id : `@${id}`)}`;
}

export function LandingFaq({ lineId }: { lineId?: string | null } = {}) {
  const [openId, setOpenId] = useState<string>("faq-1");

  const toggleAccordion = (id: string) => {
    setOpenId(openId === id ? "" : id);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-white relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200">
            <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
            <span>คำถามที่พบบ่อย (FAQ)</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            ข้อสงสัยทั่วไปเกี่ยวกับการส่งซ่อมสมาร์ตโฟน
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            รวบรวมคำถามที่ลูกค้าสอบถามเข้ามาบ่อย เพื่อความมั่นใจและความโปร่งใสก่อนตัดสินใจนำเครื่องเข้ารับบริการ
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {FAQS.map((item) => {
            const isOpen = openId === item.id;
            const IconComponent = item.icon;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition-colors duration-150 overflow-hidden ${
                  isOpen
                    ? "bg-slate-50 border-slate-300 shadow-2xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <button
                  type="button"
                  id={`faq-btn-${item.id}`}
                  aria-controls={`faq-answer-${item.id}`}
                  onClick={() => toggleAccordion(item.id)}
                  className="w-full min-h-[44px] p-4 sm:p-5 flex items-center justify-between gap-4 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isOpen
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>
                    <span className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                      {item.question}
                    </span>
                  </div>

                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 bg-slate-200 text-slate-900" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-btn-${item.id}`}
                    className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 pl-16 sm:pl-17"
                  >
                    {item.highlight && (
                      <div className="font-medium text-emerald-900 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-xs">
                        ✓ {item.highlight}
                      </div>
                    )}
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Box */}
        <div className="mt-12 p-6 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="h-11 w-11 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">ต้องการสอบถามอาการเสียเพิ่มเติม</h4>
              <p className="text-xs text-slate-300 mt-0.5">
                ทักแชทปรึกษาช่างเทคนิคผู้ชำนาญการโดยตรงได้ทันที ตรวจเช็ควิเคราะห์อาการเบื้องต้นฟรี
              </p>
            </div>
          </div>

          {lineId && (
          <a
            href={lineAddFriendUrl(lineId)}
            target="_blank"
            rel="noreferrer"
            className="min-h-[44px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shrink-0 shadow-2xs transition-colors duration-150 motion-reduce:transition-none flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <MessageCircle className="h-4 w-4" />
            <span>ปรึกษาช่างทาง LINE</span>
          </a>
          )}
        </div>
      </div>
    </section>
  );
}
