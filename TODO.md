# TODO — Customer Portal และระบบหลายบัญชี

วันที่จัดทำ: 19 พฤศจิกายน 2026

เอกสารนี้เป็นแผนพัฒนา ยังไม่ได้ลงมือเปลี่ยน authentication, schema หรือหน้าจอจริง
พรอมพ์สำหรับนำไปสั่งพัฒนา: [docs/CUSTOMER_PORTAL_PROMPT.md](docs/CUSTOMER_PORTAL_PROMPT.md)

## 1. เป้าหมายและสมมติฐาน

ลูกค้าใช้มือถือเปิดเว็บร้าน เข้าบัญชีของตัวเอง ดูประวัติซื้อ/ซ่อม ติดตามสถานะ อนุมัติใบเสนอราคา และจองคิวได้ โดยข้อมูลไม่ปะปนกับลูกค้าหรือร้านอื่น

ผู้ใช้ยืนยันขอบเขตแล้ว: **หลายร้าน แต่ละร้านมีลูกค้าและพนักงานของตัวเอง** (19 พฤศจิกายน 2026)
คำว่า “หลายบัญชี” จึงครอบคลุม 3 ระดับ:

- หลายบัญชีลูกค้า: แต่ละคนเห็นเฉพาะข้อมูลที่เชื่อมกับบัญชีตนเอง
- หลายบัญชีพนักงาน: สิทธิ์ตามหน้าที่และสาขาที่ได้รับมอบหมาย
- หลายร้าน (tenant): ร้านหนึ่งมีหลายสาขาได้ ข้อมูลร้าน A ต้องแยกจากร้าน B

การเข้าหลายอุปกรณ์ของคนเดียวรองรับด้วย session หลายรายการ ส่วนหลายคนใช้เบราว์เซอร์เดียวกันให้สลับด้วย logout/login ก่อน ไม่เก็บรหัสผ่านหลายบัญชีในเครื่อง

ข้อเสนอเริ่มต้น: เว็บ responsive ภายใน Next.js เดิม; ยังไม่ต้องทำแอป native, marketplace, ระบบครอบครัว หรือการชำระเงินออนไลน์ใน MVP

## 2. สิ่งที่พบในโค้ดปัจจุบัน

| เรื่อง | หลักฐาน | ผลต่อแผน |
|---|---|---|
| Stack | `package.json`: Next.js 14, React 18, Prisma 5; schema ใช้ SQLite | ใช้ของเดิมก่อน ตรวจ compatibility ก่อนเพิ่ม dependency |
| หน้าสาธารณะ | `/landing`, `/track`, `/track/[trackingCode]` | มีฐานให้ต่อยอด ไม่จำเป็นต้องเริ่มใหม่ |
| Customer | มีประวัติสัมพันธ์กับ RepairJob, Sale, InstallmentContract | ใช้ประวัติเดิมผ่านชั้นตรวจ ownership |
| Tenant | มี Tenant และ tenantId ที่ยัง nullable ใน Branch/User/Customer | มีเค้าโครง แต่ยังไม่ยืนยันว่ารองรับ tenant isolation แล้ว |
| Login | `api/auth/login/route.ts` ส่ง user JSON แต่ไม่สร้าง session ใน handler ที่ตรวจ | ต้องมี session ฝั่ง server ก่อนเปิด portal |
| Client state | `AppContext.tsx` ใช้ demo users/default admin และ localStorage | ใช้เป็นแหล่งสิทธิ์ไม่ได้ ต้องถอดออกจาก production flow |
| Customer API | GET ไม่กรอง tenant; POST upsert ด้วย phone อย่างเดียว | ต้องแก้ก่อนรับหลายร้านและบัญชีลูกค้า |
| Repair API | รับ branch/customer จาก request; มี fallback เลือกสาขาแรก | ต้องผูก tenant และตรวจความสัมพันธ์ทุกครั้ง |
| Public tracking | รหัส `REP-YYYYMM-NNNN` เรียงลำดับ; POST รับ approve/reject ด้วยรหัส; ส่ง updated object กลับตรง ๆ | แยกเลขเอกสารจาก secret token, ปิดทาง mutation เดิม, ใช้ DTO allowlist |
| ความสดของสถานะ | หน้า track โหลดตอนเปิดและหลังอนุมัติ | ยังไม่ควรเรียกว่ามี realtime subscription |
| Layout | root ครอบ AppLayout และยกเว้น route ด้วย pathname | แยก public/customer/staff layout พร้อม guard จริง |

นี่เป็นการตรวจไฟล์ส่วนที่เกี่ยวข้อง ไม่ใช่ผล audit ทั้งระบบ และ working tree มีงานเดิมที่ยังไม่ commit หลายไฟล์ ต้องรักษางานเหล่านั้น

## 3. แบบหน้าบ้านที่เสนอ

### เมนูหลักบนมือถือ

