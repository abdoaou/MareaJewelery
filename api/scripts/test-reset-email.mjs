import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const { sendEmail } = await import('../src/shared/services/email.service.js')
const { wrapPasswordResetEmail } = await import('../src/shared/services/email.templates.js')

const to = process.argv[2] || 'prvtabdo70@gmail.com'
const code = '654321'

try {
  await sendEmail({
    to,
    subject: 'Reset your Marea password',
    html: wrapPasswordResetEmail({ firstName: 'Test', code }),
    text: `Your reset code is ${code}`,
  })
  console.log('OK: email send completed for', to)
} catch (err) {
  console.error('FAIL:', err.message)
  process.exit(1)
}
