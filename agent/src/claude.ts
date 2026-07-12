import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { ANALYTICS_DIR } from './config.js'
import { nextPostId } from './queue.js'
import type { BrandConfig, Post } from './types.js'

const SlideSchema = z.object({
  kicker: z.string().describe('Надпись над заголовком: рубрика или номер пункта, 1-3 слова, CAPS не нужен'),
  title: z.string().describe('Заголовок слайда, до 60 знаков, цепляющий'),
  body: z.string().describe('Текст слайда, 1-3 коротких абзаца через перенос строки, до 220 знаков. Для обложки — одна строка-подводка.'),
})

const PostSchema = z.object({
  topic: z.string().describe('Тема поста одной фразой'),
  caption: z.string().describe('Подпись к посту: хук в первой строке, 2-4 абзаца, CTA со ссылкой в шапке, 5 хэштегов в конце'),
  slides: z.array(SlideSchema).describe('Слайды карусели: первый — обложка, дальше содержание. Финальный CTA-слайд добавится автоматически, его писать не надо.'),
  reelScript: z.object({
    hook: z.string().describe('Первые 2 секунды видео, провокация или цифра'),
    scenes: z.array(z.object({
      voiceover: z.string().describe('Закадровый текст сцены, 1 предложение'),
      visual: z.string().describe('Что в кадре'),
    })),
    cta: z.string().describe('Призыв в конце ролика'),
  }),
})

const BatchSchema = z.object({
  posts: z.array(PostSchema),
})

function buildSystem(brand: BrandConfig): string {
  return [
    `Ты — контент-директор и автор канала «${brand.name}» (${brand.handle}).`,
    `Ниша: ${brand.niche}.`,
    `Голос: ${brand.persona}`,
    `Аудитория: ${brand.audience}.`,
    ``,
    `Контентные рубрики:`,
    ...brand.contentPillars.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `Монетизация: каждый пост мягко ведёт к действию — «${brand.monetization.primaryCta}»`,
    `Лид-магнит для части постов: ${brand.monetization.leadMagnet}`,
    ``,
    `Правила контента:`,
    `- Пиши на русском. Конкретика и цифры вместо воды. Никаких «в современном мире» и «не секрет, что».`,
    `- Обложка карусели обязана останавливать скролл: провокация, неожиданная цифра или спорное утверждение.`,
    `- Каждый слайд самодостаточен, но подталкивает листать дальше.`,
    `- CTA не навязчивый: одна строка в подписи + упоминание ссылки в шапке.`,
    `- Хэштеги: ${brand.hashtags.join(' ')} плюс 1-2 релевантных теме.`,
    `- Темы постов в одной пачке не должны повторяться и должны закрывать разные рубрики.`,
  ].join('\n')
}

function analyticsSummary(): string | null {
  const file = path.join(ANALYTICS_DIR, 'summary.md')
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf-8')
}

export async function generatePosts(brand: BrandConfig, count: number): Promise<Post[]> {
  const client = new Anthropic()

  const summary = analyticsSummary()
  const userParts = [
    `Сгенерируй пачку из ${count} постов-каруселей по ${brand.slidesPerCarousel - 1} слайдов (обложка + ${brand.slidesPerCarousel - 2} содержательных; финальный CTA-слайд добавится автоматически).`,
    `К каждому посту — сценарий короткого вертикального видео (Reels) по той же теме.`,
  ]
  if (summary) {
    userParts.push(
      ``,
      `Статистика прошлых публикаций — учитывай, какие темы и форматы заходят лучше, и делай больше похожего:`,
      summary,
    )
  }

  const response = await client.messages.parse({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: buildSystem(brand),
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userParts.join('\n') }],
    output_config: { format: zodOutputFormat(BatchSchema) },
  })

  if (!response.parsed_output) {
    throw new Error(`Не удалось распарсить ответ модели (stop_reason: ${response.stop_reason})`)
  }

  return response.parsed_output.posts.map((p) => ({
    id: nextPostId(),
    createdAt: new Date().toISOString(),
    status: 'draft' as const,
    format: 'carousel' as const,
    topic: p.topic,
    caption: p.caption,
    slides: p.slides,
    reelScript: p.reelScript,
    media: [],
    publishedTo: {},
  }))
}
