import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { ANALYTICS_DIR, env } from './config.js'
import { listPublished } from './queue.js'

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

/** Собирает статистику по опубликованным постам и пишет сводку для генератора */
export async function collectAnalytics(): Promise<string> {
  mkdirSync(ANALYTICS_DIR, { recursive: true })
  const published = listPublished()
  const stats: MediaStats[] = []

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
