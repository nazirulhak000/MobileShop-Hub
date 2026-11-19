# การใช้งาน Customer Portal และหลายร้าน

อัปเดต 19 พฤศจิกายน 2026 — อ่านสถานะงานที่ยังเหลือใน TODO.md ก่อนเปิด production

## เส้นทางใช้งาน

- `/` หน้าแนะนำแพลตฟอร์ม SaaS ที่มีอยู่ใน workspace
- `/register` สมัครร้านใหม่; บัญชีเจ้าของร้านถูกเก็บเป็น bcrypt hash และ username ซ้ำกันต่างร้านได้
- `/login` พนักงานกรอกรหัสร้าน (shop slug), username และ password
- `/dashboard` หลังบ้านเดิม มี server session และ tenant/branch scope
- `/store/[shopSlug]` หน้าแนะนำร้าน; ลิงก์บัญชีลูกค้าและจองคิวไป portal ของร้านนั้น
- `/s/[shopSlug]` Customer Portal ของแต่ละร้าน
- `/s/[shopSlug]?tab=bookings` เปิดหน้าจองคิวของร้านโดยตรง
- `/customer` หน้ากรอกรหัสร้านสำหรับลูกค้าที่ไม่มีลิงก์
- `/appointments` รายการนัด รับเครื่อง ปิดนัด ยกเลิก พร้อมตั้งค่าเวลารับจอง
- `/customer-access` พนักงาน ADMIN/MANAGER ตรวจหลักฐานและเชื่อมประวัติเก่า; ถอน link แล้วเพิกถอน customer sessions

ฐานพัฒนาเดิมถูกกำหนดร้านเป็น `mobileshop` ผ่านเครื่องมือย้ายข้อมูล โดยเก็บสำรองก่อนเปลี่ยนทุกครั้ง
บัญชีพนักงานเดิมใช้รหัสผ่านเดิม แต่เก็บแบบ hash แล้ว ไม่มี default-admin login หรือเลือกสิทธิ์จาก localStorage

## บัญชีและสิทธิ์

ทุกบัญชีผูก tenant เดียว บุคคลเดียวเข้าร้านอื่นด้วยบัญชีของร้านปลายทาง ต้องยืนยันตัวตนใหม่
พนักงาน ADMIN เห็นทุกสาขาภายในร้าน; role อื่นเห็นสาขาประจำและสาขาที่มี StaffBranchAccess เท่านั้น
TECHNICIAN เข้าถึงงานซ่อมที่มอบหมาย; API จัดการผู้ใช้เปิดเฉพาะ ADMIN
ชั้นข้อมูลธุรกิจ `src/lib/prisma.ts` บังคับ scope รวม nested list/count และตรวจ FK ก่อนเขียน
`src/lib/db.ts` เป็น unscoped client ใช้เฉพาะ auth, public DTO ที่จำกัด field และ service ที่ตรวจเจ้าของ/tenant อย่างชัดเจน ห้ามใช้แทน scoped client ใน endpoint หลังบ้านทั่วไป

session ลูกค้ากับพนักงานเป็น cookie คนละชื่อ เป็น HttpOnly/SameSite=Lax และ Secure เมื่อ production
ต้องตั้ง APP_ORIGIN ให้ตรง URL สาธารณะเมื่อมี reverse proxy; mutation ที่ใช้ cookie ตรวจ Origin
การซ่อนเมนูไม่ใช่การให้สิทธิ์ ทุก endpoint ตรวจสิทธิ์ของตน

## ตั้งค่า OTP

ใช้ `AUTH_SECRET` แบบสุ่มอย่างน้อย 32 ตัวอักษรสำหรับ HMAC ของ OTP; เปลี่ยนค่าแล้ว challenge ที่ค้างจะใช้ไม่ได้
อย่าใส่ key จริงลง git หรือส่ง key ผ่านแชต

```dotenv
DATABASE_URL=file:./dev.db
APP_ORIGIN=http://localhost:3000
AUTH_SECRET=<random-secret-at-least-32-characters>
OTP_DEV_ENABLED=false
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_MESSAGING_SERVICE_SID=
```

