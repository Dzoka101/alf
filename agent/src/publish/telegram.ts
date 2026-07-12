import { readFileSync } from 'node:fs'
import path from 'node:path'
import { AGENT_ROOT, env } from '../config.js'
import type { Post, PublishResult } from '../types.js'

type TgResponse = {
  ok: boolean
  result?: { message_id: number }[] | { message_id: number }
  description?: string
}

/** Публикация в Telegram-канал: файлы грузятся напрямую, публичный URL не нужен */
export async function publishToTelegram(post: Post): Promise<PublishResult> {
  const platform = 'telegram'
  if (!env.telegramToken || !env.telegramChat) {
    return { platform, ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID не заданы' }
  }

  try {
    const api = `https://api.telegram.org/bot${env.telegramToken}`
    const form = new FormData()
    form.set('chat_id', env.telegramChat)

    let json: TgResponse
    if (post.media.length > 1) {
      const media = post.media.map((m, i) => ({
        type: 'photo',
        media: `attach://photo${i}`,
        // подпись — только на первом элементе альбома
        ...(i === 0 ? { caption: post.caption } : {}),
      }))
      form.set('media', JSON.stringify(media))
      post.media.forEach((m, i) => {
        const bytes = readFileSync(path.join(AGENT_ROOT, m))
        form.set(`photo${i}`, new Blob([bytes], { type: 'image/png' }), `photo${i}.png`)
      })
      const res = await fetch(`${api}/sendMediaGroup`, { method: 'POST', body: form })
      json = (await res.json()) as TgResponse
    } else {
      const bytes = readFileSync(path.join(AGENT_ROOT, post.media[0]))
      form.set('photo', new Blob([bytes], { type: 'image/png' }), 'photo.png')
      form.set('caption', post.caption)
      const res = await fetch(`${api}/sendPhoto`, { method: 'POST', body: form })
      json = (await res.json()) as TgResponse
    }

    if (!json.ok) throw new Error(json.description ?? 'Telegram API error')
    const first = Array.isArray(json.result) ? json.result[0] : json.result
    const id = String(first?.message_id ?? '')
    const chatSlug = env.telegramChat.replace(/^@/, '')
    return { platform, ok: true, id, url: `https://t.me/${chatSlug}/${id}` }
  } catch (e) {
    return { platform, ok: false, error: (e as Error).message }
  }
}
