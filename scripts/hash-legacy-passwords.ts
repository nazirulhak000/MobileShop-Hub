import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
const client = new PrismaClient();
// Known demo/default passwords must NOT be carried forward as valid bcrypt hashes: anyone who read the
// old seed could log in. Those accounts are disabled for password login instead (an unusable, non-bcrypt
// value that the login route always rejects) and must be reset by an administrator.
const KNOWN_DEFAULTS = new Set(["password123", "password", "12345678", "123456789", "admin123", "admin"]);
async function main() {
  const users = await client.user.findMany({ select: { id: true, tenantId: true, username: true, password: true } });
  let changed = 0;
  const forcedReset: string[] = [];
  for (const user of users) {
    if (user.password.startsWith("$2")) continue;
    if (KNOWN_DEFAULTS.has(user.password.trim().toLowerCase())) {
      await client.user.update({ where: { id: user.id }, data: { password: `!reset-required:${randomBytes(16).toString("hex")}` } });
      forcedReset.push(`${user.tenantId ?? "(no tenant)"}/${user.username}`);
      continue;
    }
    if (user.password.startsWith("!reset-required:")) continue;
    await client.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(user.password, 12) } });
    changed++;
  }
  console.log(`Upgraded ${changed} legacy password hashes; no credentials logged.`);
  if (forcedReset.length) {
    console.warn(`${forcedReset.length} account(s) used a known default password and were DISABLED for login (password reset required):`);
    for (const account of forcedReset) console.warn(`  - ${account}`);
  }
}
main().finally(() => client.$disconnect());