แถบล่าง 5 เมนู: **หน้าหลัก / งานของฉัน / จองคิว / แจ้งเตือน / บัญชี**

- หน้าหลัก: ชื่อร้าน/สาขาที่กำลังดู, งานที่ต้องตัดสินใจ, งานซ่อมล่าสุด, นัดถัดไป, ปุ่มจองคิว
- งานของฉัน: แท็บกำลังดำเนินการ/ประวัติ; ตัวกรองซ่อม/ซื้อ; รายการแบบ card บนมือถือ
- รายละเอียดซ่อม: รุ่นเครื่อง, สถานะปัจจุบัน, ขั้นตอนถัดไป, timeline จริง, ราคาที่แจ้ง, ใบเสนอราคา, นัดรับเครื่อง, ช่องทางติดต่อ
- จองคิว: สาขา → บริการ/รุ่น/อาการ → วันและเวลา → ตรวจข้อมูล → ยืนยัน
- แจ้งเตือน: งานเปลี่ยนสถานะ, รออนุมัติราคา, นัดหมาย; กดแล้วไปยังรายการที่ตนมีสิทธิ์
- บัญชี: ข้อมูลส่วนตัว, ช่องทางเข้าสู่ระบบที่ยืนยันแล้ว, ร้านเจ้าของบัญชี, session อุปกรณ์, logout

ใช้ฟอนต์ Anuphan/Plus Jakarta Sans และ components เดิมที่เหมาะสม; โทนอ่านง่ายแบบเว็บเดิม โดยยังไม่ถือว่าเป็น visual design ที่ผู้ใช้อนุมัติแล้ว
หน้าลูกค้าไม่ใช้ Sidebar หลังบ้าน ตัวเลขราคาต้องอ่านง่าย สถานะมีข้อความพร้อมสี แสดงเวลาปรับปรุงล่าสุด และแยก “เวลาคาดว่าจะเสร็จ” ออกจากเวลานัด

### เส้นทางที่เสนอ

| Route | ผู้ใช้ | หน้าที่ |
|---|---|---|
| `/s/[shopSlug]` | สาธารณะ | หน้าแต่ละร้าน บริการ สาขา เวลาทำการ |
| `/s/[shopSlug]/book` | เริ่มดูได้ทั่วไป | เลือกคิว; ต้องยืนยันบัญชีก่อนบันทึก |
| `/customer/login` | สาธารณะ | เข้าสู่บัญชีลูกค้า |
| `/customer` | ลูกค้า | สรุปงานในร้านที่เลือก |
| `/customer/repairs`, `/customer/repairs/[id]` | ลูกค้า | ประวัติและรายละเอียดงานของตน |
| `/customer/purchases`, `/customer/purchases/[id]` | ลูกค้า | ประวัติซื้อ/ใบเสร็จของตน |
| `/customer/bookings`, `/customer/bookings/[id]` | ลูกค้า | นัดหมาย เลื่อน ยกเลิก |
| `/customer/notifications`, `/customer/profile` | ลูกค้า | การแจ้งเตือนและบัญชี |
| `/track/[token]` | ผู้ถือ token | ดูสถานะแบบจำกัด; ไม่มีสิทธิ์แก้ไขโดย token อย่างเดียว |
| `/appointments` | พนักงานที่มีสิทธิ์ | ปฏิทิน/รายการนัดของร้านและสาขาที่อนุญาต |

`(public)`, `(customer)`, `(staff)` เป็น route groups ของ App Router ไม่เพิ่มชื่อเหล่านี้ลง URL; ย้าย root dashboard เข้า staff group โดยรักษา URL เดิมได้ ระวังไม่สร้าง page ที่ชนเส้นทางเดิม

## 4. การออกแบบบัญชีและสิทธิ์

### ความสัมพันธ์ที่เสนอ

```text
CustomerAccount (ตัวตนเข้าสู่ระบบภายใน Tenant เดียว)
  └─ CustomerAccountLink (สิทธิ์ที่พิสูจน์แล้วต่อข้อมูลลูกค้า)
       └─ Customer (ข้อมูล CRM ภายใน Tenant)
            ├─ RepairJob / Sale / Warranty
            └─ Appointment

Tenant (ร้าน/กิจการ)
  ├─ Branch (สาขา)
  ├─ Customer
  └─ User (พนักงานเดิม) + StaffBranchAccess
```

กำหนดบัญชีลูกค้าและบัญชีพนักงานเป็นของ tenant เดียว ข้อมูล CRM, ประวัติ, คิว, การแจ้งเตือน และการตั้งค่าแยกตามร้าน ร้าน A ไม่เห็นข้อมูลของร้าน B
บุคคลเดียวใช้เบอร์หรือชื่อผู้ใช้เดียวกันกับหลายร้านได้ แต่เป็นคนละบัญชี/สิทธิ์/ประวัติ ต้องเข้าจากบริบทร้านที่ชัดเจน เช่น `/s/[shopSlug]`; ทุกขั้นของ login/OTP/recovery ต้องผูก tenant ที่ server resolve แล้ว ห้ามค้นบัญชีด้วยเบอร์หรือ username อย่างเดียว
บัญชีหนึ่งใช้ได้หลายสาขาภายในร้านเดียวตามสิทธิ์; ไม่มีการเชื่อมบัญชีข้ามร้านหรือ global customer SSO ใน MVP การเปลี่ยนร้านต้องเข้าบัญชีของร้านปลายทางใหม่ และไม่ส่ง session ร้านเดิมไปใช้เป็นสิทธิ์ของอีกร้าน

