# พรอมพ์พัฒนา Customer Portal — MobileShop-Hub

ใช้ข้อความใน code block ส่งให้ coding agent ที่เปิด repository นี้ได้
อ่าน TODO.md ควบคู่กัน; เอกสารทั้งสองเป็นข้อเสนอ ยังไม่ใช่การยืนยันว่าระบบที่ระบุถูกสร้างแล้ว

## พรอมพ์หลักแบบละเอียด

```text
คุณคือ senior full-stack engineer และ product designer ของ MobileShop-Hub
ให้ต่อยอด repository ปัจจุบันเป็น Customer Portal ภาษาไทยสำหรับร้านมือถือ/ศูนย์ซ่อม
ลูกค้าต้องเข้าบัญชี ดูประวัติซื้อ/ซ่อม ติดตามสถานะ ตัดสินใจใบเสนอราคา และจองคิวเข้ารับบริการได้
รองรับหลายลูกค้า หลายพนักงาน หลายสาขา และหลายร้านโดยข้อมูลไม่รั่วข้ามกัน
ขอบเขตที่ผู้ใช้ยืนยัน: หลายร้าน แต่ละร้านมีลูกค้าและพนักงานของตัวเอง
ใช้บัญชีแยกตามร้าน ไม่ทำ global customer account หรือ SSO ข้ามร้านใน MVP

เริ่มจากอ่าน AGENTS.md ที่ใช้กับพื้นที่งาน, TODO.md และไฟล์ที่เกี่ยวข้องจริง
TODO.md คือแผนหลัก ให้รักษา task ID และอัปเดต checkbox เฉพาะงานที่ทำและตรวจรับแล้ว
ถ้าข้อมูลที่ค้นใน repository ต่างจากเอกสาร ให้รายงานข้อเท็จจริงและปรับแผนก่อนใช้สมมติฐาน

ข้อเท็จจริงเริ่มต้นที่ต้องตรวจซ้ำ:
- โครงการใช้ Next.js 14 App Router, TypeScript, React 18, Tailwind, Prisma 5 และ SQLite
- มี /landing, /track และ /track/[trackingCode] อยู่แล้ว
- schema มี Tenant, Branch, User, Customer, RepairJob, Sale และสัญญาบริการต่าง ๆ
- tenantId หลายตารางยัง nullable; Customer.phone และ User.username ยัง global unique
- login handler ที่ตรวจครั้งก่อนส่ง JSON user แต่ยังไม่สร้าง server session
- AppContext มี demo users/default admin และ localStorage ซึ่งไม่ใช่หลักฐานการยืนยันตัวตน
- customer API และ repair service ยังมีจุดที่ไม่ scope tenant
- tracking code เป็นเลขเรียงลำดับ และ public POST เคยอนุมัติงานด้วย code อย่างเดียว
- root layout ครอบ AppLayout; ต้องแยก layout ลูกค้าออกจากหลังบ้าน
- working tree มีงานค้างหลายไฟล์ ห้าม reset/overwrite/clean เพื่อทำงานนี้

หลักการทำงาน:
1. ตรวจ git status/diff และ baseline ก่อนแก้ไข; เก็บงานเดิมทั้งหมด
2. ใช้ stack/components/fonts เดิมที่เหมาะสม ห้ามยก framework หรือ database version โดยไม่มีเหตุผล
3. ทำงานเป็น phase/PR เล็กที่ตรวจรับได้ ไม่สร้างหน้าจอสวยที่ต่อกับข้อมูลจำลองแล้วรายงานว่าเสร็จ
4. เรื่อง routine เลือกทางที่เรียบง่ายและบันทึกเหตุผล เรื่อง provider/secret/ค่าใช้จ่ายที่ยังไม่มีให้ถามพร้อมทำส่วนอิสระต่อ
5. ไม่ส่ง SMS/email/LINE จริงระหว่างทดสอบโดยไม่ได้รับอนุญาต; ใช้ test adapter ใน non-production เท่านั้น
6. ไม่รัน destructive migration กับฐานจริง ใช้ DB สำเนาและแผนย้าย/restore ที่ทดสอบแล้ว

สถาปัตยกรรมบัญชี:
- แยก CustomerAccount (ตัวตน login ภายใน tenant เดียว) จาก Customer (CRM ของร้าน) และ User (พนักงานเดิม)
- CustomerAccount เชื่อม Customer ผ่าน CustomerAccountLink ที่มี tenantId/status/proof/audit
- CustomerAccount และ User ต้องมี tenantId; บัญชีและข้อมูลของแต่ละร้านแยกจากกัน
- บุคคลเดียวใช้เบอร์/username ซ้ำในคนละร้านได้ แต่เป็นคนละบัญชี ใช้ unique key ตาม tenant
- AuthIdentity ใช้ unique(tenantId, provider, providerSubject); Session/VerificationChallenge/AccountLink ต้องผูก tenant และตรวจความสอดคล้องทุก relation
- เลือกร้านผ่าน shopSlug ก่อน login; server resolve ร้านและตรวจ tenant ในทุกขั้นของ OTP/login/recovery
- เปลี่ยนร้านต้องเข้าบัญชีร้านปลายทางใหม่ ไม่ใช้ session เดิมเป็นสิทธิ์ข้ามร้าน และล้าง cache ข้อมูลร้านเดิม
- ห้าม auto-link ประวัติเก่าเพราะ phone ตรงกันอย่างเดียว; ต้องมี invitation token ครั้งเดียวหรือ staff ตรวจอนุมัติ
- MVP ให้ Customer CRM มี active customer-account เจ้าของหนึ่งราย; family/delegated access อยู่นอก scope
- พนักงานแต่ละ User อยู่ร้านเดียวและมี StaffBranchAccess; ร้านหนึ่งมีหลายสาขาได้
- หลายอุปกรณ์ใช้หลาย server sessions; browser เดียวสลับคนด้วย logout/login; ไม่เก็บ password/token หลายบัญชีใน localStorage

ความปลอดภัยที่ต้องทำก่อนเปิด portal:
- ใช้ server-validated session และ cookie HttpOnly/Secure ใน production/SameSite/expiry/revocation
- แยก staff/customer cookie และตรวจชนิด principal ทุก endpoint
- AppContext ใช้ /me เป็นข้อมูลแสดงผล ห้ามเลือก user/role จาก client แล้วได้สิทธิ์จริง
- ตรวจสิทธิ์ใน Route Handler, Server Action, server page และ service ที่แตะข้อมูล ไม่พึ่ง middleware/layout อย่างเดียว
- ทุก query รวม list/detail/count/search/export/file ต้อง scope tenant + owner/permission
- tenant ที่เลือกจาก URL/body ต้อง resolve และตรวจสิทธิ์ใหม่; role/customerId จาก client ไม่ใช่ authority
- validate customer/branch/technician/product ทุก relation ว่าเป็น tenant เดียวกัน
- ลบ fallback เลือกสาขาแรกเมื่อข้อมูลไม่ครบ แล้วตอบ validation error
- เปลี่ยน uniqueness/lookup/upsert ให้ถูก namespace ของร้าน รวมข้อมูล shared อย่าง Product และ counter
- rate limit login/OTP/tracking และควบคุม OTP TTL/attempts/replay/cooldown; log ไม่เก็บ secret
- ป้องกัน CSRF/origin ของ cookie mutation และกำหนด private/no-store สำหรับข้อมูลบัญชี
- response ใช้ DTO allowlist ไม่ส่ง ORM object ทั้งก้อนแม้ mutation สำเร็จ
- ห้ามส่ง passcode, patternLock, nationalId, signature, costPrice, internal notes หรือ relations ที่เผยสิ่งเหล่านี้ให้ลูกค้า

การเข้าสู่ระบบลูกค้า:
- ข้อเสนอเริ่มต้นเป็นเบอร์โทร + OTP ผ่าน provider adapter ที่ตั้งค่าได้
- ต้องมี verified identity, recovery, เปลี่ยนเบอร์, logout ทุกอุปกรณ์ และถอนสิทธิ์ได้
- dev mock แยกชัดเจนและ production ต้อง fail closed ถ้า provider/config ไม่ครบ
- OTP ยืนยันเบอร์ปัจจุบัน ไม่ได้ให้สิทธิ์ประวัติเก่าอัตโนมัติ

UX/UI:
- mobile-first ภาษาไทย ใช้ Anuphan/Plus Jakarta Sans และแนวทางเว็บเดิม ไม่เปลี่ยนแบรนด์โดยไม่จำเป็น
- หน้าลูกค้าไม่มี admin sidebar; mobile navigation: หน้าหลัก/งานของฉัน/จองคิว/แจ้งเตือน/บัญชี
- dashboard ให้เห็นงานที่ต้องทำก่อน: ใบเสนอรออนุมัติ งานล่าสุด นัดถัดไป ปุ่มจองคิว
- ใช้ status text พร้อมสี, timestamp ล่าสุด, ราคาอ่านง่าย และปุ่มหลักชัดเจน
- ทุกรายการมี loading/empty/error/retry/unauthorized/not-found/conflict/success
- รองรับ keyboard/focus/label/contrast/reduced motion และ touch target อย่างน้อย 44px
- ดูที่ 360, 390, 768, 1280px พร้อมข้อความไทยยาวและรายการจำนวนมาก
- ไม่ใส่สถิติ รีวิว ราคา หรือมาตรฐานบริการที่ไม่มีข้อมูลจริง

Routes:
- /s/[shopSlug] หน้าร้าน; /s/[shopSlug]/book เริ่มจอง
- /customer/login, /customer, /customer/repairs, /customer/repairs/[id]
- /customer/purchases, /customer/purchases/[id]
- /customer/bookings, /customer/bookings/[id]
- /customer/notifications, /customer/profile
- /appointments สำหรับพนักงานที่มีสิทธิ์
- ใช้ route groups แยก public/customer/staff โดยรักษา URL หลังบ้านเดิม ไม่สร้าง route ซ้ำ

งานซ่อมและใบเสนอราคา:
- reuse RepairJob เดิม ผ่าน customer-scoped repository และ DTO
- ทำ public timeline จาก RepairStatusEvent ที่บันทึกจริง ไม่สร้างเวลาเหตุการณ์ย้อนหลังขึ้นเอง
- mapping สถานะเดิม PENDING, DIAGNOSING, WAITING_PARTS, REPAIRING, QC_PASSED, READY, COMPLETED, CANCELLED เป็นข้อความไทย
- แยก quote state ออกจาก repair status; quote มี version, snapshot ยอด/รายการ, expiry, decision actor/time
- อนุมัติ/ปฏิเสธต้องตรวจ ownership, current version, allowed state และบันทึกแบบ atomic/idempotent
- quote เปลี่ยนราคาแล้วต้องยืนยันฉบับใหม่ ไม่ใช้ boolean customerApproved อย่างเดียว
- แยก random public tracking token จากเลขเอกสาร REP; hash token, revoke/expire และจำกัดข้อมูลอ่าน
- ปิด public mutation แบบเก่า; ทั้ง GET/POST ต้องไม่มี response รั่ว sensitive data
- วาง migration QR/link เก่าโดยเลขเอกสารเดี่ยวไม่ใช้เปิดข้อมูลส่วนตัวได้
- MVP ใช้ manual refresh หรือ polling ที่จัดการ hidden tab/race ได้ แสดง updatedAt; ไม่อ้าง realtime หากไม่มี
- เอกสาร/ภาพลูกค้าต้องตรวจสิทธิ์ก่อนเข้าถึง และไฟล์ private ใช้ URL อายุสั้นเมื่อเหมาะสม

ระบบจอง:
- MVP คือเวลานำเครื่องเข้า ไม่ใช่รับประกันซ่อมเสร็จ
- branch/service/วันหยุด/timezone/lead time/capacity ต้องกำหนดได้
- ข้อเสนอเริ่มต้นรับเครื่องช่วงละ 30 นาที ใช้ resource pool ร่วมสำหรับบริการที่ใช้คนชุดเดียวกัน
- ดูเวลาว่างไม่ถือว่าล็อกที่ จองจริงตรวจอีกครั้งใน transaction
- ใช้ conditional atomic capacity claim + Appointment + idempotency ใน transaction เดียว
- ห้าม read-count แล้ว insert แยกกันเพราะป้องกันจองชนไม่ได้
- idempotency scope คือ account/tenant/action/key; key เดิม payload ต่างตอบ conflict
- retry conflict แบบ bounded ตาม DB/Prisma รุ่นที่ติดตั้ง; เลี่ยงส่งผลข้างเคียงภายนอกใน transaction
- เลื่อนคิวต้องจองใหม่และคืนคิวเก่า atomic; slot ใหม่เต็มคิวเก่าอยู่ครบ
- cancel/retry/replay ต้องคืน capacity ครั้งเดียวตาม state transition
- เก็บ UTC แสดง Asia/Bangkok; ตรวจ date range และ cutoff ฝั่ง server
- ค่าเริ่มต้นที่ปรับได้: จองล่วงหน้า 1 ชั่วโมง–30 วัน, เลื่อน/ยกเลิกก่อนนัด 2 ชั่วโมง, active bookings ไม่เกิน 3 ต่อร้าน
- CONFIRMED -> CHECKED_IN -> COMPLETED หรือ CANCELLED/NO_SHOW; การเลื่อนเก็บ event
- staff calendar/list แยกตาม branch permission; check-in สร้าง/ผูก RepairJob ได้ครั้งเดียว
- ปิดวัน/ลด capacity ต้องมี workflow จัดการคิวเดิม ไม่ลบเงียบ

การแจ้งเตือน:
- MVP หลักทำธุรกรรมและดูประวัติให้ครบก่อน ส่วน in-app/ช่องทางภายนอกเป็น phase ถัดไป
- outbox บันทึกพร้อม business event, worker retry/backoff/dedup
- reminder ตรวจนัดเวอร์ชันล่าสุดก่อนส่ง ไม่เตือนคิวที่ยกเลิก/เลื่อนไปแล้ว
- LINE/email/SMS ใช้ verified provider identity และ config จริงเท่านั้น

ลำดับดำเนินงาน:
Phase 0 inventory/baseline/provider decisions/backup
Phase 1 session/RBAC/tenant isolation/API เดิม/layout guard
Phase 2 customer identity/link/recovery
Phase 3 portal/history/tracking/quote/documents
Phase 4 booking + staff appointments
Phase 5 notification/warranty/optional channels
Phase 6 integration/security/concurrency/E2E/visual QA/migration rehearsal/rollout
ใช้รายละเอียด task IDs และ acceptance gates จาก TODO.md

การตรวจรับขั้นต่ำ:
- fixtures สองร้าน ร้านละสองสาขา ลูกค้าสองคนต่อร้าน รวมเบอร์ CRM ซ้ำข้ามร้าน
- ไม่ login แล้วเรียก private API ไม่ผ่าน; แก้ localStorage แล้วไม่ได้สิทธิ์
- ลูกค้า A เปลี่ยน id/tenantId/branchId เป็นของ B แล้วอ่าน/แก้/download ไม่ได้
- ใช้เบอร์/username เดียวกันในสองร้านแล้ว login/OTP/recovery/session ยังแยกบัญชี; token หรือ challenge ของร้าน A ใช้กับร้าน B ไม่ได้
- staff ข้ามร้าน/สาขาที่ไม่มีสิทธิ์ไม่ได้ และ server render ไม่ดึงข้อมูลก่อนตรวจ session
- 20 concurrent requests แยก key ลง slot capacity=1 ได้คิวเดียว
- retry key เดิมได้ผลเดิม; cancel ซ้ำไม่เพิ่ม capacity; เลื่อนชนไม่ทำคิวเดิมหาย
- OTP หมดอายุ/ใช้ซ้ำ/session revoked/quote stale ไม่ผ่าน
- public tracking และ customer response ไม่มีข้อมูลต้องห้ามทั้ง GET และ mutation
- E2E สมัคร/เชื่อมประวัติ/ดูงาน/อนุมัติ และจอง/เลื่อน/check-in/เกิดงานเดียว
- ทดสอบจริงกับ DB engine เป้าหมายสำหรับ concurrency และ migration
- build/TypeScript/lint ที่ใช้ได้กับ repo จริง ผ่าน; บอก baseline failures ที่ยังมีชัดเจน

ผลลัพธ์ที่ต้องส่งแต่ละ phase:
1. สรุปการเปลี่ยนแปลงและเหตุผล พร้อมลิงก์ไฟล์
2. migration/schema/API/หน้าจอที่ใช้งานได้จริงใน scope นั้น
3. ผลตรวจรับจริง ระบุสิ่งที่ยังไม่ได้ทดสอบ ไม่รายงานผ่านจากการคาดเดา
4. อัปเดต TODO.md และรายการ config/provider/secret ที่ต้องตั้งค่า โดยไม่เปิดเผยค่า secret
5. ระบุ phase ถัดไปและ blocker เฉพาะที่ต้องการข้อมูลภายนอก

เริ่มทำ Phase 0 แล้ว Phase 1 ให้ครบก่อนขยับไปงานลูกค้าที่พึ่ง session
ถ้าเป็นการทำครั้งเดียวต่อเนื่อง ให้เดินตาม phase จนครบ scope ที่ผู้ใช้สั่ง
อย่าอัปเดต checkbox งานที่ยังไม่ทำ และอย่าสรุปว่าพร้อม production จน P0/checks/config ที่เกี่ยวข้องครบ
```

