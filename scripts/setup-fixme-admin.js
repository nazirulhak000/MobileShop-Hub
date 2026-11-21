const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupFixMe() {
  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. Create or update 'fixme' tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fixme' },
    update: { name: 'FixMe ซ่อมมือถือ', status: 'ACTIVE' },
    create: {
      id: 'tenant-fixme-hq-main',
      name: 'FixMe ซ่อมมือถือ',
      slug: 'fixme',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      maxBranches: 10,
      maxUsers: 50,
    }
  });

  // Also create 'fixme-service' alias slug tenant just in case
  const fixmeService = await prisma.tenant.upsert({
    where: { slug: 'fixme-service' },
    update: { name: 'FixMe Service Center', status: 'ACTIVE' },
    create: {
      id: 'tenant-fixme-service-hq',
      name: 'FixMe Service Center',
      slug: 'fixme-service',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      maxBranches: 10,
      maxUsers: 50,
    }
  });

  // 2. Create HQ branch for 'fixme'
  let branch = await prisma.branch.findFirst({ where: { tenantId: tenant.id } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        tenantId: tenant.id,
        name: 'FixMe HQ (สำนักงานใหญ่)',
        code: 'HQ001',
        address: 'กรุงเทพมหานคร',
        phone: '02-123-4567',
        taxId: '0105561234567',
      }
    });
  }

  // Branch for 'fixme-service'
  let branchService = await prisma.branch.findFirst({ where: { tenantId: fixmeService.id } });
  if (!branchService) {
    branchService = await prisma.branch.create({
      data: {
        tenantId: fixmeService.id,
        name: 'FixMe Service Branch',
        code: '00000',
        address: 'กรุงเทพมหานคร',
        phone: '02-123-4567',
        taxId: '0105561234999',
      }
    });
  }

  // 3. Create 'admin' user for 'fixme'
  const user = await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'admin' } },
    update: { password: passwordHash, isActive: true },
    create: {
      tenantId: tenant.id,
      name: 'FixMe Administrator',
      username: 'admin',
      password: passwordHash,
      email: 'admin@fixme.co.th',
      role: 'ADMIN',
      branchId: branch.id,
      isActive: true,
    }
  });

  // Create 'admin' user for 'fixme-service'
  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: fixmeService.id, username: 'admin' } },
    update: { password: passwordHash, isActive: true },
    create: {
      tenantId: fixmeService.id,
      name: 'FixMe Admin',
      username: 'admin',
      password: passwordHash,
      email: 'admin@fixme-service.com',
      role: 'ADMIN',
      branchId: branchService.id,
      isActive: true,
    }
  });

  console.log('SUCCESS: FixMe tenant and users created successfully!');
  console.log('Tenant Slugs: fixme, fixme-service');
  console.log('Username: admin');
  console.log('Password: password123');
}

setupFixMe()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