| ผู้ใช้ | สิทธิ์เสนอ |
|---|---|
| ผู้เยี่ยมชม | ดูร้าน บริการ เวลาว่าง และ tracking ที่จำกัด |
| ลูกค้า | อ่านรายการของตน จอง/เลื่อน/ยกเลิกคิวตามเงื่อนไข ตัดสินใจใบเสนอราคาของตน |
| CASHIER | จัดการนัด/รับเครื่องในสาขาที่มีสิทธิ์ ไม่จัดการสิทธิ์บุคลากร |
| TECHNICIAN | ดู/อัปเดตงานที่มอบหมายในขอบเขตสาขา ไม่มีข้อมูลบัญชีลูกค้าทั้งระบบ |
| MANAGER | จัดการสาขาที่มอบหมาย รวมคิวและกำลังรับงาน |
| ADMIN ของร้าน | จัดการทุกสาขาภายใน tenant ของตน |
| Platform operator (ภายหลัง) | แยกระบบสิทธิ์ออกจาก ADMIN ร้าน; การเข้าข้อมูลร้านต้องมีเหตุผลและ audit |

### การเข้าบัญชีและเชื่อมประวัติเก่า

ข้อเสนอ MVP: เบอร์โทร + OTP ผ่าน provider จริง โดยตัดสินใจ provider/ค่าใช้จ่ายก่อนทำ production; ถ้าต้องการ email/password ให้เปลี่ยนเป็นช่องทางที่ยืนยัน email และมี recovery ได้ ห้ามใช้ OTP จำลองใน production

การยืนยันเบอร์พิสูจน์การครอบครองเบอร์ปัจจุบัน ไม่ได้พิสูจน์ความเป็นเจ้าของประวัติเก่าทุกชิ้น:

1. เข้าบัญชีและยืนยันช่องทางติดต่อ
2. เลือกร้าน → ขอเชื่อมข้อมูล CRM ของร้านนั้น
3. ใช้ token เชิญแบบครั้งเดียวที่ออกให้รายการนั้น หรือให้พนักงานตรวจหลักฐานและอนุมัติ
4. หากพบเบอร์ซ้ำ/ข้อมูลขัดแย้ง/เปลี่ยนเจ้าของเบอร์ ให้ pending review; ไม่เปิดประวัติเก่าอัตโนมัติเพราะเบอร์ตรงกัน
5. เก็บผู้อนุมัติ วิธีพิสูจน์ และเวลา; รองรับถอนการเชื่อมและเพิกถอน session

## 5. แบบข้อมูลที่ต้องเพิ่ม/ปรับ (conceptual ยังไม่ใช่ migration)

