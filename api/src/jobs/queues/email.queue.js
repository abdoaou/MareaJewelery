import { Queue } from 'bullmq'
import { env } from '../../config/env.js'
import { logger } from '../../shared/utils/logger.js'
import { sendEmail } from '../../shared/services/email.service.js'

const connection = env.redis.enabled ? { url: env.redis.url } : undefined

function createQueue(name) {
  if (!connection) {
    return {
      add: async (jobName, data) => {
        logger.info(`[EmailQueue stub] ${name}:${jobName}`, { to: data?.to })
        if (data?.to && data?.subject) {
          await sendEmail(data)
        }
      },
    }
  }
  return new Queue(name, { connection })
}

export const emailQueue = createQueue('email')
export const notificationQueue = createQueue('notifications')
export const reportQueue = createQueue('reports')
