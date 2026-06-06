import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { AdminScope, PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash('password');

  const school = await prisma.school.upsert({
    where: { code: 'YDIAH' },
    update: {},
    create: { name: 'Yayasan Darul Itqon Al Hakim', code: 'YDIAH' },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@ydiah.com' },
    update: {},
    create: {
      schoolId: school.id,
      role: Role.ADMIN,
      email: 'admin@ydiah.com',
      passwordHash,
      mustChangePassword: false,
    },
  });

  await prisma.admin.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      name: 'Admin Yayasan Darul Itqon Al Hakim',
      scope: AdminScope.SCHOOL,
    },
  });

  console.log('Seed selesai');
  console.log('Admin → email: admin@ydiah.com | pass: password');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