| Model/ส่วน | ฟิลด์และข้อกำหนดหลัก |
|---|---|
| CustomerAccount | id, tenantId, displayName, status, createdAt; tenantId ต้องมีค่า; ไม่เก็บ role พนักงาน |
| AuthIdentity | tenantId, accountId, provider, providerSubject, verifiedAt; unique(tenantId, provider, providerSubject); normalized phone เป็น identity ที่ยืนยันแล้วภายในร้าน |
| CustomerAccountLink | accountId, tenantId, customerId, status, verifiedMethod, approvedBy, verifiedAt; unique(accountId, tenantId, customerId); MVP มี active account เจ้าของต่อ Customer เพียงหนึ่ง |
| Session | tenantId, tokenHash, principalType, customerAccountId หรือ userId อย่างใดอย่างหนึ่ง, expiresAt, revokedAt; tenant ต้องตรงกับ principal และร้านใน request; constraint/XOR และ index; แยก cookie ของลูกค้า/พนักงาน |
| VerificationChallenge | tenantId, subject, purpose, secretHash, expiresAt, attempts, consumedAt; challenge ใช้ข้ามร้านไม่ได้; ไม่เก็บ OTP ชัดเจน |
| StaffBranchAccess | userId, tenantId, branchId; unique(userId, branchId) |
| Tenant/Branch/Customer | backfill tenantId แล้วค่อยบังคับ non-null; Customer unique(tenantId, normalizedPhone); branch code unique ภายใน tenant |
| RepairJob/Sale และรายการธุรกิจ | tenantId ที่ตรวจสอดคล้องกับ branch/customer; composite relation/constraint หรือ scoped repository พร้อม transaction และ invariant tests |
| Product/Stock/SequenceCounter | ตรวจ tenant ownership ทั้งชุด; product code และเลขเอกสารต้องกำหนด namespace ต่อร้านให้ชัด ไม่ให้ shared Product ทำข้อมูลข้ามร้าน |
| PublicTrackingToken | jobId, tokenHash, expiresAt, revokedAt; secret สุ่มที่เดาไม่ได้ แยกจากเลขใบรับซ่อม |
| RepairStatusEvent | tenantId, repairJobId, fromStatus, toStatus, actor, customerMessage, occurredAt; ไม่สร้าง timeline เก่าที่ไม่มีหลักฐาน |
| RepairQuote | tenantId, repairJobId, version, amountSatang, status, expiresAt, decidedAt, decidedBy; เก็บ snapshot รายการ/ราคา |
| Service / BranchService | tenantId, ชื่อบริการ, ระยะเวลา, สาขาที่รับ, leadTime, buffer, active |
| BookingSlot | tenantId, branchId, resourcePoolId, startsAt, endsAt, capacity, reservedCount, version; unique(scope + startsAt) |
| Appointment | tenantId, branchId, customerId, slotId, serviceId, status, bookingRef, idempotencyKey, repairJobId?, timestamps |
| AppointmentEvent | สถานะ/เหตุผล/ผู้แก้/วันเวลาเดิมและใหม่; append-only |
| Notification / OutboxEvent | tenantId, accountId, eventKey, readAt / attempts, nextAttemptAt, sentAt; deduplicate event |
| AuditLog | เพิ่ม customer actor แบบชัดเจน; ไม่ใส่ OTP, session secret, passcode, pattern หรือข้อมูลอ่อนไหวใน before/after |

ใช้จำนวนเงินใหม่เป็น integer สตางค์; schema เดิมใช้ Float จึงต้องกำหนด rounding/แปลงข้อมูลโดยไม่เปลี่ยนยอดย้อนหลังเงียบ ๆ
SQLite ใช้พัฒนา/ทดสอบได้; หากเปิด SaaS หลาย instance ให้แยกงานประเมินและย้าย PostgreSQL พร้อม rehearsal/backup ไม่เปลี่ยน provider อย่างเดียวแล้วถือว่าจบ
ทุก version/constraint/type ใน schema ต้องตรวจให้ใช้ได้กับ Prisma 5 ที่ติดตั้งก่อนเขียนจริง

## 6. กติกาจองคิว

- MVP เป็น “นัดนำเครื่องเข้ารับบริการ” ไม่ใช่สัญญาว่าซ่อมเสร็จในช่วงเวลานั้น
- ข้อเสนอเริ่มต้น: slot รับเครื่อง 30 นาที, 1 คิวต่อ resource pool ต่อ slot; ร้านปรับความจุ/เวลาทำการ/วันหยุดได้
- คิวบริการต่างชนิดที่ใช้พนักงานชุดเดียวกันต้องกิน capacity pool เดียวกัน ไม่แยกนับจนจองเกินคน
- MVP ใช้ช่วงรับเครื่องคงที่; หากเพิ่มงานที่ใช้หลาย slot ต้องจองทุกช่วงที่ทับซ้อนแบบ atomic
- แสดงเวลาตาม Asia/Bangkok; เก็บ timestamp เป็น UTC และ timezone ของสาขา
- การดู slot ยังไม่กันที่นั่ง; ยืนยันแล้วจึงจองใน transaction ถ้าเต็มตอบ 409 และแสดงตัวเลือกใหม่
- การเพิ่ม reservedCount ต้องเป็น conditional atomic update เมื่อ reservedCount < capacity พร้อมสร้าง Appointment และ idempotency record ใน transaction เดียว; ห้าม read-count แล้ว insert แยกกัน
- จอง/เลื่อน/ยกเลิกจากหลาย request ต้องไม่กินหรือคืน capacity ซ้ำ; คืนเฉพาะ transition ที่ยังนับใช้ความจุ
- สร้างคิวด้วย idempotency key ต่อ account/tenant/action; key เดิม payload ต่างกันให้ conflict
- เลื่อนคิว: จอง slot ใหม่และคืน slot เดิมใน transaction เดียว หากใหม่เต็มต้องเก็บคิวเดิม
- ข้อเสนอปรับได้: จองล่วงหน้า 1 ชั่วโมงถึง 30 วัน, เลื่อน/ยกเลิกเองก่อนนัดอย่างน้อย 2 ชั่วโมง, จำกัด active bookings 3 รายการต่อบัญชีต่อร้าน
- พนักงาน override เงื่อนไขเวลาได้เฉพาะสิทธิ์ที่กำหนด พร้อมเหตุผล; การปิดวัน/ลด capacity ต้องไม่ยกเลิกนัดเดิมเงียบ ๆ
- สถานะ: CONFIRMED → CHECKED_IN → COMPLETED; CONFIRMED → CANCELLED/NO_SHOW; การเลื่อนเก็บเป็น event
- CHECKED_IN สร้างหรือผูก RepairJob ได้หนึ่งครั้ง ไม่สร้างงานซ้ำเมื่อกดซ้ำ; การรับเครื่อง walk-in ยังทำได้

