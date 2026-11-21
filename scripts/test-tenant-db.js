const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.tenant.count();
  console.log("Tenant count:", count);
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true, name: true } });
  console.log("Tenants:", tenants);
}

main().catch(console.error).finally(() => prisma.$disconnect());
