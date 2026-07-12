import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ANALYTICS_DIR, env } from './config.js'
import { listPublished } from './queue.js'
import { loadLife, recordFollowers } from './life.js'

type MediaStats = {
  postId: string
  topic: string
  platform: string
  reach?: number
  likes?: number
  comments?: number
  saved?: number
  shares?: number
}

const GRAPH = 'https://graph.facebook.com/v21.0'

async function igInsights(mediaId: string): Promise<Partial<MediaStats>> {
  const url = `${GRAPH}/${mediaId}/insights?metric=reach,likes,comments,saved,shares&access_token=${env.igToken}`
  const res = await fetch(url)
  const json = (await res.json()) as { data?: { name: string; values: { value: number }[] }[]; error?: { message: string } }
  if (json.error) throw new Error(json.error.message)
  const out: Record<string, number> = {}
  for (const m of json.data ?? []) out[m.name] = m.values?.[0]?.value ?? 0
  return { reach: out.reach, likes: out.likes, comments: out.comments, saved: out.saved, shares: out.shares }
}

/** Число подписчиков по платформам — для счётчика цели Лео */
async function fetchFollowers(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}

  if (env.igToken && env.igUserId) {
    try {
      const res = await fetch(
        `${GRAPH}/${env.igUserId}?fields=followers_count&access_token=${env.igToken}`,
      )
      const json = (await res.json()) as { followers_count?: number; error?: { message: string } }
      if (json.followers_count !== undefined) counts.instagram = json.followers_count
    } catch { /* платформа недоступна — пропускаем */ }
  }

  if (env.telegramToken && env.telegramChat) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${env.telegramToken}/getChatMemberCount?chat_id=${encodeURIComponent(env.telegramChat)}`,
      )
      const json = (await res.json()) as { ok: boolean; result?: number }
      if (json.ok && json.result !== undefined) counts.telegram = json.result
    } catch { /* платформа недоступна — пропускаем */ }
  }

  return counts
}

/** Собирает статистику по опубликованным постам и пишет сводку для генератора */
export async function collectAnalytics(): Promise<string> {
  mkdirSync(ANALYTICS_DIR, { recursive: true })
  const published = listPublished()
  const stats: MediaStats[] = []

  // счётчик цели: подписчики + новые рубежи попадают в память Лео
  const followers = await fetchFollowers()
  if (Object.keys(followers).length > 0) {
    const milestones = recordFollowers(loadLife(), followers)
    for (const m of milestones) console.log(`  🎉 Взят рубеж: ${m} подписчиков`)
  }

  for (const post of published) {
    const igId = post.publishedTo['instagram']
    if (igId && env.igToken) {
      try {
        const s = await igInsights(igId)
        stats.push({ postId: post.id, topic: post.topic, platform: 'instagram', ...s })
      } catch (e) {
        console.warn(`  ! insights для ${post.id}: ${(e as Error).message}`)
      }
    }
  }

  writeFileSync(path.join(ANALYTICS_DIR, 'stats.json'), JSON.stringify(stats, null, 2))

  // Сводка в человекочитаемом виде — попадает в промпт генератора
  const score = (s: MediaStats) =>
    (s.saved ?? 0) * 5 + (s.shares ?? 0) * 4 + (s.comments ?? 0) * 3 + (s.likes ?? 0)
  const ranked = [...stats].sort((a, b) => score(b) - score(a))

  const lines = [
    `# Сводка по ${stats.length} публикациям (обновлено ${new Date().toISOString().slice(0, 10)})`,
    ``,
    Object.keys(followers).length > 0
      ? `Подписчики: ${Object.entries(followers).map(([p, n]) => `${p} ${n}`).join(', ')}`
      : `Подписчики: данные пока не собраны`,
    ``,
    `Топ тем по вовлечённости (сохранения x5, репосты x4, комментарии x3, лайки x1):`,
    ...ranked.slice(0, 10).map(
      (s, i) =>
        `${i + 1}. «${s.topic}» — охват ${s.reach ?? '?'}, лайки ${s.likes ?? 0}, сохранения ${s.saved ?? 0}, комментарии ${s.comments ?? 0}`,
    ),
  ]
  const summary = lines.join('\n')
  writeFileSync(path.join(ANALYTICS_DIR, 'summary.md'), summary)
  return summary
}