## 7. TODO แบบลงมือทำตามลำดับ

รายการที่ไม่ได้ทำเครื่องหมายยังไม่เสร็จ P0 เป็นเงื่อนไขก่อนเปิดให้ลูกค้าจริงใช้

### Phase 0 — ยืนยันขอบเขตและเตรียมงาน (P0)

- [x] F00 สำรวจ API/page/server query ทั้งระบบ ทำตาราง public/staff/customer และ ownership ที่ต้องตรวจ
- [x] F01 ยืนยันความหมายหลายบัญชี: หลายร้าน แต่ละร้านมีลูกค้าและพนักงานของตัวเอง; บัญชีและข้อมูลแยกตาม tenant
- [x] F02 เลือกวิธี login/provider; ระบุ config, ราคา/ข้อจำกัดที่ต้องตรวจ และ recovery flow
- [x] F03 ยืนยันกติกาจองและผู้มีสิทธิ์อนุมัติเชื่อมประวัติเดิม
- [x] F04 เก็บ baseline build/TypeScript/เส้นทางหลัก แยกข้อผิดพลาดเดิมจากสิ่งที่เพิ่ม
- [x] F05 สำรอง DB ทดสอบ restore และเก็บ git diff ของงานเดิมก่อนแก้ schema

**ตรวจรับ:** มี inventory ขอบเขตข้อมูล/สิทธิ์, baseline, migration plan, สมมติฐานที่ยังรอยืนยัน; ไม่มีไฟล์งานเดิมถูกล้าง

### Phase 1 — Session และแยกข้อมูลร้าน (P0; หลัง Phase 0)

- [x] A01 ออกแบบ session ฝั่ง server และ customer/staff cookie คนละชื่อ; production ใช้ HttpOnly/Secure/SameSite และอายุชัดเจน
- [x] A02 เพิ่ม login/logout/me, session expiry/revocation, logout ทุกอุปกรณ์; rotate token หลัง login/เปลี่ยนสิทธิ์
- [x] A03 เอา default admin/demo user/role จาก localStorage ออกจาก flow production; AppContext รับข้อมูล session ที่ server ยืนยันแล้ว
- [x] A04 เพิ่ม requireStaffSession, requireCustomerSession, requireTenantAccess และ permission helpers
- [x] A05 ตรวจ auth ที่ Route Handler/Server Action/service ทุกจุด รวม export/download/search/count ไม่พึ่ง redirect หรือการซ่อนเมนู
- [x] A06 ป้องกัน CSRF/ตรวจ origin สำหรับ mutation ที่ใช้ cookie; จำกัด login/OTP/token lookup และลด account enumeration
- [x] A07 Backfill tenant ของ Branch/User/Customer/รายการธุรกิจพร้อมรายงาน orphan และ ambiguous record; ไม่เดาร้านให้ข้อมูลกำกวม
- [x] A08 เปลี่ยน unique phone/code ที่เป็น global ตาม scope; แก้ทุก findUnique/upsert/seed/caller ที่อิง key เดิม
- [x] A09 ห้าม client กำหนดสิทธิ์ด้วย tenantId/role/customerId; branch ต้องอยู่ในร้านและในสิทธิ์ผู้ใช้
- [x] A10 ปิด fallback สาขาแรก; validate branch/customer/technician/product ทุก relation ให้อยู่ร้านเดียวกัน
- [x] A11 ตรวจและจำกัด API ลูกค้า/งานซ่อม/POS/สต็อก/สัญญาเดิมทั้ง GET และ mutation ก่อนเปิดหลาย tenant
- [x] A12 แยก layout โดยไม่เปลี่ยน URL หลังบ้านเดิม และป้องกัน server render ที่ดึงข้อมูลก่อนตรวจ session
- [x] A13 กำหนด private/no-store และ cache scope ตาม principal/tenant; สลับบัญชี/ร้านต้องล้าง cache

**ตรวจรับ:** แก้ localStorage แล้วไม่ได้สิทธิ์เพิ่ม; เรียก API ตรงโดยไม่ login ไม่ผ่าน; A เปลี่ยน ID/branch เป็นของ B แล้วอ่าน/แก้ไม่ได้; เพิกถอน session มีผลจริง

### Phase 2 — บัญชีลูกค้าและผูกประวัติ (P0; หลัง Phase 1)

