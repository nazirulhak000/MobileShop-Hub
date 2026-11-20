# FixMe (ระบบบริหารร้านซ่อมมือถือ & จัดการงานซ่อมครบวงจร)

ระบบบริหารจัดการร้านขายโทรศัพท์มือถือและศูนย์ซ่อมครบวงจร (All-in-One Mobile Store & Repair ERP SaaS) พัฒนาด้วย Next.js 14 App Router, TypeScript, Tailwind CSS, และ Prisma ORM

---

## 🚀 ฟังก์ชันหลักของระบบ (38 เมนู / 54 เส้นทาง)

### 1. งานซ่อม (Repairs Service)
- **รับเครื่องซ่อมด่วน (`/repair-intake`, `/repairs/new`)**: วาด Pattern Lock (3x3 Canvas), Checklist ตรวจสอบสภาพเครื่อง 10 จุด, ลายเซ็นดิจิทัล, พิมพ์ใบรับซ่อม 80mm พร้อม QR Code
- **โต๊ะงานช่าง (`/technician-repairs`)**: กระดาน Kanban ช่าง, เบิกอะไหล่ตัดสต็อกอัตโนมัติ, คำนวณ Gross Profit และค่าคอมมิชชั่น
- **ระบบติดตามสถานะสดสำหรับลูกค้า (`/track/[trackingCode]`)**: Mobile-First ติดตามสถานะงานซ่อมแบบเรียลไทม์ไม่ต้องล็อกอิน
- **การรับประกัน & เคลมซ่อมซ้ำ (`/repair-warranty`, `/repair-documents`)**: เช็คประกันจากเลขอีมี่, ออกใบส่งมอบ, พิมพ์สติ๊กเกอร์บาร์โค้ดติดเครื่อง

### 2. ขายหน้าร้าน & ลูกค้า (POS & Retail)
- **ขายสินค้าหน้าร้าน (`/pos`)**: สแกนบาร์โค้ด, พักบิล, รองรับเงินสด, PromptPay QR, บัตรเครดิต, และ Split Payment
- **กะการขาย & กระทบยอด (`/shift`, `/daily-takings`)**: เปิด-ปิดกะเงินสด, บันทึกเงินทอน, กระทบยอดเงินในลิ้นชักกับสเตทเมนต์ธนาคาร
- **ผ่อนกับร้าน (`/installments`)**: ระบบผ่อนโทรศัพท์มือถือ, คำนวณดอกเบี้ย, ตารางงวด, แจ้งเตือนทวงค่างวด
- **สัญญาฝาก / รับจำนำ (`/pawn`)**: รับจำนำมือถือ, ดอกเบี้ยรายเดือน, กำหนดวันไถ่ถอน, ระบบเครื่องหลุดจำนำ

### 3. คลังสินค้า & จัดซื้อ (Inventory & Purchasing)
- **สต็อกมือถือ (`/inventory`, `/stock`)**: คุมเครื่องราย IMEI, เกรด A/B/C, บันทึกประวัติเครื่อง
- **อุปกรณ์เสริม (`/accessories`)**: เคส ฟิล์ม สายชาร์จ บาร์โค้ด จุดสั่งซื้อซ้ำ
- **รอบนับสต็อก & โอนสาขา (`/stock-count`, `/stock-transfer`)**: ตรวจนับสต็อกจริงเปรียบเทียบระบบ, โอนย้ายสต็อกข้ามสาขา
- **รับซื้อ-ตีราคา (`/purchase`)**: ประเมินราคามือสอง, บันทึกบัตร ปชช. ป้องกันของโจร

### 4. ภาษี & บัญชี (Tax & Accounting - สรรพากร 2568)
- **ตั้งค่าภาษี (`/tax/settings`)**: บุคคลธรรมดา (ภ.ง.ด.90/94) หรือนิติบุคคล (ภ.ง.ด.50/51), หักเหมา 60% หรือตามจริง, ค่าลดหย่อน 4 กลุ่มปี 2568
- **ภาษีมูลค่าเพิ่ม (`/tax/vat`)**: คำนวณ ภ.พ.30 ภาษีซื้อ-ภาษีขาย 7%
- **ภาษีหัก ณ ที่จ่าย (`/tax/wht`)**: ภ.ง.ด.3/53 ค่าบริการ ค่าเช่า ค่าจ้าง
- **ใบแจ้งหนี้ B2B (`/invoices`)**: ออกบิลองค์กรและวางบิลเครดิตเทอม

### 5. บุคลากร & บริหารสาขา (HR, Branches & CRM)
- **ลงเวลา & เงินเดือน (`/attendance`, `/payroll`)**: เวลาเข้า-ออกงาน, คำนวณคอมมิชชั่น + ประกันสังคม (SSO)
- **สาขา & สิทธิ์ (`/branches`, `/users`)**: ระบบหลายสาขา (Multi-Branch) พร้อม RBAC
- **CRM & LINE OA (`/line-oa`, `/line-chat`)**: จำลองส่ง Flex Message แจ้งเตือนซ่อมเสร็จผ่าน LINE

---

## 🛠️ Tech Stack & Design Standards
- **Framework**: Next.js 14+ (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, `@transitions-dev` micro-animations
- **Typography (AGY Style)**: `Plus Jakarta Sans` (ตัวเลข Tabular Nums & ภาษาอังกฤษ) + `Anuphan` (ภาษาไทยทรงเรขาคณิตไร้หัว)
- **Database**: SQLite + Prisma ORM
- **Print Layout**: 80mm Thermal Slip & A4 Tax Invoices / Warranties

---

## 💻 เริ่มต้นใช้งาน (Local Setup)

```bash
# 1. ติดตั้ง dependencies
npm install

# 2. เตรียมฐานข้อมูล (ต้องมีไฟล์ .env — คัดลอกจาก .env.example)
cp .env.example .env
npm run db:migrate
# (ตัวเลือก) ข้อมูลตัวอย่าง — ห้ามรันบน production
SEED_PASSWORD="<รหัสอย่างน้อย 12 ตัว>" npx tsx prisma/seed.ts

# ทดสอบ (ใช้ฐานข้อมูลแยก ไม่แตะ dev.db)
npm test
npm run test:e2e

# 3. เริ่มรันเซิร์ฟเวอร์
npm run dev
```

เปิดบราวเซอร์ที่: `http://localhost:3000`