adapter SMS รอบแรกใช้ [Twilio Messages API](https://www.twilio.com/docs/messaging/api/message-resource) และ Messaging Service
ยังไม่ได้ส่ง SMS จริงหรือยืนยันบัญชีผู้ให้บริการ ต้องตั้ง credentials และตรวจการรับ SMS ในไทยกับบัญชีที่ใช้งานจริงก่อนเปิดให้ลูกค้า
ถ้าใช้ provider อื่นให้เปลี่ยน adapter `sendCode` ใน `customer-auth.ts` โดยรักษากติกา challenge เดิม

เฉพาะเครื่องพัฒนา: ตั้ง `OTP_DEV_ENABLED=true` และ AUTH_SECRET แล้ว `npm run dev` จะแสดงรหัสทดสอบในหน้า login พร้อมข้อความว่าไม่มีการส่ง SMS
โหมดนี้ไม่ log OTP และใช้ไม่ได้เมื่อ NODE_ENV=production แม้ตั้ง flag เป็น true
หาก secret หรือ SMS config ไม่พร้อม ระบบตอบ 503 และไม่ออก customer session

OTP มีอายุ 5 นาที ใช้ครั้งเดียว จำกัด 5 ครั้งต่อ challenge, cooldown 60 วินาที และมี rate limit ระดับเบอร์/ร้าน
การยืนยันเบอร์ปัจจุบันไม่เปิดประวัติ CRM เดิมให้อัตโนมัติ
เฉพาะ CRM ที่สร้างใหม่หลังยืนยัน OTP เท่านั้นที่เชื่อมได้ทันที; ประวัติเดิมต้องให้ร้านตรวจหลักฐานและบันทึกเหตุผลก่อน
การเปลี่ยนเบอร์/กู้บัญชีข้ามเบอร์ยังใช้ workflow ติดต่อร้าน ไม่ได้ทำ self-service recovery ในรอบนี้

## เปิดรับจอง

1. เข้าบัญชี ADMIN หรือ MANAGER ของสาขานั้น เปิด `/appointments`
2. เลือกสาขา กำหนดเวลาเปิด/ปิด ความจุต่อช่วง วันหยุดประจำ และวันหยุดพิเศษ
3. ติ๊กเปิดรับจองออนไลน์แล้วบันทึก ร้านใหม่ยังไม่เปิดรับจนกว่าจะตั้งค่า
4. ส่งลิงก์ `/s/<shopSlug>?tab=bookings` ให้ลูกค้า

MVP จองเวลานำเครื่องเข้าเป็นช่วงละ 30 นาที ใช้ capacity pool ร่วมกันทุกบริการ
เมนูบริการเริ่มต้น: ตรวจอาการ, ตรวจจอ/เปลี่ยนจอ, ตรวจแบตเตอรี่, อื่น ๆ; ยังไม่มี service catalog ที่ร้านจัดการเอง
ลูกค้าจองล่วงหน้า 1 ชั่วโมง–30 วัน, เปลี่ยน/ยกเลิกเองก่อนนัดอย่างน้อย 2 ชั่วโมง, มีนัด CONFIRMED ไม่เกิน 3 รายการต่อร้าน
availability เป็นข้อมูล ณ ขณะดู การยืนยันตรวจและจองแบบ atomic อีกครั้ง; ไม่ hold slot ระหว่างกรอกฟอร์ม
เลื่อนไปช่วงเต็มจะเก็บนัดเดิม การกดซ้ำด้วย key เดิมไม่สร้างนัดเพิ่ม และยกเลิกซ้ำไม่คืน capacity เกิน
เมื่อรับเครื่อง หากบัญชียังไม่เชื่อม CRM ให้ตรวจหลักฐานก่อน; check-in ซ้ำใช้ใบงานเดิม

## ใบเสนอราคาและ tracking

พนักงานออกใบเสนอราคาจากหน้ารายละเอียดงาน ฉบับใหม่แทนฉบับ PENDING เก่า ลูกค้ายืนยัน version/ยอดผ่าน session ของตน
ฉบับหมดอายุหรือถูกแทนที่ตัดสินใจไม่ได้; ยังไม่อนุมัติจะเปลี่ยนงานเป็น REPAIRING/QC_PASSED/READY ไม่ได้
สถานะที่พนักงานเปลี่ยนบันทึก timeline และแจ้งเตือนในแอปใน transaction เดียวกัน ไม่มีการสร้าง timeline ย้อนหลังที่ไม่มีหลักฐาน

QR สลิปใหม่ใช้ token สุ่ม 256 บิต เก็บเฉพาะ hash อายุ 90 วัน อ่านได้เฉพาะรุ่นเครื่อง สถานะ เวลาประเมิน และข้อมูลติดต่อสาขา
ไม่ใช้เลข REP เรียงลำดับเป็น secret และไม่มี public POST สำหรับอนุมัติแล้ว
ผู้ถือใบรับซ่อมเก่าต้องขอพิมพ์ QR ใหม่จากร้าน; เปิดโมดัลพิมพ์จะออก token ใหม่โดยไม่เพิกถอน QR ที่ยังไม่หมดอายุก่อนหน้า
ADMIN/MANAGER เพิกถอน QR ของงานได้ผ่าน DELETE `/api/repairs/<id>/tracking-token`

## ย้ายฐานเดิมและย้อนกลับ

```powershell
python scripts/foundation-maintenance.py --shop-slug mobileshop
python scripts/foundation-maintenance.py --shop-slug mobileshop --apply
npx tsx scripts/hash-legacy-passwords.ts
npm run prisma:generate
```

หยุด application ที่เขียนฐานนี้ก่อน apply; รอบแรกเป็น dry run บนสำเนา ตรวจจำนวนแถวและ integrity; รอบ apply สำรองฐานเดิมแล้วคัดลอกผลที่ซ้อมผ่านกลับ โดยตรวจ digest ซ้ำว่าต้นทางไม่ถูกเปลี่ยนระหว่างซ้อม
ฐานเก่าที่ยังไม่กำหนด tenant จะถูกย้ายเข้าร้านที่ระบุอย่างชัดเจน หากมีหลาย tenant ร่วมกับข้อมูลไม่ทราบร้าน เครื่องมือหยุดและต้องทำ mapping ที่ตรวจแล้ว
สำรอง DB, schema ก่อนเปลี่ยน และ patch งานเดิมอยู่ใน `.local/backups/` ซึ่งไม่ถูก commit
อย่ารัน seed เดิมกับฐานมีข้อมูลจริง เพราะ seed เดิมลบข้อมูล; ใช้ seed เฉพาะฐานทิ้งได้
ย้อนกลับฐานโดยหยุด server, สำรองสถานะปัจจุบันเพิ่ม แล้วใช้ SQLite backup API คืนไฟล์ก่อน apply คู่กับ source/schema เวอร์ชันก่อน migration ห้ามใช้ฐานเก่ากับ Prisma client schema ใหม่
ถ้าต้องเก็บธุรกรรมหลังเปิดใช้งาน ต้องทำ forward fix หรือแผนย้ายข้อมูลคืนโดยเฉพาะ ไม่ restore ทับทันที

## การทดสอบ

```powershell
npm run build
npx tsc --noEmit
node scripts/test-foundation.cjs
npx playwright install chromium
node scripts/test-foundation.cjs --e2e
npm audit
```

test runner สร้าง DB ว่างชื่อใหม่ใน `.local/tests/` ไม่รัน seed ล้างฐานพัฒนา
E2E ใช้ port 3107, DB ทดสอบ, OTP test adapter และ distDir แยก `.local/next-e2e` ไม่ส่ง SMS จริง
ภาพ QA และ trace อยู่ใน `.local/qa/` และ `.local/playwright-results/`; เป็นข้อมูลจำลองจากชุดทดสอบ

## ความต่างจากแผนเต็มที่ยังต้องทำต่อ

- ตารางเดิมยังเก็บ tenantId แบบ nullable เพื่อรองรับ migration เป็นช่วง; request ใหม่บังคับร้าน และข้อมูล null ถูกซ่อนจน backfill แล้ว ต้องเพิ่ม constraint ถาวรหลังตรวจ import/seed ทุกเส้นทาง
- CustomerAccount.phone ที่ยืนยันแล้วทำหน้าที่ identity ใน MVP ยังไม่แยก AuthIdentity สำหรับหลาย provider
- Portal ใช้หน้าเดียวแยกเมนูและเปิดรายละเอียดในหน้า; ยังไม่แยกทุก detail route ตามแผน และรายการแต่ละส่วนมีเพดาน 50 รายการก่อนเพิ่ม pagination
- มีประวัติซื้อและรายการสินค้า แต่ยังไม่ทำดาวน์โหลดใบเสร็จ/ใบรับประกันแบบ private file
- มี in-app notifications แบบ transactional; ยังไม่ทำ worker/outbox/retry สำหรับแจ้งเตือน SMS/LINE/email หรือ reminder ตั้งเวลา
- ยังไม่ทำ customer device-session list, self-service เปลี่ยนเบอร์, service catalog, calendar view/export และ PostgreSQL deployment
- ยังไม่ได้เปิด production หรือส่งข้อความจริง ต้องตั้ง SMS provider, APP_ORIGIN, สำรอง/monitoring และตรวจ rollout gate ใน TODO.md

Next.js ปรับเป็น 15.5.28 และ React 19 เพื่อแก้ช่องโหว่ dependency เดิม; PostCSS ภายใต้ Next override เป็น 8.5.33 ใน major 8 เดียวกัน พร้อม lockfile ตรวจซ้ำด้วย npm audit หลังติดตั้งใหม่