## พรอมพ์สั้นสำหรับแบ่งรอบทำงาน

### รอบ 1 — ฐานหลายบัญชี

```text
อ่าน TODO.md และ docs/CUSTOMER_PORTAL_PROMPT.md แล้วทำเฉพาะ Phase 0–1
เน้น server sessions, role/branch permission, tenant isolation และ API เดิมทั้งหมดที่เข้าถึงข้อมูลธุรกิจ
รักษางานใน working tree และ URL เดิม ทำ migration rehearsal ใน DB สำเนา
ตรวจรับด้วยสอง tenants/หลายสาขาและการเรียก API ตรง ห้ามทำ portal โดยอิง role จาก localStorage
ส่งผลทดสอบจริงและอัปเดต TODO ตามที่ทำเสร็จ
```

### รอบ 2 — ประวัติและสถานะของลูกค้า

```text
อ่านแผนสองไฟล์และตรวจ Phase 1 ว่าผ่านจริงก่อน ทำ Phase 2–3
สร้างบัญชีลูกค้า/verified identity/เชื่อม CRM ด้วยหลักฐาน/โปรไฟล์/หน้า dashboard/ประวัติซ่อมซื้อ
ทำ timeline/quote version/customer DTO และเปลี่ยน public tracking จากเลขเรียงเป็น secret token
ปิด mutation เก่าที่ใช้ trackingCode ลำพัง ตรวจทั้งข้อมูลและไฟล์ไม่ให้ข้ามบัญชีหรือ tenant
หาก provider key ขาด ให้ทำ adapter/test flow และรายงาน blocker โดยไม่เปิด mock ใน production
```

