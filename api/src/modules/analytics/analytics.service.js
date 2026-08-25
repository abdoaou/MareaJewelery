import prisma from '../../config/prisma.js'
import { cacheDel } from '../../config/redis.js'

function dayStart(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysAgo(n) {
  return new Date(dayStart().getTime() - n * 86400000)
}

const BOT_RE =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|preview|lighthouse|headless|curl|wget/i

export const analyticsService = {
  async recordVisit({ sessionId, path = '/', userAgent = '' }) {
    if (!sessionId || sessionId.length < 8) return { recorded: false }
    if (userAgent && BOT_RE.test(userAgent)) return { recorded: false }

    const today = dayStart()
    let existing = null
    try {
      existing = await prisma.siteVisit.findFirst({
        where: { sessionId, visitedAt: { gte: today } },
        select: { id: true },
      })
    } catch {
      return { recorded: false }
    }
    if (existing) return { recorded: false }

    try {
      await prisma.siteVisit.create({
        data: {
          sessionId,
          path: String(path).slice(0, 500) || '/',
        },
      })
    } catch {
      return { recorded: false }
    }

    void cacheDel('admin:dashboard:stats').catch(() => {})
    return { recorded: true }
  },

  async visitorCounts() {
    try {
      const today = dayStart()
      const last7 = daysAgo(7)
      const last30 = daysAgo(30)

      const rows = await prisma.$queryRaw`
        SELECT
          COUNT(DISTINCT session_id) FILTER (WHERE visited_at >= ${today})::int AS today,
          COUNT(DISTINCT session_id) FILTER (WHERE visited_at >= ${last7})::int AS this_week,
          COUNT(DISTINCT session_id) FILTER (WHERE visited_at >= ${last30})::int AS this_month
        FROM site_visits
      `

      const v = rows[0] || {}
      return {
        today: Number(v.today || 0),
        thisWeek: Number(v.this_week || 0),
        thisMonth: Number(v.this_month || 0),
      }
    } catch {
      return { today: 0, thisWeek: 0, thisMonth: 0 }
    }
  },
}
