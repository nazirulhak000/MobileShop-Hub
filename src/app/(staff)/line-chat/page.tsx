"use client";

import React, { useState } from "react";
import { DemoBanner } from "@/components/ui/DemoBanner";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Send,
  Paperclip,
  CheckCheck,
  Smartphone,
  Wrench,
  DollarSign,
  QrCode,
  Key,
  CheckCircle2,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

interface ChatMessage {
  id: string;
  sender: "CUSTOMER" | "STAFF";
  text?: string;
  time: string;
  flexCard?: {
    type: "QUOTATION" | "REPAIR_DONE" | "PROMPTPAY";
    title: string;
    details: string;
    amount?: number;
    actionLabel: string;
  };
}

interface ChatConversation {
  id: string;
  customerName: string;
  lineId: string;
  phone: string;
  device: string;
  ticketCode: string;
  unreadCount: number;
  lastMessage: string;
  lastTime: string;
  branch: string;
  status: "ACTIVE_REPAIR" | "READY" | "COMPLETED";
  messages: ChatMessage[];
}

const INITIAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: "chat-1",
    customerName: "คุณกิตติศักดิ์ มหาชัย",
    lineId: "@kitti_m",
    phone: "089-123-4567",
    device: "iPhone 15 Pro Max (Natural Titanium)",
    ticketCode: "REP-202611-0001",
    unreadCount: 1,
    lastMessage: "ช่างครับ เครื่องเปลี่ยนหน้าจอเสร็จเรียบร้อยยังครับ?",
    lastTime: "14:28",
    branch: "HQ",
    status: "READY",
    messages: [
      { id: "m-1", sender: "STAFF", text: "สวัสดีครับคุณกิตติศักดิ์ ช่างเอกรับดูแลเคส iPhone 15 Pro Max จอแตกเรียบร้อยครับ", time: "11:15" },
      { id: "m-2", sender: "CUSTOMER", text: "ขอบคุณครับ ประมาณกี่โมงเสร็จครับ พอดีต้องใช้เครื่องทำงานเย็นนี้", time: "11:20" },
      {
        id: "m-3",
        sender: "STAFF",
        time: "14:10",
        flexCard: {
          type: "REPAIR_DONE",
          title: "เครื่องซ่อมเสร็จพร้อมรับแล้ว",
          details: "เปลี่ยนชุดหน้าจอแท้ OLED ผ่านการ QC 10 จุดเรียบร้อย พร้อมส่งมอบที่สาขา HQ สุขุมวิท",
          amount: 4200,
          actionLabel: "ดูใบรับประกันและสลิปดิจิทัล",
        },
      },
      { id: "m-4", sender: "CUSTOMER", text: "ช่างครับ เครื่องเปลี่ยนหน้าจอเสร็จเรียบร้อยยังครับ?", time: "14:28" },
    ],
  },
  {
    id: "chat-2",
    customerName: "คุณธนภัทร เจริญสุข",
    lineId: "@thanapat_j",
    phone: "081-998-2234",
    device: "Samsung Galaxy S24 Ultra",
    ticketCode: "REP-202611-0002",
    unreadCount: 0,
    lastMessage: "อนุมัติซ่อมเรียบร้อยครับ ดำเนินการได้เลย",
    lastTime: "13:45",
    branch: "BR-02",
    status: "ACTIVE_REPAIR",
    messages: [
      { id: "m-21", sender: "CUSTOMER", text: "สวัสดีครับ เครื่องชาร์จไม่เข้า มีอาการดับเองด้วยครับ", time: "10:30" },
      {
        id: "m-22",
        sender: "STAFF",
        time: "12:15",
        flexCard: {
          type: "QUOTATION",
          title: "ใบเสนอราคาค่าบริการซ่อม",
          details: "เปลี่ยนชุดตูดชาร์จ Type-C แท้ + ล้างสนิมคราบความชื้นเมนบอร์ด",
          amount: 1800,
          actionLabel: "อนุมัติซ่อมทันที",
        },
      },
      { id: "m-23", sender: "CUSTOMER", text: "อนุมัติซ่อมเรียบร้อยครับ ดำเนินการได้เลย", time: "13:45" },
    ],
  },
  {
    id: "chat-3",
    customerName: "คุณวิภาวรรณ สดใส",
    lineId: "@wipawan_s",
    phone: "095-442-1199",
    device: "iPhone 13 (Midnight)",
    ticketCode: "REP-202611-0005",
    unreadCount: 0,
    lastMessage: "รับเครื่องกลับเรียบร้อยแล้วค่ะ ขอบคุณมากค่ะ",
    lastTime: "12:10",
    branch: "HQ",
    status: "COMPLETED",
    messages: [
      { id: "m-31", sender: "CUSTOMER", text: "เปลี่ยนแบตเตอรี่แท้ใช้เวลากี่นาทีคะ", time: "09:40" },
      { id: "m-32", sender: "STAFF", text: "ประมาณ 45 นาทีครับผม มีแบตแท้ มอก. สต็อกพร้อมเปลี่ยนทันทีครับ", time: "09:42" },
      { id: "m-33", sender: "CUSTOMER", text: "รับเครื่องกลับเรียบร้อยแล้วค่ะ ขอบคุณมากค่ะ", time: "12:10" },
    ],
  },
];

