import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { QUEUE_DIR, PUBLISHED_DIR } from './config.js'
import type { Post } from './types.js'

function ensureDirs() {
  mkdirSync(QUEUE_DIR, { recursive: true })
  mkdirSync(PUBLISHED_DIR, { recursive: true })
}

export function listQueue(): Post[] {
  ensureDirs()
  return readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(QUEUE_DIR, f), 'utf-8')) as Post)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function listPublished(): Post[] {
  ensureDirs()
  return readdirSync(PUBLISHED_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(path.join(PUBLISHED_DIR, f), 'utf-8')) as Post)
    .sort((a, b) => (a.publishedAt ?? '').localeCompare(b.publishedAt ?? ''))
}

export function savePost(post: Post) {
  ensureDirs()
  const dir = post.status === 'published' ? PUBLISHED_DIR : QUEUE_DIR
  writeFileSync(path.join(dir, `${post.id}.json`), JSON.stringify(post, null, 2))
}

export function markPublished(post: Post) {
  ensureDirs()
  const queued = path.join(QUEUE_DIR, `${post.id}.json`)
  post.status = 'published'
  post.publishedAt = new Date().toISOString()
  writeFileSync(path.join(PUBLISHED_DIR, `${post.id}.json`), JSON.stringify(post, null, 2))
  if (existsSync(queued)) rmSync(queued)
}

export function nextPostId(): string {
  const stamp = new Date().toISOString().slice(0, 10).replaceAll('-', '')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${stamp}-${rand}`
}
