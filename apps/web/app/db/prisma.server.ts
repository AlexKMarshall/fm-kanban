import { PrismaClient } from '@fm-kanban/database'

const prisma = new PrismaClient()

process.on('beforeExit', () => {
  void prisma.$disconnect()
})

export { prisma }