const NOT_SENT_MSG = "ยังไม่ได้เชื่อมต่อ LINE OA — ข้อความไม่ได้ถูกส่งถึงลูกค้าจริง";

export default function LineChatPage() {
  const [conversations, setConversations] = useState<ChatConversation[]>(INITIAL_CONVERSATIONS);
  const [activeChatId, setActiveChatId] = useState<string>("chat-1");
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "UNREAD">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [showList, setShowList] = useState(true); // mobile: show inbox vs chat panel

  const activeChat = conversations.find((c) => c.id === activeChatId) || conversations[0];

  // Send message — guard: reject empty / whitespace-only messages
  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    alert(NOT_SENT_MSG);
    // Clear input after showing alert (simulate send flow)
    setInputMessage("");
  };

  // Quick action templates
  const sendQuickCard = (type: "QUOTATION" | "REPAIR_DONE" | "PROMPTPAY") => {
    void type;
    alert(NOT_SENT_MSG);
  };

  const filteredConversations = conversations.filter((c) => {
    const matchSearch =
      c.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.device.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterTab === "ACTIVE") return matchSearch && c.status === "ACTIVE_REPAIR";
    if (filterTab === "UNREAD") return matchSearch && c.unreadCount > 0;
    return matchSearch;
  });

  return (
    <div className="space-y-4">
      <DemoBanner message="ยังไม่ได้เชื่อมต่อ LINE OA บทสนทนาในหน้านี้เป็นตัวอย่าง ข้อความจะไม่ถูกส่งถึงลูกค้าจริง" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#06C755] text-white shadow-sm">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              กล่องข้อความลูกค้า LINE (Live Chat Inbox)
            </h1>
            <p className="text-xs text-slate-500">
              สนทนากับลูกค้าแบบ Real-time ส่งใบเสนอราคา การ์ดแจ้งซ่อมเสร็จ และ QR ชำระเงินอัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/line-oa">
            <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5 border-slate-300">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              จัดการ Flex Templates
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[calc(100vh-170px)] min-h-[640px] rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
        {/* Left Column: Conversation List (4 cols) — responsive desktop & mobile */}
        <div className={`${showList ? "flex" : "hidden"} lg:flex lg:col-span-4 border-r border-slate-200 flex-col h-full bg-slate-50/50`}>
          {/* Search & Tabs */}
          <div className="p-3 border-b border-slate-200 bg-white space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="ค้นหาลูกค้า, เลขใบรับ, เบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9 bg-slate-50"
              />
            </div>

            <div className="flex items-center gap-1">
              {[
                { id: "ALL", label: "ทั้งหมด" },
                { id: "ACTIVE", label: "กำลังซ่อม" },
                { id: "UNREAD", label: "ยังไม่อ่าน" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    filterTab === tab.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.map((c) => {
              const isActive = c.id === activeChatId;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setActiveChatId(c.id);
                    setShowList(false);
                    setConversations((prev) =>
                      prev.map((item) => (item.id === c.id ? { ...item, unreadCount: 0 } : item))
                    );
                  }}
                  className={`p-3.5 cursor-pointer transition-colors flex items-start gap-3 ${
                    isActive ? "bg-blue-50/70 border-l-4 border-blue-600" : "hover:bg-slate-100/70"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-700">
                      {c.customerName.slice(0, 2)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#06C755] border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{c.customerName}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">{c.lastTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 rounded font-mono">
                        {c.ticketCode}
                      </span>
                      <span className="text-[10px] text-slate-500 truncate">{c.device}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 truncate max-w-[190px]">{c.lastMessage}</p>
                      {c.unreadCount > 0 && (
                        <span className="h-4 min-w-4 px-1 rounded-full bg-[#06C755] text-white text-[10px] font-bold flex items-center justify-center">
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chat Window (8 cols) — responsive desktop & mobile */}
        <div className={`${showList ? "hidden" : "flex"} lg:flex lg:col-span-8 flex-col h-full bg-[#F4F6F8]`}>
          {/* Chat Header */}
          <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setShowList(true)}
                className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                title="กลับไปรายการแชท"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="h-9 w-9 rounded-full bg-[#06C755] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {activeChat.customerName.slice(0, 2)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-xs text-slate-900 truncate">{activeChat.customerName}</h3>
                  <Badge variant="outline" className="text-[10px] py-0 font-mono">
                    {activeChat.lineId}
                  </Badge>
                  <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">{activeChat.phone}</span>
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5 truncate">
                  <span className="font-semibold text-blue-700 font-mono">{activeChat.ticketCode}</span>
                  <span>•</span>
                  <span className="truncate">{activeChat.device}</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="text-slate-400 hidden sm:inline">สาขา {activeChat.branch}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href={`/track/${activeChat.ticketCode}`} target="_blank">
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1 border-slate-300">
                  <ExternalLink className="h-3 w-3" />
                  <span>ดูใบรับซ่อม</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex justify-center">
              <span className="text-[10px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                วันนี้ • ผ่าน LINE Official Account
              </span>
            </div>

            {activeChat.messages.map((m) => {
              const isStaff = m.sender === "STAFF";

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${isStaff ? "justify-end" : "justify-start"}`}
                >
                  {!isStaff && (
                    <div className="h-7 w-7 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 shrink-0">
                      {activeChat.customerName.slice(0, 1)}
                    </div>
                  )}

                  <div className="space-y-1 max-w-sm">
                    {m.text && (
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                          isStaff
                            ? "bg-[#06C755] text-white rounded-br-xs font-medium"
                            : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs"
                        }`}
                      >
                        {m.text}
                      </div>
                    )}

                    {m.flexCard && (
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-md overflow-hidden text-xs">
                        <div
                          className={`p-2.5 text-white font-bold flex items-center justify-between ${
                            m.flexCard.type === "REPAIR_DONE"
                              ? "bg-[#06C755]"
                              : m.flexCard.type === "QUOTATION"
                              ? "bg-[#F59E0B]"
                              : "bg-blue-600"
                          }`}
                        >
                          <span>{m.flexCard.title}</span>
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-[11px] text-slate-600">{m.flexCard.details}</p>
                          {m.flexCard.amount && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                              <span className="text-slate-500 font-medium">ยอดชำระ:</span>
                              <span className="font-bold text-sm text-rose-600 font-mono">
                                {m.flexCard.amount.toLocaleString()} บาท
                              </span>
                            </div>
                          )}
                          <button className="w-full py-1.5 bg-[#06C755] hover:bg-[#05b34c] text-white font-bold rounded-lg text-xs transition-colors">
                            {m.flexCard.actionLabel}
                          </button>
                        </div>
                      </div>
                    )}

                    <div
                      className={`text-[9px] font-mono text-slate-400 flex items-center gap-1 ${
                        isStaff ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span>{m.time}</span>
                      {isStaff && <CheckCheck className="h-3 w-3 text-blue-500" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Action Buttons Toolbar */}
          <div className="bg-white px-3 py-2 border-t border-slate-200 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-400 shrink-0">ส่งด่วน:</span>
            <button
              onClick={() => sendQuickCard("QUOTATION")}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md border border-amber-200 shrink-0 font-medium text-[11px] flex items-center gap-1"
            >
              <DollarSign className="h-3 w-3" />
              <span>ส่งใบเสนอราคา</span>
            </button>
            <button
              onClick={() => sendQuickCard("REPAIR_DONE")}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md border border-emerald-200 shrink-0 font-medium text-[11px] flex items-center gap-1"
            >
              <CheckCircle2 className="h-3 w-3" />
              <span>แจ้งซ่อมเสร็จพร้อมรับ</span>
            </button>
            <button
              onClick={() => sendQuickCard("PROMPTPAY")}
              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-md border border-blue-200 shrink-0 font-medium text-[11px] flex items-center gap-1"
            >
              <QrCode className="h-3 w-3" />
              <span>ส่ง QR ชำระเงิน</span>
            </button>
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <Input
              placeholder="พิมพ์ข้อความตอบกลับลูกค้า (กด Enter เพื่อส่ง)..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              className="text-xs h-10 bg-slate-50 border-slate-200"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-[#06C755] hover:bg-[#05b34c] text-white h-10 px-4 text-xs font-semibold gap-1.5 shrink-0 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" />
              <span>ส่ง</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
