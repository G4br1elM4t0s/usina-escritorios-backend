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

    // Criar disponibilidades de exemplo para o office
    const officeId = 'cmfywwan10000tixfggqfutzh';
    
    // Verificar se o office existe
    const office = await prisma.office.findUnique({
      where: { id: officeId }
    });

    if (office) {
      // Verificar se já existem disponibilidades
      const existingAvailability = await prisma.officeAvailability.findFirst({
        where: { officeId }
      });

      if (!existingAvailability) {
        // Criar disponibilidade para hoje e próximos 30 dias
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 30);

        await prisma.officeAvailability.create({
          data: {
            officeId,
            availableFrom: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0), // 8:00 AM
            availableTo: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 18, 0, 0), // 6:00 PM
          }
        });

        console.log('Disponibilidade criada para o office:', officeId);
      } else {
        console.log('Disponibilidade já existe para o office:', officeId);
      }
    } else {
      console.log('Office não encontrado:', officeId);
    }
  } catch (error) {
    console.error('Erro no seed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();