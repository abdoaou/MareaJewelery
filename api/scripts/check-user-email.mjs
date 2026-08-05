import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import prisma from '../src/config/prisma.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const email = String(process.argv[2] || '').trim().toLowerCase()
if (!email) {
  console.error('Usage: node scripts/check-user-email.mjs user@example.com')
  process.exit(1)
}

const user = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, role: true, status: true, emailVerified: true },
})

console.log(user ? `User found: ${user.email} (${user.role}, ${user.status})` : `No account for ${email}`)
await prisma.$disconnect()
