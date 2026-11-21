const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function setupFixMe() {
  const passwordHash = await bcrypt.hash('P@ssw0rd123!', 12);

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

  // 3. Remove old 'admin' user from FixMe tenants
  await prisma.user.deleteMany({
    where: {
      tenantId: { in: [tenant.id, fixmeService.id] },
      username: 'admin',
    }
  });

  // 4. Create/update 'amirulhak' user for 'fixme' and 'fixme-service'
  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'amirulhak' } },
    update: { password: passwordHash, isActive: true, role: 'ADMIN' },
    create: {
      tenantId: tenant.id,
      name: 'Amirulhak (Admin)',
      username: 'amirulhak',
      password: passwordHash,
      email: 'amirulhak@fixme.co.th',
      role: 'ADMIN',
      branchId: branch.id,
      isActive: true,
    }
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: fixmeService.id, username: 'amirulhak' } },
    update: { password: passwordHash, isActive: true, role: 'ADMIN' },
    create: {
      tenantId: fixmeService.id,
      name: 'Amirulhak (Admin)',
      username: 'amirulhak',
      password: passwordHash,
      email: 'amirulhak@fixme-service.com',
      role: 'ADMIN',
      branchId: branchService.id,
      isActive: true,
    }
  });

  // 5. Create/update 'fixme_admin' user for 'fixme' and 'fixme-service'
  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: tenant.id, username: 'fixme_admin' } },
    update: { password: passwordHash, isActive: true, role: 'ADMIN' },
    create: {
      tenantId: tenant.id,
      name: 'FixMe Administrator',
      username: 'fixme_admin',
      password: passwordHash,
      email: 'admin@fixme.co.th',
      role: 'ADMIN',
      branchId: branch.id,
      isActive: true,
    }
  });

  await prisma.user.upsert({
    where: { tenantId_username: { tenantId: fixmeService.id, username: 'fixme_admin' } },
    update: { password: passwordHash, isActive: true, role: 'ADMIN' },
    create: {
      tenantId: fixmeService.id,
      name: 'FixMe Administrator',
      username: 'fixme_admin',
      password: passwordHash,
      email: 'admin@fixme-service.com',
      role: 'ADMIN',
      branchId: branchService.id,
      isActive: true,
    }
  });

  console.log('SUCCESS: FixMe tenant and users updated successfully!');
  console.log('Removed user: admin');
  console.log('Active Users:');
  console.log('1. username: amirulhak | password: P@ssw0rd123!');
  console.log('2. username: fixme_admin | password: P@ssw0rd123!');
}

setupFixMe()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
