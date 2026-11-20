/**
 * WordPress Multi-Menu Locations Engine (`register_nav_menus` / `wp_nav_menu`) - Round 48
 *
 * Reverse-engineers WordPress navigation menu locations:
 * Supports registering and mapping menus to theme locations:
 * - `primary`: Header main navigation
 * - `footer`: Footer navigation links
 * - `mobile`: Mobile drawer menu
 * - `sidebar`: Right sidebar widget menu
 */

import { NavigationMenuItem } from "../storefrontTheme";

export type MenuLocation = "primary" | "footer" | "mobile" | "sidebar" | string;

export interface MenuLocationDefinition {
  location: string;
  name: string;
  description: string;
}

export interface NavMenuAssignment {
  location: string;
  items: NavigationMenuItem[];
  tenantId: string;
  updatedAt: number;
}

// Default WordPress Theme Menu Locations
export const DEFAULT_MENU_LOCATIONS: MenuLocationDefinition[] = [
  {
    location: "primary",
    name: "เมนูหลัก (Primary Menu)",
    description: "แถบนำทางหลักส่วนบนสุดของเว็บไซต์ แสดงผลบน Desktop Header",
  },
  {
    location: "footer",
    name: "เมนูส่วนท้าย (Footer Menu)",
    description: "รายการลิงก์ในส่วนล่างสุดของเว็บไซต์สำหรับข้อมูลร้านและนโยบาย",
  },
  {
    location: "mobile",
    name: "เมนูมือถือ (Mobile Menu)",
    description: "เมนูลิ้นชักสำหรับสมาร์ตโฟนและแท็บเล็ตหน้าจอสัมผัส",
  },
  {
    location: "sidebar",
    name: "เมนูด้านข้าง (Sidebar Menu)",
    description: "เมนูเสริมสำหรับเทมเพลตหน้าแบบ Sidebar-Right",
  },
];

// In-memory registries
const registeredMenuLocations = new Map<string, MenuLocationDefinition>();
// Key: `${tenantId}:${location}`
const tenantMenuAssignments = new Map<string, NavMenuAssignment>();

/**
 * Initializes default WordPress menu locations
 */
function initDefaultMenuLocations(): void {
  if (registeredMenuLocations.size === 0) {
    for (const loc of DEFAULT_MENU_LOCATIONS) {
      registeredMenuLocations.set(loc.location, { ...loc });
    }
  }
}

// Auto-initialize
initDefaultMenuLocations();

/**
 * Registers multiple navigation menu locations (WordPress `register_nav_menus`)
 *
 * @param locations Key-value record of locationSlug -> description/name
 */
export function register_nav_menus(locations: Record<string, string>): void {
  initDefaultMenuLocations();
  for (const [locationKey, description] of Object.entries(locations)) {
    if (!locationKey || typeof locationKey !== "string") continue;
    const cleanKey = locationKey.trim().toLowerCase();
    registeredMenuLocations.set(cleanKey, {
      location: cleanKey,
      name: description || cleanKey,
      description: description || cleanKey,
    });
  }
}

/**
 * Retrieves all registered menu locations in the system
 */
export function get_registered_nav_menus(): MenuLocationDefinition[] {
  initDefaultMenuLocations();
  return Array.from(registeredMenuLocations.values());
}

/**
 * Storage key helper for tenant-isolated location assignments
 */
function getLocationKey(tenantId: string, location: string): string {
  const cleanTenant = String(tenantId || "default").trim().toLowerCase();
  const cleanLoc = String(location || "primary").trim().toLowerCase();
  return `${cleanTenant}:${cleanLoc}`;
}

/**
 * Assigns an array of navigation items to a menu location for a specific tenant
 */
export function set_nav_menu_location(
  location: string,
  items: NavigationMenuItem[],
  tenantId = "default"
): NavMenuAssignment {
  initDefaultMenuLocations();
  const cleanLoc = String(location || "primary").trim().toLowerCase();
  const safeItems = Array.isArray(items) ? items : [];

  const assignment: NavMenuAssignment = {
    location: cleanLoc,
    items: safeItems,
    tenantId: String(tenantId).trim().toLowerCase(),
    updatedAt: Date.now(),
  };

  const key = getLocationKey(tenantId, cleanLoc);
  tenantMenuAssignments.set(key, assignment);
  return assignment;
}

/**
 * Checks whether a tenant has an active menu assigned to a specific location (WordPress `has_nav_menu`)
 */
export function has_nav_menu(location: string, tenantId = "default"): boolean {
  const key = getLocationKey(tenantId, location);
  const assignment = tenantMenuAssignments.get(key);
  return Boolean(assignment && assignment.items.length > 0);
}

/**
 * Retrieves navigation menu items assigned to a location with optional fallback
 */
export function get_nav_menu_by_location(
  location: string,
  tenantId = "default",
  fallbackItems: NavigationMenuItem[] = []
): NavigationMenuItem[] {
  const key = getLocationKey(tenantId, location);
  const assignment = tenantMenuAssignments.get(key);

  if (assignment && assignment.items.length > 0) {
    return [...assignment.items];
  }

  return [...fallbackItems];
}

/**
 * Resets menu locations and assignments to factory defaults
 */
export function reset_nav_menus(): void {
  registeredMenuLocations.clear();
  tenantMenuAssignments.clear();
  initDefaultMenuLocations();
}
