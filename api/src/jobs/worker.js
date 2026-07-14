import { Worker } from 'bullmq'
import { env } from '../../config/env.js'
import { logger } from '../../shared/utils/logger.js'
import { sendEmail } from '../../shared/services/email.service.js'

if (!env.redis.enabled) {
  logger.info('Worker skipped — Redis not enabled')
} else {
  const connection = { url: env.redis.url }

  new Worker(
    'email',
    async (job) => {
      const { to, subject, html, text } = job.data
      await sendEmail({ to, subject, html, text })
    },
    { connection },
  )

  logger.info('Email worker started')
}
