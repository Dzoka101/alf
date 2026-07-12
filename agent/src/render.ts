import { chromium, type Browser } from 'playwright'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { AGENT_ROOT, MEDIA_DIR } from './config.js'
import { coverSlideHtml, contentSlideHtml, ctaSlideHtml } from './templates.js'
import type { BrandConfig, Post } from './types.js'

async function launch(): Promise<Browser> {
  try {
    return await chromium.launch()
  } catch {
    // окружение с предустановленным Chromium другой ревизии
    return await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })
  }
}

/** Рендерит все слайды поста в PNG 1080x1350, возвращает пути относительно agent/ */
export async function renderPost(post: Post, brand: BrandConfig): Promise<string[]> {
  const outDir = path.join(MEDIA_DIR, post.id)
  mkdirSync(outDir, { recursive: true })

  const total = post.slides.length + 1 // + финальный CTA-слайд
  const htmls = [
    coverSlideHtml(post.slides[0], brand),
    ...post.slides.slice(1).map((s, i) => contentSlideHtml(s, brand, i + 2, total)),
    ctaSlideHtml(brand),
  ]

  const browser = await launch()
  const files: string[] = []
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } })
    for (let i = 0; i < htmls.length; i++) {
      await page.setContent(htmls[i], { waitUntil: 'networkidle' })
      const file = path.join(outDir, `slide-${String(i + 1).padStart(2, '0')}.png`)
      await page.screenshot({ path: file })
      files.push(path.relative(AGENT_ROOT, file))
    }
  } finally {
    await browser.close()
  }
  return files
}
