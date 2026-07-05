import { PrismaClient, Role, type Branch } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // --- Branches (network of 3) --------------------------------------------
  const branchData = [
    { name: 'Atlas — Центральный', address: 'г. Душанбе, пр. Рудаки, 1' },
    { name: 'Atlas — Северный', address: 'г. Худжанд, ул. Ленина, 25' },
    { name: 'Atlas — Южный', address: 'г. Бохтар, ул. Айни, 10' },
  ];

  const branches: Branch[] = [];
  for (const b of branchData) {
    const branch = await prisma.branch.upsert({
      where: { id: `seed-branch-${b.name}` },
      update: {},
      create: { id: `seed-branch-${b.name}`, name: b.name, address: b.address },
    });
    branches.push(branch);
  }

  // --- Founder user --------------------------------------------------------
  const founderEmail = 'founder@atlas.local';
  const passwordHash = await bcrypt.hash('Atlas12345!', 12);
  await prisma.user.upsert({
    where: { email: founderEmail },
    update: {},
    create: {
      email: founderEmail,
      passwordHash,
      role: Role.FOUNDER,
      language: 'ru',
      branchId: branches[0].id,
    },
  });

  // --- Demo users for every role (same password: Atlas12345!) --------------
  const demoUsers: Array<{ email: string; role: Role }> = [
    { email: 'admin@atlas.local', role: Role.ADMIN },
    { email: 'manager@atlas.local', role: Role.SALES_MANAGER },
    { email: 'teacher@atlas.local', role: Role.TEACHER },
    { email: 'student@atlas.local', role: Role.STUDENT },
  ];
  const userIdByEmail: Record<string, string> = {};
  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        language: 'ru',
        branchId: branches[0].id,
      },
    });
    userIdByEmail[u.email] = user.id;
  }

  // Linked profiles so the teacher/student cabinets have data to resolve.
  await prisma.teacher.upsert({
    where: { userId: userIdByEmail['teacher@atlas.local'] },
    update: {},
    create: {
      userId: userIdByEmail['teacher@atlas.local'],
      branchId: branches[0].id,
      firstName: 'Демо',
      lastName: 'Учитель',
    },
  });
  await prisma.student.upsert({
    where: { userId: userIdByEmail['student@atlas.local'] },
    update: {},
    create: {
      userId: userIdByEmail['student@atlas.local'],
      branchId: branches[0].id,
      firstName: 'Демо',
      lastName: 'Студент',
    },
  });

  // --- Course types (flexible dictionary) ----------------------------------
  const courseTypes = ['Стандарт', 'ВИП', 'Интенсив', 'Детский', 'Для рабочих'];
  for (const name of courseTypes) {
    await prisma.courseType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // --- Rooms / kabinets for the first branch -------------------------------
  const roomNames = ['Кабинет 1', 'Кабинет 2', 'Кабинет 3'];
  for (const name of roomNames) {
    const id = `seed-room-${branches[0].id}-${name}`;
    await prisma.room.upsert({
      where: { id },
      update: {},
      create: { id, name, branchId: branches[0].id },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete:');
  // eslint-disable-next-line no-console
  console.log(`  Branches: ${branches.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Founder login: ${founderEmail} / Atlas12345!`);
  // eslint-disable-next-line no-console
  console.log('  Demo logins (pw Atlas12345!): admin@, manager@, teacher@, student@ atlas.local');
  // eslint-disable-next-line no-console
  console.log(`  Course types: ${courseTypes.join(', ')}`);
  // eslint-disable-next-line no-console
  console.log(`  Rooms: ${roomNames.join(', ')}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