- [x] C01 เพิ่ม CustomerAccount/AuthIdentity/Link/Challenge ตาม data model พร้อม migration ที่ย้อนตรวจได้
- [x] C02 สมัคร/ยืนยัน/เข้าใช้บัญชี: expiry, attempts, cooldown, single-use challenge, resend และข้อความผิดพลาดที่ปลอดภัย
- [x] C03 ทำ provider adapter; dev mock เปิดได้เฉพาะ non-production; production ไม่มี key ต้อง fail closed
- [x] C04 หน้าโปรไฟล์/ช่องทางติดต่อ/เปลี่ยนเบอร์ พร้อม re-verification และถอน session ที่จำเป็น
- [x] C05 เชิญผูกประวัติด้วย token ครั้งเดียวหรือเจ้าหน้าที่อนุมัติ; แสดง pending/conflict/revoked
- [x] C06 เปิด portal ในบริบทร้านของบัญชีเท่านั้น; เปลี่ยนร้านต้องตรวจ login ของร้านปลายทางและล้าง cache ร้านเดิม; account ใหม่ไม่มีประวัติให้แสดง empty state พร้อมจองคิว
- [ ] C07 ออกแบบ recovery/เบอร์หาย/เบอร์ถูกใช้ซ้ำ; ห้ามโยกประวัติให้บัญชีใหม่อัตโนมัติ

**ตรวจรับ:** ลูกค้าสองคนใช้พร้อมกันและหลายอุปกรณ์ได้; การยืนยันเบอร์อย่างเดียวไม่ปลดล็อกประวัติเก่าที่ไม่ผ่านการผูก; ร้าน A ไม่เห็น link ของร้าน B

### Phase 3 — Portal ประวัติและติดตาม (P0; หลัง Phase 2)

- [x] P01 สร้าง CustomerLayout และ navigation 5 เมนู พร้อม shop context ที่อ่านง่าย
- [x] P02 หน้า dashboard ดึงเฉพาะงานเจ้าของบัญชีในร้านที่เลือก; งานรออนุมัติ/นัดใกล้สุดอยู่ด้านบน
- [x] P03 รายการซ่อม/ประวัติซื้อ มี pagination, filter, loading, empty, error และ retry
- [x] P04 รายละเอียดงานแสดง status mapping ไทย, public timeline, estimate, branch contact, public photos
- [x] P05 เพิ่ม RepairStatusEvent ใน transaction เดียวกับเปลี่ยนสถานะ; แยก internal notes จาก customerMessage
- [x] P06 Customer DTO ใช้ allowlist: ไม่ส่ง passcode/pattern/nationalId/signature/costPrice/internal notes รวมทั้ง nested relations
- [x] P07 เพิ่ม RepairQuote version และ decision endpoint; ตรวจเจ้าของ, สถานะ pending, expiry, version และยอดที่ยืนยัน
- [x] P08 ปิด POST อนุมัติด้วย trackingCode เดิม; การอนุมัติต้อง login หรือ step-up ที่ผูกสิทธิ์รายการและ quote version
- [x] P09 เปลี่ยน public tracking เป็น random token แบบ hash/หมดอายุ/ถอนสิทธิ์ได้; GET จำกัดข้อมูล ไม่ค้นด้วย IMEI อย่างเดียว
- [x] P10 วางการเปลี่ยน QR/ลิงก์เก่า: เลข REP เก่ายังใช้เป็นเลขเอกสาร แต่ไม่เปิดข้อมูลหรืออนุมัติได้ลำพัง
- [x] P11 หน้า tracking แสดงเวลาปรับปรุงล่าสุด; MVP refresh/poll แบบหยุดเมื่อ hidden และจัดการ request ซ้อน; ไม่อ้าง realtime เกินจริง
- [ ] P12 ใบเสร็จ/ใบรับประกันต้องตรวจ ownership ก่อนสร้าง/ดาวน์โหลด; URL ไฟล์ไม่ public ถาวร
- [x] P13 เปลี่ยน link บน landing/navbar/quick bar ให้เข้าประวัติและจองคิวได้ โดยข้อมูลสาขามาจาก tenant จริง

**ตรวจรับ:** เปลี่ยนสถานะจากหลังบ้านแล้ว portal เห็นหลัง refresh/poll; ลูกค้าอื่นอ่านรายการ/ไฟล์ไม่ได้; public GET/POST ไม่มี sensitive field; quote เก่าอนุมัติไม่ได้

### Phase 4 — จองคิวและหลังบ้านนัดหมาย (P0; หลัง Phase 2 และขอบเขต tenant พร้อม)

