export type Slide = {
  /** Короткая надпись над заголовком, напр. "ИНСАЙД №3" */
  kicker?: string
  title: string
  /** Основной текст слайда, 1-3 коротких абзаца. Пустой для обложки. */
  body?: string
}

export type ReelScene = {
  voiceover: string
  visual: string
}

export type ReelScript = {
  hook: string
  scenes: ReelScene[]
  cta: string
}

export type Post = {
  id: string
  createdAt: string
  status: 'draft' | 'rendered' | 'published'
  format: 'carousel' | 'single'
  /** Рубрика: жизнь Лео / польза / отчёт о пути к цели */
  kind?: 'life' | 'useful' | 'goal'
  topic: string
  /** Запись в дневнике Лео: что происходит в его жизни в этом посте (для непрерывности сюжета) */
  diaryEntry?: string
  /** Бриф сцены для будущей генерации «фото из жизни» (подключается отдельно) */
  imageBrief?: string
  /** Подпись к посту: хук, текст, CTA, хэштеги */
  caption: string
  slides: Slide[]
  /** Сценарий Reels/Shorts по той же теме — снимается вручную или через видео-генератор */
  reelScript?: ReelScript
  /** Относительные пути к отрендеренным PNG внутри agent/ */
  media: string[]
  /** platform -> id/url опубликованного поста */
  publishedTo: Record<string, string>
  publishedAt?: string
}

export type BrandConfig = {
  name: string
  handle: string
  niche: string
  persona: string
  audience: string
  contentPillars: string[]
  monetization: {
    primaryCta: string
    link: string
    leadMagnet: string
  }
  visual: {
    bg: string
    bgAlt: string
    text: string
    muted: string
    accent: string
    footerTag: string
    /** Шрифт заголовков; по умолчанию Georgia (серифный «премиум») */
    headingFont?: string
  }
  platforms: Record<string, { enabled: boolean }>
  postsPerPlan: number
  slidesPerCarousel: number
  hashtags: string[]
}

export type PublishResult = {
  platform: string
  ok: boolean
  id?: string
  url?: string
  error?: string
}
