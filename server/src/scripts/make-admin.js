// Uso: npm run make-admin -- email@exemplo.com
import { PrismaClient } from '@prisma/client';

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error('Informe o e-mail: npm run make-admin -- email@exemplo.com');
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  console.log(`${user.email} agora é ADMIN.`);
} catch (error) {
  if (error.code === 'P2025') {
    console.error('Nenhum usuário encontrado com esse e-mail. Faça o cadastro antes.');
  } else {
    console.error(error);
  }
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