- [x] B01 เพิ่ม Service/BranchService/เวลาทำการ/วันหยุด/resource pool/capacity/BookingSlot
- [x] B02 Availability API ตรวจสาขา บริการ timezone ช่วงวัน lead time และ capacity; ส่งเฉพาะข้อมูลที่ใช้จอง
- [x] B03 สร้าง booking service แบบ transaction + atomic capacity claim + idempotency + bounded conflict retry
- [x] B04 จองก่อน login แล้วกลับมาทำต่อได้; ตรวจ slot ใหม่หลัง login ห้ามถือว่าราคาหรือที่ว่างเก่ายัง valid
- [x] B05 ทำ flow 5 ขั้นพร้อมสรุปร้าน/สาขา/บริการ/เวลา/เงื่อนไขก่อนยืนยัน
- [x] B06 หน้า success แสดง bookingRef, เพิ่มปฏิทิน, แผนที่, ติดต่อร้าน และดูนัดของฉัน
- [x] B07 เลื่อน/ยกเลิกคิวพร้อม preview และยืนยัน; บังคับ cutoff ที่ server และคืน capacity ครั้งเดียว
- [x] B08 จำกัด active booking และกันกดซ้ำ/ยิงซ้ำตาม account/tenant; ไม่ใช้ IP เป็นตัวแยกบัญชีเพียงอย่างเดียว
- [x] B09 หลังบ้าน `/appointments`: มุมมองวัน/รายการ, filter สาขา/สถานะ, ค้น bookingRef, check-in/no-show
- [x] B10 Check-in ผูกหรือสร้าง RepairJob แบบ idempotent พร้อม customer/branch ที่อยู่ tenant เดียวกัน
- [x] B11 ร้านปิดวันหรือเปลี่ยนเวลาทำการ: แสดงนัดที่ได้รับผลกระทบและ workflow ติดต่อ/เลื่อน ไม่ลบเงียบ
- [x] B12 บันทึก AppointmentEvent/AuditLog ของการแก้เวลา สถานะ และ staff override

**ตรวจรับ:** ยิงพร้อมกัน 20 requests ไป slot capacity=1 สำเร็จหนึ่งนัด; key ซ้ำไม่สร้างใหม่; เลื่อนชนไม่ทำคิวเดิมหาย; cancel ซ้ำไม่เพิ่ม capacity เกินจริง

### Phase 5 — แจ้งเตือนและข้อมูลเสริม (P1; หลัง Phase 3–4)

- [ ] N01 In-app notification สำหรับสถานะซ่อม/ใบเสนอราคา/ยืนยันคิว/เลื่อน/ยกเลิก/เตือนนัด
- [ ] N02 บันทึก outbox ใน transaction เดียวกับ business event; worker retry/backoff และ deduplicate
- [ ] N03 ก่อนส่ง reminder ตรวจสถานะ/เวลานัดล่าสุด ป้องกันเตือนเวลาที่ถูกเลื่อนหรือคิวที่ยกเลิกแล้ว
- [ ] N04 unread count/read state scope ตามบัญชี และ deep link ต้องตรวจสิทธิ์ซ้ำ
- [ ] N05 เพิ่ม email/SMS/LINE เฉพาะ channel ที่ตั้งค่าและผูกตัวตน provider แล้ว; ไม่ใช้ lineId ที่ผู้ใช้พิมพ์แทน provider identity
- [ ] N06 เพิ่ม preferences; provider ล่มไม่ rollback การจองที่สำเร็จแล้ว แต่แสดงสถานะส่งและ retry
- [ ] N07 หน้ารับประกัน/ประวัติเอกสาร; กำหนดเริ่มนับจากส่งมอบจริง ไม่เดาจาก createdAt
- [ ] N08 ประวัติผ่อนชำระ/จำนำ/แต้ม/รีวิว/ชำระเงิน เป็นงานเสริมแยก scope หลัง MVP

### Phase 6 — ตรวจรับและเปิดใช้งาน (P0 ก่อน rollout)

- [x] Q01 ทำ test fixture 2 tenants × 2 branches × 2 customers พร้อมเบอร์ CRM เดียวกันข้ามร้าน และหลาย session
- [x] Q02 ทดสอบ ownership ทั้ง list/detail/search/count/export/download/create/update/cancel/approve
- [x] Q02a ใช้เบอร์/username เดียวกันในสองร้าน ตรวจว่า login, OTP, recovery, session, account link และ cache ไม่ข้ามร้าน; เปลี่ยน shopSlug แล้ว session เดิมใช้ไม่ได้
- [x] Q03 ทดสอบ OTP expired/replayed/wrong attempts, logout/revocation, identity recovery และ cookie ที่หมดอายุ
- [x] Q04 ทดสอบ booking concurrency/idempotency/reschedule/cancel/timezone/closed day/lead time และ resource pool ร่วม
- [x] Q05 ทดสอบ quote version stale, ตัดสินใจซ้ำ, quote ถูกถอน และ response ไม่รั่วข้อมูล sensitive ทั้ง public/customer/staff
- [x] Q06 E2E: สมัคร → เชื่อมประวัติ → ดูงาน → อนุมัติราคา → staff อัปเดต → ลูกค้าเห็น; จอง → เลื่อน → check-in → เกิดงานเดียว
- [x] Q07 ตรวจหน้าจอ 360/390/768/1280px, keyboard/focus, label/error, touch target ≥44px, contrast, reduced motion และเนื้อหาไทยยาว
- [x] Q08 ตรวจ loading/empty/401/403/404/409/429/500/เน็ตหลุด/กดซ้ำ และไม่ให้หน้า cache ของคนก่อนค้าง
- [x] Q09 รัน build, TypeScript และ linter ที่รองรับโครงการจริง; เพิ่ม test runner เฉพาะที่จำเป็นต่อ auth/isolation/concurrency/E2E
- [x] Q10 ทำ migration dry run บน DB copy ตรวจจำนวนแถว ยอดเงิน orphan/tenant consistency และ restore ซ้อมก่อน production
- [x] Q11 Feature flag ต่อ tenant เปิดร้านทดสอบก่อน พร้อมบันทึกข้อผิดพลาดแบบไม่ log secret และแผน rollback
- [x] Q12 ตั้ง backup/monitoring สำหรับ session errors, forbidden access, booking conflicts, outbox failures; เขียน runbook

