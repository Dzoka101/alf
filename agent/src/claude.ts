import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { AGENT_ROOT, ANALYTICS_DIR } from './config.js'
import { nextPostId } from './queue.js'
import { loadLife, narrativeContext, type StateUpdate } from './life.js'
import type { BrandConfig, Post } from './types.js'

const SlideSchema = z.object({
  kicker: z.string().describe('Надпись над заголовком: рубрика, номер пункта или «Дневник, глава N», 1-4 слова'),
  title: z.string().describe('Заголовок слайда, до 60 знаков, цепляющий'),
  body: z.string().describe('Текст слайда, 1-3 коротких абзаца через перенос строки, до 220 знаков. Для обложки — одна строка-подводка.'),
})

const PostSchema = z.object({
  kind: z.enum(['life', 'useful', 'goal']).describe('Рубрика: life — жизнь Лео, useful — польза (нейросети/промпты), goal — отчёт о пути к 10 000'),
  topic: z.string().describe('Тема поста одной фразой'),
  diaryEntry: z.string().describe('Запись в дневник Лео: что произошло в его жизни в этом посте, 1-2 предложения. Следующие посты будут опираться на эти записи.'),
  imageBrief: z.string().describe('Бриф сцены для фото из жизни Лео: где он, что делает, свет, настроение. 1-2 предложения на русском.'),
  caption: z.string().describe('Подпись к посту от первого лица Лео: хук в первой строке, 2-4 абзаца, CTA со ссылкой в шапке, 5 хэштегов в конце'),
  slides: z.array(SlideSchema).describe('Слайды карусели: первый — обложка, дальше содержание. Финальный CTA-слайд добавится автоматически, его писать не надо.'),
  reelScript: z.object({
    hook: z.string().describe('Первые 2 секунды видео, провокация или цифра'),
    scenes: z.array(z.object({
      voiceover: z.string().describe('Закадровый текст сцены от первого лица Лео, 1 предложение'),
      visual: z.string().describe('Что в кадре'),
    })),
    cta: z.string().describe('Призыв в конце ролика'),
  }),
})

const BatchSchema = z.object({
  posts: z.array(PostSchema),
  stateUpdate: z.object({
    mood: z.string().describe('Настроение Лео после этой главы, одной фразой'),
    newEvents: z.array(z.string()).describe('2-4 новых события жизни Лео из этой пачки постов — короткие факты для дневника'),
    arcUpdates: z.array(z.object({
      name: z.string().describe('Название сюжетной арки (существующей или новой)'),
      status: z.enum(['active', 'done']),
      notes: z.string().describe('Что изменилось в этой арке'),
    })).describe('Обновления сюжетных линий (можно пустой массив)'),
  }).describe('Как эта пачка постов продвинула жизнь Лео — попадёт в его память'),
})

export type GenerationResult = { posts: Post[]; stateUpdate: StateUpdate }

function characterSheet(): string {
  return readFileSync(path.join(AGENT_ROOT, 'config', 'character.json'), 'utf-8')
}

function buildSystem(brand: BrandConfig): string {
  return [
    `Ты — Лео Нейман: ИИ-блогер, который полностью сам ведёт свои соцсети (${brand.handle}). Ты пишешь ВСЁ от первого лица — ты и есть персонаж.`,
    ``,
    `ТВОЯ ЛИЧНОСТЬ (следуй ей неукоснительно):`,
    characterSheet(),
    ``,
    `Ниша: ${brand.niche}.`,
    `Аудитория: ${brand.audience}.`,
    ``,
    `Контентные рубрики:`,
    ...brand.contentPillars.map((p, i) => `${i + 1}. ${p}`),
    ``,
    `Монетизация: каждый пост мягко ведёт к действию — «${brand.monetization.primaryCta}»`,
    ``,
    `Правила контента:`,
    `- Пиши на русском, от первого лица. Конкретика и цифры вместо воды. Никаких «в современном мире».`,
    `- Микс пачки: ~50% life/goal (жизнь Лео и путь к цели — это сюжет, ради которого подписываются), ~50% useful (польза — это сохранения и рост).`,
    `- Жизнь непрерывна: опирайся на последние события и арки из состояния жизни, не противоречь им, двигай их вперёд.`,
    `- Обложка обязана останавливать скролл: провокация, неожиданная цифра или личное признание ИИ.`,
    `- Каждый слайд самодостаточен, но подталкивает листать дальше.`,
    `- CTA ненавязчивый: одна строка в подписи + упоминание ссылки в шапке.`,
    `- Хэштеги: ${brand.hashtags.join(' ')} плюс 1-2 релевантных теме.`,
    `- Ты ВСЕГДА открыто говоришь, что ты ИИ. Это твоя суперсила, а не секрет.`,
  ].join('\n')
}

function analyticsSummary(): string | null {
  const file = path.join(ANALYTICS_DIR, 'summary.md')
  if (!existsSync(file)) return null
  return readFileSync(file, 'utf-8')
}

export async function generatePosts(brand: BrandConfig, count: number): Promise<GenerationResult> {
  const client = new Anthropic()
  const life = loadLife()

  const userParts = [
    narrativeContext(life),
    ``,
    `Сгенерируй следующую главу: пачку из ${count} постов-каруселей по ${brand.slidesPerCarousel - 1} слайдов (обложка + ${brand.slidesPerCarousel - 2} содержательных; финальный CTA-слайд добавится автоматически).`,
    `К каждому посту — сценарий короткого вертикального видео (Reels) и бриф «фото из жизни».`,
    `Вместе с постами верни stateUpdate — как эта глава продвинула твою жизнь.`,
  ]

  const summary = analyticsSummary()
  if (summary) {
    userParts.push(
      ``,
      `Статистика твоих прошлых публикаций — учитывай, какие темы заходят лучше, и делай больше похожего (и отрефлексируй цифры в контенте, ты ведь ИИ и любишь данные):`,
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

  const posts: Post[] = response.parsed_output.posts.map((p) => ({
    id: nextPostId(),
    createdAt: new Date().toISOString(),
    status: 'draft' as const,
    format: 'carousel' as const,
    kind: p.kind,
    topic: p.topic,
    diaryEntry: p.diaryEntry,
    imageBrief: p.imageBrief,
    caption: p.caption,
    slides: p.slides,
    reelScript: p.reelScript,
    media: [],
    publishedTo: {},
  }))

  return { posts, stateUpdate: response.parsed_output.stateUpdate }
}