### รอบ 3 — จองคิวเชื่อมหลังบ้าน

```text
อ่านแผนและตรวจ dependency แล้วทำ Phase 4
สร้าง availability, flow จอง 5 ขั้น, รายการนัด/เลื่อน/ยกเลิก และหลังบ้าน appointments/check-in
ใช้ shared resource pool, atomic capacity reservation, transaction และ idempotency ตาม TODO
ทดสอบพร้อมกัน 20 requests ลง slot capacity=1, replay, cancel ซ้ำ, เลื่อนชนและ timezone
check-in ต้องสร้าง RepairJob ครั้งเดียวและผูกลูกค้า/สาขาใน tenant ที่ถูกต้อง
```

### รอบ 4 — แจ้งเตือนและเตรียมเปิดใช้

```text
อ่านแผน ทำ Phase 5 ตาม scope ที่ตกลงและ Phase 6 ให้ครบ
ทำ in-app notifications/outbox/dedup/retry และทดสอบทั้งสองฝั่งด้วยข้อมูลหลายบัญชีหลายร้าน
ตรวจ responsive/accessibility/private cache/OTP/session/ownership/quote/concurrency/migration restore
แยกช่องทาง SMS/LINE/email ที่ยังไม่มี config เป็น blocker ชัดเจน ไม่ใช้ข้อมูลจำลองแทนผลผ่าน
เตรียม feature flag เปิด tenant ทดสอบ, runbook และรายงาน P0 ที่ยังค้างอย่างตรงไปตรงมา
```
