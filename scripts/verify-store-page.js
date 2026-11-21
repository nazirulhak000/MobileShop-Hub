const fs = require('fs');
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

async function main() {
  console.log("=== Verifying FixMe Storefront Page & Assets ===");

  // 1. Check all image assets
  const expectedImages = [
    'logo.jpg',
    'storefront.jpg',
    'hero-repair.jpg',
    'technician-workbench.jpg',
    'diagnostic-checkup.jpg',
    'screen-repair.jpg',
    'screen-repair-before-after.jpg',
    'battery-repair.jpg',
    'charging-port-repair.jpg',
    'camera-lens-repair.jpg',
    'water-damage-repair.jpg',
    'badge-free-inspection.svg',
  ];

  console.log("\n1. Checking Images in public/images/fixme/:");
  for (const img of expectedImages) {
    const fullPath = path.join(process.cwd(), 'public', 'images', 'fixme', img);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing image: ${img} at ${fullPath}`);
    }
    const stat = fs.statSync(fullPath);
    console.log(`  ✓ ${img} (${stat.size} bytes)`);
  }

  // 2. Check DB config
  console.log("\n2. Checking Tenant in Database:");
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'fixme' },
    include: {
      storefrontConfig: true,
      branches: true,
    },
  });

  if (!tenant) throw new Error("Tenant 'fixme' not found in database!");
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.id}), slug: ${tenant.slug}`);
  console.log(`  ✓ Logo URL: ${tenant.logoUrl}`);
  
  const config = tenant.storefrontConfig;
  if (!config) throw new Error("StorefrontConfig not found for FixMe!");
  console.log(`  ✓ Theme Color: ${config.themeColor}`);
  console.log(`  ✓ Hero Layout: ${config.heroLayout}`);
  console.log(`  ✓ Badge: ${config.badge}`);
  console.log(`  ✓ Announcement: ${config.announcementText}`);
  console.log(`  ✓ Phone: ${config.phone}`);
  console.log(`  ✓ Line ID: ${config.lineId}`);

  // 3. Check Pricing Rates
  console.log("\n3. Checking Pricing Rates:");
  const rates = JSON.parse(config.customPricingRates || '[]');
  if (rates.length === 0) throw new Error("customPricingRates is empty!");
  const freeRates = rates.filter(r => r.basePrice === 0 || r.name.includes('ฟรี') || r.badge.includes('ฟรี'));
  console.log(`  ✓ Total Pricing Tiers: ${rates.length}`);
  console.log(`  ✓ Free (0.-) Tiers count: ${freeRates.length}`);
  freeRates.forEach(r => console.log(`     - [FREE 0.-] ${r.name} (${r.badge})`));

  const budgetRates = rates.filter(r => r.basePrice > 0 && r.basePrice <= 300);
  console.log(`  ✓ Budget (<=300.-) Tiers count: ${budgetRates.length}`);
  budgetRates.forEach(r => console.log(`     - [${r.basePrice}.-] ${r.name} (${r.badge})`));

  // 4. Check Before / After Cases
  console.log("\n4. Checking Before/After Cases:");
  const cases = JSON.parse(config.customBeforeAfterCases || '[]');
  console.log(`  ✓ Cases count: ${cases.length}`);
  cases.forEach(c => console.log(`     - ${c.device}: before=${c.beforeImg}, after=${c.afterImg}`));

  // 5. Check Reviews
  console.log("\n5. Checking Customer Reviews:");
  let reviews = [];
  if (config.customerReviews) {
    try { reviews = typeof config.customerReviews === 'string' ? JSON.parse(config.customerReviews) : config.customerReviews; } catch {}
  }
  if ((!reviews || reviews.length === 0) && config.footerSocialLinks) {
    try {
      const parsed = JSON.parse(config.footerSocialLinks);
      if (Array.isArray(parsed.customerReviews)) reviews = parsed.customerReviews;
    } catch {}
  }
  console.log(`  ✓ Customer Reviews count: ${reviews.length}`);
  reviews.forEach(r => console.log(`     - 5★ by ${r.name} (${r.device}): "${r.comment.slice(0, 50)}..."`));

  console.log("\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
}).finally(() => prisma.$disconnect());
