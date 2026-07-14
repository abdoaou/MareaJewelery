import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { api, type Review } from '../services/api'
import { useAuth } from '../context/AuthContext'

interface ProductReviewsProps {
  productId: string
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { t } = useTranslation()
  const { customer } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [avg, setAvg] = useState(0)
  const [count, setCount] = useState(0)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [authorName, setAuthorName] = useState(customer?.full_name || '')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    api.getReviews(productId).then((res) => {
      setReviews(res.data.reviews)
      setAvg(res.data.averageRating)
      setCount(res.data.reviewCount)
    })
  }, [productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await api.submitReview(productId, { author_name: authorName, rating, comment })
    setSubmitted(true)
    const res = await api.getReviews(productId)
    setReviews(res.data.reviews)
    setAvg(res.data.averageRating)
    setCount(res.data.reviewCount)
  }

  return (
    <section className="py-16">
      <h3 className="font-serif text-2xl text-marea-cream">{t('reviews.title')}</h3>
      {count > 0 && (
        <div className="mt-2 flex items-center gap-2 text-marea-gold">
          <Star size={16} className="fill-marea-gold" />
          <span>{avg}</span>
          <span className="text-sm text-marea-muted">({count})</span>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {reviews.length === 0 && (
          <p className="text-sm text-marea-muted">{t('reviews.noReviews')}</p>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-marea-border bg-marea-bg-card p-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-marea-cream">{r.author_name}</span>
              <span className="text-marea-gold">{'★'.repeat(r.rating)}</span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-marea-muted">{r.comment}</p>}
          </div>
        ))}
      </div>

      {!submitted && (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-marea-border bg-marea-bg-card p-6">
          <h4 className="font-medium text-marea-cream">{t('reviews.submit')}</h4>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder={t('auth.fullName')}
            required
            className="w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 text-sm outline-none focus:border-marea-gold"
          />
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 text-sm outline-none"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} ★
              </option>
            ))}
          </select>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('reviews.comment')}
            rows={3}
            className="w-full rounded-lg border border-marea-border bg-marea-bg px-4 py-3 text-sm outline-none focus:border-marea-gold"
          />
          <button type="submit" className="btn-primary">
            {t('reviews.submitBtn')}
          </button>
        </form>
      )}
    </section>
  )
}
