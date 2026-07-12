import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import type { BrandConfig } from './types.js'

const here = path.dirname(fileURLToPath(import.meta.url))

/** Корень модуля agent/ */
export const AGENT_ROOT = path.resolve(here, '..')
export const CONTENT_DIR = path.join(AGENT_ROOT, 'content')
export const QUEUE_DIR = path.join(CONTENT_DIR, 'queue')
export const PUBLISHED_DIR = path.join(CONTENT_DIR, 'published')
export const MEDIA_DIR = path.join(CONTENT_DIR, 'media')
export const ANALYTICS_DIR = path.join(CONTENT_DIR, 'analytics')

export function loadBrand(): BrandConfig {
  const raw = readFileSync(path.join(AGENT_ROOT, 'config', 'brand.json'), 'utf-8')
  return JSON.parse(raw) as BrandConfig
}

export const env = {
  anthropicKey: process.env.ANTHROPIC_API_KEY,
  // Instagram Graph API (бизнес/креатор-аккаунт, привязанный к странице Facebook)
  igToken: process.env.IG_ACCESS_TOKEN,
  igUserId: process.env.IG_USER_ID,
  // Базовый публичный URL, по которому доступны файлы из agent/content/media
  // (Instagram скачивает картинки по URL). Напр. https://raw.githubusercontent.com/<owner>/<repo>/main
  mediaBaseUrl: process.env.MEDIA_BASE_URL,
  telegramToken: process.env.TELEGRAM_BOT_TOKEN,
  telegramChat: process.env.TELEGRAM_CHAT_ID, // @имя_канала или числовой id
  vkToken: process.env.VK_ACCESS_TOKEN,
  vkGroupId: process.env.VK_GROUP_ID, // положительный id сообщества
}
