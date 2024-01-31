import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

process.on('beforeExit', () => {
  void prisma.$disconnect()
})

export { prisma }
