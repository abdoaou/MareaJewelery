import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { randomUUID } from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { env } from '../../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const localUploadDir = path.join(__dirname, '../../../uploads')

const r2Configured = Boolean(
  env.r2.accountId &&
    env.r2.accessKeyId &&
    env.r2.secretAccessKey &&
    env.r2.bucket &&
    env.r2.publicUrl,
)

let client = null

function getClient() {
  if (!r2Configured) return null
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${env.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2.accessKeyId,
        secretAccessKey: env.r2.secretAccessKey,
      },
    })
  }
  return client
}

function buildKey(originalName, folder = 'products') {
  const ext = path.extname(originalName || '').toLowerCase() || '.jpg'
  return `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}${ext}`
}

function publicUrl(key) {
  return `${env.r2.publicUrl.replace(/\/$/, '')}/${key}`
}

/**
 * Upload a multer file (memory or disk) to Cloudflare R2, or local /uploads as fallback.
 * @param {{ buffer?: Buffer, path?: string, originalname: string, mimetype: string, filename?: string }} file
 * @param {{ folder?: string }} [options]
 */
export async function uploadImage(file, options = {}) {
  const folder = options.folder || 'products'
  const key = buildKey(file.originalname, folder)
  const body = file.buffer || (file.path ? fs.readFileSync(file.path) : null)

  if (!body) throw new Error('No file data to upload')

  const s3 = getClient()
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.r2.bucket,
        Key: key,
        Body: body,
        ContentType: file.mimetype || 'application/octet-stream',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    )

    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path)
    }

    return {
      url: publicUrl(key),
      key,
      filename: path.basename(key),
      originalName: file.originalname,
      storage: 'r2',
    }
  }

  // Local fallback when R2 is not configured
  if (!fs.existsSync(localUploadDir)) fs.mkdirSync(localUploadDir, { recursive: true })
  const filename = path.basename(key)
  const dest = path.join(localUploadDir, filename)
  fs.writeFileSync(dest, body)

  return {
    url: `/uploads/${filename}`,
    key: filename,
    filename,
    originalName: file.originalname,
    storage: 'local',
  }
}

export async function uploadImages(files, options = {}) {
  return Promise.all((files || []).map((f) => uploadImage(f, options)))
}

/** Delete an object from R2 by key or full public URL */
export async function deleteImage(keyOrUrl) {
  const s3 = getClient()
  if (!s3) return false

  let key = keyOrUrl
  const base = env.r2.publicUrl.replace(/\/$/, '')
  if (keyOrUrl.startsWith(base)) {
    key = keyOrUrl.slice(base.length + 1)
  }

  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
    }),
  )
  return true
}

/** Delete a stored image from Cloudflare R2 or local /uploads */
export async function deleteStoredImage(url) {
  if (!url) return false

  const base = env.r2.publicUrl.replace(/\/$/, '')
  if (r2Configured && (url.startsWith(base) || url.includes('.r2.dev/'))) {
    await deleteImage(url)
    return true
  }

  if (url.startsWith('/uploads/')) {
    const filename = path.basename(url)
    const filePath = path.join(localUploadDir, filename)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
  }

  return false
}

export function isR2Enabled() {
  return r2Configured
}