**ตรวจรับ MVP:** Phase 0–4 และ Phase 6 ผ่านครบ; ไม่มี P0 ค้าง; provider จริงพร้อม; migration ผ่านการซ้อม; ผู้ใช้จริงจองและดูเฉพาะข้อมูลตนได้

## 8. API contract ที่เสนอ

ทุก `/api/customer/*` ต้องตรวจ customer session; tenant มาจากร้านที่ resolve และ link ที่ server ยืนยันแล้ว ไม่ใช่เชื่อ query/body ลำพัง

| API | หน้าที่/ข้อจำกัด |
|---|---|
| `POST /api/customer/auth/request-code`, `verify-code` | challenge มี purpose/rate limit/expiry/single-use |
| `GET /api/customer/me`, `POST /api/customer/auth/logout` | ข้อมูลบัญชีแบบ allowlist / revoke session |
| `GET /api/customer/shop` | คืนข้อมูลร้านเจ้าของ session เท่านั้น; ไม่มีรายการบัญชีหรือสมาชิกข้ามร้าน |
| `POST /api/customer/links/claim` | ยื่นหลักฐาน; ไม่ auto-link จาก phone match |
| `GET /api/customer/repairs`, `/repairs/[id]` | tenant + customer link scope, pagination |
| `POST /api/customer/repairs/[id]/quotes/[quoteId]/decision` | action whitelist + quoteVersion + ownership + atomic decision |
| `GET /api/customer/purchases`, `/purchases/[id]` | ประวัติและเอกสารเฉพาะเจ้าของ |
| `GET /api/public/shops/[slug]/availability` | branch/service/date range ที่ valid; ไม่ส่งชื่อคนจอง |
| `GET/POST /api/customer/bookings` | list/create; POST ต้องมี idempotency key |
| `POST /api/customer/bookings/[id]/reschedule`, `/cancel` | ownership + cutoff + atomic state/capacity |
| `GET /api/staff/appointments`, `POST /[id]/check-in` | staff permission + tenant + branch scope |
| `GET /api/customer/notifications`, `POST /[id]/read` | อ่าน/แก้เฉพาะการแจ้งเตือนตน |

รูปแบบ error ให้สม่ำเสมอ เช่น `{ error: { code, message, fieldErrors? }, requestId }`; ข้อมูลต่าง tenant ที่ไม่ควรรู้การมีอยู่ตอบ 404, session หาย 401, สิทธิ์งานไม่พอ 403, slot/quote conflict 409, rate limit 429; ไม่ส่ง stack/DB error กลับผู้ใช้

## 9. ขอบเขตส่งมอบและลำดับแนะนำ

1. Session + tenant isolation เป็นฐานก่อน
2. บัญชีลูกค้า + เชื่อมประวัติ + portal ซ่อม/ซื้อ/ติดตาม/ใบเสนอราคา
3. จองคิว + จัดคิวหลังบ้าน + tests พร้อมใช้งาน MVP
4. แจ้งเตือนหลายช่องทาง เอกสาร และบริการเสริมภายหลัง

ยังไม่ประมาณเวลาตายตัวจน Phase 0 รู้ขอบเขต API เดิม ข้อมูลที่ต้องย้าย และ provider ที่เลือก; แยก PR ตาม phase เพื่อ review และ rollback ได้

## 10. เอกสารอ้างอิง

- [Next.js 14: Authentication](https://nextjs.org/docs/14/app/building-your-application/authentication) — ใช้แนวทางตรวจสิทธิ์ฝั่ง server; ตรวจรายละเอียดกับ Next.js 14 ที่ติดตั้ง
- [Next.js 14: Server Actions and Mutations](https://nextjs.org/docs/14/app/building-your-application/data-fetching/server-actions-and-mutations) — ตรวจ authorization ที่ทางเข้าของ mutation
- [Prisma: Transactions](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions) — อ้างอิงแนวคิด atomicity/conflict retry; หน้าอ้างอิงเป็น v6 ต้องตรวจ API ที่ใช้จริงกับ Prisma 5 ห้ามคัด API เวอร์ชันใหม่มาใช้ตรง ๆ
