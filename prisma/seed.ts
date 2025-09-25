import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    // Verificar se já existe um usuário admin
    const adminExists = await prisma.user.findFirst({
      where: { role: UserRole.ADMIN },
    });

    if (!adminExists) {
      // Criar hash da senha
      const passwordHash = await bcrypt.hash('admin123', 10);

      // Criar usuário admin
      const admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: 'admin@system.com',
          passwordHash,
          role: UserRole.ADMIN,
        },
      });

      console.log('Usuário admin criado:', admin.email);
    } else {
      console.log('Usuário admin já existe');
    }
  } catch (error) {
    console.error('Erro ao criar usuário admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();