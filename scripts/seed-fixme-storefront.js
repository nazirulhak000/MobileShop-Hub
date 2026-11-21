const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dbPath = path.join(process.cwd(), 'prisma', 'dev.db').replaceAll('\\', '/');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function seedFixMeStorefront() {
  console.log("Seeding FixMe Storefront Configuration into prisma/dev.db...");

  // 1. Ensure Tenant exists
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fixme' },
    update: {
      name: 'FixMe ซ่อมมือถือ',
      logoUrl: '/images/fixme/logo.jpg',
      status: 'ACTIVE',
    },
    create: {
      id: 'tenant-fixme-hq-main',
      name: 'FixMe ซ่อมมือถือ',
      slug: 'fixme',
      logoUrl: '/images/fixme/logo.jpg',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      maxBranches: 10,
      maxUsers: 50,
    },
  });
  console.log("Tenant verified:", tenant.id, tenant.slug, tenant.name);

  // 2. Ensure Primary Branch exists with phone and address
  let branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (branch) {
    branch = await prisma.branch.update({
      where: { id: branch.id },
      data: {
        name: 'FixMe สำนักงานใหญ่ (พระราม 9)',
        phone: '082-999-9999',
        address: '88 อาคาร FixMe Hub ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
      },
    });
  } else {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'FixMe สำนักงานใหญ่ (พระราม 9)',
        code: 'HQ001',
        phone: '082-999-9999',
        address: '88 อาคาร FixMe Hub ถนนพระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพมหานคร 10310',
        taxId: '0105561234567',
      },
    });
  }
  console.log("Branch verified:", branch.id, branch.name, branch.phone);

  // 3. Define pricing rates with FREE 0฿ and super-cheap rates
  const customPricingRates = [
    {
      id: "rate-free-diag",
      name: "ตรวจเช็กอาการและเปิดเครื่องวิเคราะห์ ทุกรุ่น",
      badge: "ฟรี 0 บาท",
      basePrice: 0,
      timeEst: "10 - 15 นาที",
    },
    {
      id: "rate-free-clean",
      name: "ล้างเครื่อง ไล่ความชื้น ปัดฝุ่นลำโพง/ไมโครโฟน",
      badge: "ฟรี 0 บาท",
      basePrice: 0,
      timeEst: "15 นาที",
    },
    {
      id: "rate-free-consult",
      name: "ปรึกษาปัญหาเครื่องและตรวจวัดไฟเมนบอร์ด",
      badge: "ฟรี 0 บาท",
      basePrice: 0,
      timeEst: "10 นาที",
    },
    {
      id: "rate-film",
      name: "ติดฟิล์มไฮโดรเจล / กระจกนิรภัย 9H กันกระแทก",
      badge: "โปรเปิดร้าน 29.-",
      basePrice: 29,
      timeEst: "5 นาที",
    },
    {
      id: "rate-glass",
      name: "ลอกกระจกจอแท้ OCA (คงจอแท้เดิม คมชัด 100%)",
      badge: "เริ่มต้น 199.-",
      basePrice: 199,
      timeEst: "40 นาที",
    },
    {
      id: "rate-battery",
      name: "เปลี่ยนแบตเตอรี่ มอก. แท้ ความจุ 100% รับประกัน 180 วัน",
      badge: "เริ่มต้น 290.-",
      basePrice: 290,
      timeEst: "20 - 30 นาที",
    },
    {
      id: "rate-port",
      name: "ซ่อมก้นชาร์จ เปลี่ยนแพรชาร์จ ชาร์จช้า/ไม่เข้า",
      badge: "ราคาพิเศษ 250.-",
      basePrice: 250,
      timeEst: "25 นาที",
    },
    {
      id: "rate-camera",
      name: "เปลี่ยนกระจกเลนส์กล้องหลัง แตก/มัว ถ่ายรูปคมชัด",
      badge: "เริ่มต้น 150.-",
      basePrice: 150,
      timeEst: "20 นาที",
    },
    {
      id: "rate-screen",
      name: "เปลี่ยนชุดหน้าจอแท้ OLED Super Retina XDR",
      badge: "รับประกัน 180 วัน",
      basePrice: 590,
      timeEst: "30 นาที",
    },
  ];

  // 4. Define FAQs
  const customFaqs = [
    {
      id: "faq-1",
      question: "ตรวจเช็กอาการและเปิดเครื่อง มีค่าใช้จ่ายหรือไม่?",
      answer: "ฟรี 100% ไม่มีค่าเปิดเครื่อง ไม่มีค่าตรวจเช็กใดๆ ทั้งสิ้น ช่างวิศวกรของ FixMe จะตรวจเช็กอาการและแจ้งราคาอย่างโปร่งใสให้ลูกค้าทราบก่อนตัดสินใจซ่อมทุกครั้ง หากลูกค้าไม่สะดวกซ่อม สามารถรับเครื่องกลับได้ทันทีโดยจ่าย 0 บาท",
      highlight: "ตรวจเช็กฟรี 0 บาท ไม่มีเงื่อนไขผูกมัด",
    },
    {
      id: "faq-2",
      question: "นโยบาย 'ซ่อมไม่หาย ไม่คิดเงิน' (No Fix, No Fee) คืออะไร?",
      answer: "หากนำเครื่องมาซ่อมแล้วอาการเดิมไม่หาย หรือไม่สามารถแก้ไขปัญหาได้ตามมาตรฐานที่ตกลงกันไว้ ทางร้าน FixMe จะไม่คิดค่าบริการใดๆ ทั้งสิ้น 0 บาท ยึดมั่นความซื่อสัตย์และจริงใจกับลูกค้าเป็นอันดับหนึ่ง",
      highlight: "ซ่อมไม่หาย ไม่คิดเงิน 100%",
    },
    {
      id: "faq-3",
      question: "งานซ่อมด่วนรอรับได้เลย ใช้เวลากี่นาที?",
      answer: "งานซ่อมเปลี่ยนอะไหล่ส่วนใหญ่ เช่น เปลี่ยนแบตเตอรี่, เปลี่ยนจอ, ซ่อมก้นชาร์จ, ลอกกระจก หรือติดฟิล์ม ใช้เวลาเพียง 15 - 30 นาที สามารถนั่งรอรับเครื่องได้ทันทีในห้องรับรองแอร์เย็นสบาย พร้อมดูขั้นตอนการซ่อมจริงผ่านกระจกใส",
      highlight: "ด่วน 15 - 30 นาที รอรับได้เลย",
    },
    {
      id: "faq-4",
      question: "การรับประกันงานซ่อมและอะไหล่ครอบคลุมอย่างไร?",
      answer: "FixMe รับประกันงานซ่อมและอะไหล่นานสูงสุด 90 ถึง 180 วันเต็ม (แบตเตอรี่มาตรฐาน มอก. และชุดหน้าจอแท้) พร้อมออกใบรับประกันและมีระบบ Live Tracking ตรวจสอบประวัติการซ่อมออนไลน์ได้ตลอด 24 ชั่วโมง",
      highlight: "รับประกันสูงสุด 90-180 วันเต็ม",
    },
    {
      id: "faq-5",
      question: "ข้อมูลในเครื่อง รูปภาพ และแชท LINE จะปลอดภัยหรือไม่?",
      answer: "ปลอดภัย 100% งานซ่อมฮาร์ดแวร์ทั่วไปไม่จำเป็นต้องล้างเครื่องหรือรีเซ็ตข้อมูล ข้อมูล รูปภาพ และแอปพลิเคชันทุกอย่างอยู่ครบถ้วนสมบูรณ์ พร้อมมาตรการรักษาความลับข้อมูลลูกค้าอย่างเคร่งครัด",
      highlight: "ข้อมูลปลอดภัย 100% ไม่ต้องล้างเครื่อง",
    },
  ];

  // 5. Define Before / After Cases with real images from visuals
  const customBeforeAfterCases = [
    {
      id: "case-fixme-1",
      device: "iPhone 13 Pro 256GB (Sierra Blue)",
      issue: "จอแตกยับ จอในดับมืด ทัชสกรีนไม่ตอบสนองหลังทำตกกระแทกพื้น",
      repairSolution: "ตรวจเช็กฟรี 0.- เปลี่ยนชุดจอแท้ 120Hz ProMotion + ย้าย True Tone IC + ซีลกันน้ำแท้สูญญากาศ",
      repairTime: "30 นาที (รอรับได้เลย)",
      warranty: "รับประกัน 180 วัน",
      beforeImg: "/images/fixme/screen-repair-before-after.jpg",
      beforeDesc: "กระจกหน้าจอแตกร้าวละเอียด จอด้านในดับมืด สัมผัสไม่ตอบสนอง",
      afterImg: "/images/fixme/screen-repair.jpg",
      afterDesc: "ซ่อมเสร็จใสปิ๊ง จอแท้ 120Hz ProMotion สีสันคมชัด ทัชสกรีนลื่นไหล 100%",
      pins: [
        {
          id: "pin-1",
          x: 35,
          y: 45,
          title: "ตรวจเช็กฟรี 0 บาท",
          detail: "ตรวจวัดวงจรจ่ายไฟและการกินกระแสเมนบอร์ดก่อนซ่อม ฟรี 100%",
          category: "before",
        },
        {
          id: "pin-2",
          x: 65,
          y: 35,
          title: "True Tone & 120Hz สมบูรณ์",
          detail: "คัดลอกค่ารหัสหน้าจอเดิมลงจอใหม่ ฟังก์ชัน True Tone กลับมาใช้งานได้ทันที",
          category: "after",
        },
        {
          id: "pin-3",
          x: 50,
          y: 80,
          title: "ซีลกาวกันน้ำแท้ IP68",
          detail: "ประกอบด้วยเครื่องอัดความดันสูญญากาศ ขอบแนบสนิท ป้องกันฝุ่นและความชื้น",
          category: "both",
        },
      ],
    },
    {
      id: "case-fixme-2",
      device: "Samsung Galaxy S23 5G (Phantom Black)",
      issue: "แบตเตอรี่เสื่อม บวมดันฝาหลังอ้า แบตหมดไว ชาร์จไม่เต็ม 100%",
      repairSolution: "ตรวจเช็กฟรี 0.- เปลี่ยนแบตเตอรี่มาตรฐาน มอก. แท้ 100% พร้อมซีลกาวฝาหลังกันน้ำแท้",
      repairTime: "25 นาที (รอรับได้เลย)",
      warranty: "รับประกัน 180 วัน",
      beforeImg: "/images/fixme/battery-repair.jpg",
      beforeDesc: "แบตเตอรี่เสื่อมบวม ดันฝาหลังเปิดอ้า มีความเสี่ยงต่อความปลอดภัย",
      afterImg: "/images/fixme/technician-workbench.jpg",
      afterDesc: "เปลี่ยนใหม่ 100% Battery Health เครื่องไม่ร้อน ฝาหลังแนบสนิท ปลอดภัยสูงสุด",
      pins: [
        {
          id: "pin-b1",
          x: 50,
          y: 40,
          title: "แบตเตอรี่ มอก. แท้ 100%",
          detail: "เซลล์แบตเตอรี่เกรดพรีเมียม ความจุเต็ม มั่นใจความปลอดภัย ไม่ระเบิด ไม่ร้อน",
          category: "after",
        },
        {
          id: "pin-b2",
          x: 50,
          y: 75,
          title: "ฟรีค่าแรงตรวจเช็ก 0.-",
          detail: "ฟรีค่าเปิดเครื่องและตรวจเช็กระบบชาร์จ ไม่มีบวกค่าแรงเพิ่ม",
          category: "both",
        },
      ],
    },
  ];

  // 6. Define Customer Reviews praising free diagnosis and cheapest prices
  const customerReviews = [
    {
      id: "rev-fixme-1",
      name: "คุณวิภาดา รุ่งเรือง",
      category: "all",
      rating: 5,
      device: "iPhone 13 Pro",
      date: "เมื่อวานนี้",
      avatarColor: "bg-blue-600",
      comment: "ประทับใจมากค่ะ! เอาเครื่องไปตรวจเช็กอาการดับ ช่างตรวจให้อย่างละเอียดฟรี 0 บาทจริงๆ ไม่คิดเงินสักบาท สรุปเป็นแค่แพรหลวม ช่างใส่ให้แถมปัดฝุ่นลำโพงฟรี บริการจริงใจ ซื่อสัตย์มาก ราคาถูกที่สุดในย่านนี้เลย แนะนำเลยค่ะ!",
    },
    {
      id: "rev-fixme-2",
      name: "คุณเกรียงไกร มั่นคง",
      category: "screen",
      rating: 5,
      device: "iPhone 11",
      date: "2 วันที่แล้ว",
      avatarColor: "bg-blue-700",
      comment: "จอแตกยับ นึกว่าจะต้องเปลี่ยนจอหลักพัน ช่างแนะนำว่าลอกกระจกได้ จ่ายแค่หลักร้อย ได้จอแท้เดิมภาพสวยเหมือนเดิม รอแค่ 30 นาทีรับเครื่องได้เลย ราคาถูกกว่าศูนย์เป็นเท่าตัว แถมมีประกันให้อีก คุ้มค่าที่สุดครับ",
    },
    {
      id: "rev-fixme-3",
      name: "คุณชลธิชา พงษ์ศิริ",
      category: "battery",
      rating: 5,
      device: "Samsung S23",
      date: "4 วันที่แล้ว",
      avatarColor: "bg-sky-600",
      comment: "แบตบวมจนดันฝาหลัง เปลี่ยนแบต มอก. ใหม่ แค่ 20 นาทีเสร็จ สุขภาพแบต 100% ช่างเปลี่ยนซีลกาวกันน้ำให้ใหม่เอี่ยม ราคาถูกมาก สบายกระเป๋าจริง บริการ 5 ดาวเลยค่ะ",
    },
    {
      id: "rev-fixme-4",
      name: "คุณพีรภัทร ชาญวิทย์",
      category: "all",
      rating: 5,
      device: "iPad Air 4",
      date: "1 สัปดาห์ที่แล้ว",
      avatarColor: "bg-indigo-600",
      comment: "ชอบนโยบาย No Fix No Fee และตรวจเช็กฟรี 0 บาทมากครับ รู้สึกปลอดภัยไม่ต้องกลัวโดนฟันราคา ช่างอธิบายละเอียด อะไหล่คุณภาพดีมาก ติดฟิล์มกระจกแค่ 29 บาท ถูกที่สุดเท่าที่เคยเจอมาแล้ว",
    },
  ];

  // 7. Footer Social Links + Metadata bag
  const footerSocialLinks = JSON.stringify({
    facebook: "https://facebook.com/fixme",
    line: "https://line.me/ti/p/@fixme",
    tiktok: "https://tiktok.com/@fixme",
    bannerUrl: "/images/fixme/hero-repair.jpg",
    logoUrl: "/images/fixme/logo.jpg",
    seoTitle: "FixMe ซ่อมมือถือ ด่วน รอรับได้เลย | ตรวจเช็กฟรี 0 บาท",
    seoDescription: "ศูนย์ซ่อมมือถือด่วนมาตรฐานแล็บ ตรวจเช็กฟรี 0 บาท ช่างมือโปร อะไหล่แท้ รับประกัน 90-180 วัน ติดฟิล์ม 29.- เปลี่ยนแบต 290.-",
    customerReviews: customerReviews,
  });

  // 8. Custom Sections for rich visual layout
  const customSections = JSON.stringify([
    {
      id: "block-promo-hero",
      type: "promo_banner",
      title: "โปรโมชันเปิดร้านใหม่ ตรวจเช็กฟรี 0 บาททุกอาการ!",
      subtitle: "ไม่คิดค่าเปิดเครื่อง ไม่คิดค่าประเมินราคา ซ่อมไม่หายไม่คิดเงิน 100%",
      badge: "🎉 SPECIAL OFFER",
      buttonText: "ติดต่อปรึกษาช่างทันที",
      buttonUrl: "https://line.me/ti/p/@fixme",
      imageUrl: "/images/fixme/storefront.jpg",
      enabled: true,
      order: 1,
    },
  ]);

  // 9. Upsert StorefrontConfig
  const storefrontConfig = await prisma.storefrontConfig.upsert({
    where: { tenantId: tenant.id },
    update: {
      themeColor: "blue",
      fontFamily: "anuphan",
      heroLayout: "split",
      headline: "FixMe ซ่อมมือถือ ด่วน รอรับได้เลย",
      subheadline: "ตรวจเช็กอาการฟรี 0 บาท! ช่างมือโปร อะไหล่แท้ รับประกันงานซ่อม ราคาสบายกระเป๋าที่สุด",
      badge: "✨ บริการตรวจเช็กและประเมินราคา ฟรี 100%",
      announcementEnabled: true,
      announcementText: "🎉 ฉลองเปิดระบบออนไลน์: ตรวจเช็กฟรี 0.- | ติดฟิล์มกระจก 29.- | ปรึกษาช่างฟรี 24 ชม.",
      phone: "082-999-9999",
      lineId: "@fixme",
      googleMapsUrl: "https://maps.google.com/?q=FixMe",
      showLiveTracking: true,
      showHardwareScanner: true,
      showServicesBento: true,
      showInspectionBench: true,
      showPriceEstimator: true,
      showBeforeAfterSlider: true,
      showCustomerReviews: true,
      showLocationSection: true,
      showFaqSection: true,
      showMobileQuickBar: true,
      customPricingRates: JSON.stringify(customPricingRates),
      customFaqs: JSON.stringify(customFaqs),
      customBeforeAfterCases: JSON.stringify(customBeforeAfterCases),
      footerSocialLinks: footerSocialLinks,
      customSections: customSections,
    },
    create: {
      tenantId: tenant.id,
      themeColor: "blue",
      fontFamily: "anuphan",
      heroLayout: "split",
      headline: "FixMe ซ่อมมือถือ ด่วน รอรับได้เลย",
      subheadline: "ตรวจเช็กอาการฟรี 0 บาท! ช่างมือโปร อะไหล่แท้ รับประกันงานซ่อม ราคาสบายกระเป๋าที่สุด",
      badge: "✨ บริการตรวจเช็กและประเมินราคา ฟรี 100%",
      announcementEnabled: true,
      announcementText: "🎉 ฉลองเปิดระบบออนไลน์: ตรวจเช็กฟรี 0.- | ติดฟิล์มกระจก 29.- | ปรึกษาช่างฟรี 24 ชม.",
      phone: "082-999-9999",
      lineId: "@fixme",
      googleMapsUrl: "https://maps.google.com/?q=FixMe",
      showLiveTracking: true,
      showHardwareScanner: true,
      showServicesBento: true,
      showInspectionBench: true,
      showPriceEstimator: true,
      showBeforeAfterSlider: true,
      showCustomerReviews: true,
      showLocationSection: true,
      showFaqSection: true,
      showMobileQuickBar: true,
      customPricingRates: JSON.stringify(customPricingRates),
      customFaqs: JSON.stringify(customFaqs),
      customBeforeAfterCases: JSON.stringify(customBeforeAfterCases),
      footerSocialLinks: footerSocialLinks,
      customSections: customSections,
    },
  });

  console.log("StorefrontConfig successfully created/upserted for:", tenant.slug);
  console.log({
    id: storefrontConfig.id,
    tenantId: storefrontConfig.tenantId,
    themeColor: storefrontConfig.themeColor,
    fontFamily: storefrontConfig.fontFamily,
    heroLayout: storefrontConfig.heroLayout,
    headline: storefrontConfig.headline,
    subheadline: storefrontConfig.subheadline,
    badge: storefrontConfig.badge,
    announcementText: storefrontConfig.announcementText,
    phone: storefrontConfig.phone,
    lineId: storefrontConfig.lineId,
    pricingCount: customPricingRates.length,
    faqsCount: customFaqs.length,
    casesCount: customBeforeAfterCases.length,
    reviewsCount: customerReviews.length,
  });

  // 10. Also mirror to fixme-service if tenant exists
  const fixmeServiceTenant = await prisma.tenant.findUnique({ where: { slug: 'fixme-service' } });
  if (fixmeServiceTenant) {
    await prisma.storefrontConfig.upsert({
      where: { tenantId: fixmeServiceTenant.id },
      update: {
        themeColor: "blue",
        fontFamily: "anuphan",
        heroLayout: "split",
        headline: "FixMe ซ่อมมือถือ ด่วน รอรับได้เลย",
        subheadline: "ตรวจเช็กอาการฟรี 0 บาท! ช่างมือโปร อะไหล่แท้ รับประกันงานซ่อม ราคาสบายกระเป๋าที่สุด",
        badge: "✨ บริการตรวจเช็กและประเมินราคา ฟรี 100%",
        announcementEnabled: true,
        announcementText: "🎉 ฉลองเปิดระบบออนไลน์: ตรวจเช็กฟรี 0.- | ติดฟิล์มกระจก 29.- | ปรึกษาช่างฟรี 24 ชม.",
        phone: "082-999-9999",
        lineId: "@fixme",
        googleMapsUrl: "https://maps.google.com/?q=FixMe",
        showLiveTracking: true,
        showHardwareScanner: true,
        showServicesBento: true,
        showInspectionBench: true,
        showPriceEstimator: true,
        showBeforeAfterSlider: true,
        showCustomerReviews: true,
        showLocationSection: true,
        showFaqSection: true,
        showMobileQuickBar: true,
        customPricingRates: JSON.stringify(customPricingRates),
        customFaqs: JSON.stringify(customFaqs),
        customBeforeAfterCases: JSON.stringify(customBeforeAfterCases),
        footerSocialLinks: footerSocialLinks,
        customSections: customSections,
      },
      create: {
        tenantId: fixmeServiceTenant.id,
        themeColor: "blue",
        fontFamily: "anuphan",
        heroLayout: "split",
        headline: "FixMe ซ่อมมือถือ ด่วน รอรับได้เลย",
        subheadline: "ตรวจเช็กอาการฟรี 0 บาท! ช่างมือโปร อะไหล่แท้ รับประกันงานซ่อม ราคาสบายกระเป๋าที่สุด",
        badge: "✨ บริการตรวจเช็กและประเมินราคา ฟรี 100%",
        announcementEnabled: true,
        announcementText: "🎉 ฉลองเปิดระบบออนไลน์: ตรวจเช็กฟรี 0.- | ติดฟิล์มกระจก 29.- | ปรึกษาช่างฟรี 24 ชม.",
        phone: "082-999-9999",
        lineId: "@fixme",
        googleMapsUrl: "https://maps.google.com/?q=FixMe",
        showLiveTracking: true,
        showHardwareScanner: true,
        showServicesBento: true,
        showInspectionBench: true,
        showPriceEstimator: true,
        showBeforeAfterSlider: true,
        showCustomerReviews: true,
        showLocationSection: true,
        showFaqSection: true,
        showMobileQuickBar: true,
        customPricingRates: JSON.stringify(customPricingRates),
        customFaqs: JSON.stringify(customFaqs),
        customBeforeAfterCases: JSON.stringify(customBeforeAfterCases),
        footerSocialLinks: footerSocialLinks,
        customSections: customSections,
      },
    });
    console.log("StorefrontConfig also updated for alias tenant: fixme-service");
  }

  await prisma.$disconnect();
  console.log("All operations completed successfully.");
}

seedFixMeStorefront().catch((err) => {
  console.error("Error seeding storefront config:", err);
  process.exit(1);
});
