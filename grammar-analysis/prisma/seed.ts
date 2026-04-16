import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding the database...');

  // Ensure Admin exists
  const adminPassword = await bcrypt.hash('admin', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@system.com' },
    update: {},
    create: {
      email: 'admin@system.com',
      password_hash: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log(`Admin created/exists: ${admin.email}`);

  // Ensure Test Teacher exists
  const teacherPassword = await bcrypt.hash('teacher', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@system.com' },
    update: {},
    create: {
      email: 'teacher@system.com',
      password_hash: teacherPassword,
      role: 'TEACHER',
    },
  });
  console.log(`Teacher created/exists: ${teacher.email}`);

  // Create one Test Class if it doesn't already have one with same name for this teacher
  // For simplicity, we just check if it exists or use first class.
  let testClass = await prisma.class.findFirst({
    where: { name: 'Test Class 101' },
  });

  if (!testClass) {
    testClass = await prisma.class.create({
      data: {
        name: 'Test Class 101',
      },
    });
    console.log(`Class created: ${testClass.name}`);
  } else {
    console.log(`Class already exists: ${testClass.name}`);
  }

  // Link Teacher to Class
  const teacherClassLink = await prisma.teacherClass.upsert({
    where: {
      teacher_id_class_id: {
        teacher_id: teacher.id,
        class_id: testClass.id,
      },
    },
    update: {},
    create: {
      teacher_id: teacher.id,
      class_id: testClass.id,
    },
  });
  console.log(`Teacher ${teacher.email} linked to class ${testClass.name}`);

  console.log('Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
