const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const tenant = await prisma.tenant.findFirst({
    where: {
      slug: 'fixme',
    },
    include: {
      storefrontConfig: true,
      branches: true,
    },
  });

  if (!tenant) {
    console.error("FAIL: Tenant 'fixme' not found in database!");
    process.exit(1);
  }

  console.log("PASS: Found Tenant 'fixme':", {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: tenant.logoUrl,
  });

  const cfg = tenant.storefrontConfig;
  if (!cfg) {
    console.error("FAIL: StorefrontConfig is null!");
    process.exit(1);
  }

  console.log("PASS: StorefrontConfig:", {
    themeColor: cfg.themeColor,
    fontFamily: cfg.fontFamily,
    heroLayout: cfg.heroLayout,
    headline: cfg.headline,
    subheadline: cfg.subheadline,
    badge: cfg.badge,
    announcementText: cfg.announcementText,
    announcementEnabled: cfg.announcementEnabled,
    phone: cfg.phone,
    lineId: cfg.lineId,
    googleMapsUrl: cfg.googleMapsUrl,
  });

  const pricing = JSON.parse(cfg.customPricingRates || "[]");
  console.log("PASS: Pricing Rates count:", pricing.length);
  pricing.forEach((p, idx) => console.log(`  [${idx + 1}] ${p.name} - ${p.basePrice} THB (${p.badge})`));

  const faqs = JSON.parse(cfg.customFaqs || "[]");
  console.log("PASS: FAQs count:", faqs.length);

  const cases = JSON.parse(cfg.customBeforeAfterCases || "[]");
  console.log("PASS: Before/After Cases count:", cases.length);
  cases.forEach((c, idx) => console.log(`  [${idx + 1}] ${c.device}: before=${c.beforeImg}, after=${c.afterImg}`));

  const meta = JSON.parse(cfg.footerSocialLinks || "{}");
  console.log("PASS: Customer Reviews in metadata:", meta.customerReviews?.length);

  await prisma.$disconnect();
}

verify().catch((e) => {
  console.error("Verification failed:", e);
  process.exit(1);
});
