import { resolveTenantBySlug } from "../src/lib/storefrontTenant";
import { buildStoreMetadata } from "../src/lib/storefrontMetadata";
import { THEME_PALETTES, StorefrontThemeColor } from "../src/lib/storefrontTheme";

async function run() {
  console.log("=== Testing Storefront SSR Resolver & Theme Logic ===");
  const tenant = await resolveTenantBySlug("fixme");
  if (!tenant) {
    throw new Error("resolveTenantBySlug('fixme') returned null!");
  }
  console.log("Tenant resolved:", tenant.name, "slug:", tenant.slug);
  console.log("Storefront config themeColor:", tenant.storefrontConfig?.themeColor);
  
  const themeColor = (tenant.storefrontConfig?.themeColor as StorefrontThemeColor) || "blue";
  const theme = THEME_PALETTES[themeColor];
  console.log("Resolved Theme Palette:", theme.id, theme.label, "Primary hex:", theme.hex);

  const metadata = await buildStoreMetadata(tenant, "fixme");
  console.log("Generated SEO Metadata Title:", metadata.title);
  console.log("Generated SEO Metadata Description:", metadata.description);

  console.log("=== SSR RESOLUTION TEST PASSED ===");
}

run().catch((e) => {
  console.error("Test failed:", e);
  process.exit(1);
});
