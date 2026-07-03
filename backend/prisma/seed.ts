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

  // --- Course types (flexible dictionary) ----------------------------------
  const courseTypes = ['Стандарт', 'ВИП', 'Интенсив', 'Детский', 'Для рабочих'];
  for (const name of courseTypes) {
    await prisma.courseType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete:');
  // eslint-disable-next-line no-console
  console.log(`  Branches: ${branches.length}`);
  // eslint-disable-next-line no-console
  console.log(`  Founder login: ${founderEmail} / Atlas12345!`);
  // eslint-disable-next-line no-console
  console.log(`  Course types: ${courseTypes.join(', ')}`);
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
