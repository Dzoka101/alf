import type { BrandConfig, Slide } from './types.js'

const esc = (s: string) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')

const baseCss = (v: BrandConfig['visual']) => `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1080px; height: 1350px; }
  body {
    font-family: Georgia, 'Times New Roman', serif;
    background: ${v.bg};
    color: ${v.text};
    display: flex;
    flex-direction: column;
    padding: 90px 84px;
    position: relative;
    overflow: hidden;
  }
  body::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(900px 600px at 85% -10%, ${v.accent}22, transparent 60%),
      radial-gradient(700px 500px at -10% 110%, ${v.accent}14, transparent 55%);
    pointer-events: none;
  }
  .kicker {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 30px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: ${v.accent};
    margin-bottom: 40px;
  }
  .rule { width: 120px; height: 3px; background: ${v.accent}; margin: 48px 0; }
  .main { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; }
  .footer {
    margin-top: auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 28px;
    color: ${v.muted};
    letter-spacing: 0.08em;
  }
  .pageno { color: ${v.accent}; }
`

export function coverSlideHtml(slide: Slide, brand: BrandConfig): string {
  const v = brand.visual
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${baseCss(v)}
  h1 { font-size: 96px; line-height: 1.12; font-weight: 700; }
  .swipe {
    margin-top: 64px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 34px;
    color: ${v.text};
    background: ${v.accent}22;
    border: 1px solid ${v.accent}66;
    border-radius: 100px;
    padding: 22px 44px;
    align-self: flex-start;
  }
  </style></head><body>
    <div class="main">
      ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
      <h1>${esc(slide.title)}</h1>
      ${slide.body ? `<div class="rule"></div><div style="font-size:40px;line-height:1.5;color:${v.muted}">${esc(slide.body)}</div>` : ''}
      <div class="swipe">Листай →</div>
    </div>
    <div class="footer"><span>${esc(brand.visual.footerTag)}</span><span>${esc(brand.handle)}</span></div>
  </body></html>`
}

export function contentSlideHtml(slide: Slide, brand: BrandConfig, index: number, total: number): string {
  const v = brand.visual
  const paragraphs = (slide.body ?? '')
    .split(/\n+/)
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('')
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${baseCss(v)}
  body { background: ${v.bgAlt}; }
  h2 { font-size: 68px; line-height: 1.18; font-weight: 700; }
  .body { font-family: Arial, Helvetica, sans-serif; font-size: 40px; line-height: 1.55; color: ${v.text}; }
  .body p + p { margin-top: 32px; }
  </style></head><body>
    <div class="main">
      ${slide.kicker ? `<div class="kicker">${esc(slide.kicker)}</div>` : ''}
      <h2>${esc(slide.title)}</h2>
      <div class="rule"></div>
      <div class="body">${paragraphs}</div>
    </div>
    <div class="footer"><span>${esc(brand.visual.footerTag)}</span><span class="pageno">${index}/${total}</span></div>
  </body></html>`
}

export function ctaSlideHtml(brand: BrandConfig): string {
  const v = brand.visual
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  ${baseCss(v)}
  h2 { font-size: 76px; line-height: 1.2; font-weight: 700; }
  .cta { font-family: Arial, Helvetica, sans-serif; font-size: 42px; line-height: 1.5; color: ${v.text}; }
  .pill {
    margin-top: 56px;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 36px;
    background: ${v.accent};
    color: ${v.bg};
    border-radius: 100px;
    padding: 26px 52px;
    align-self: flex-start;
    font-weight: 700;
  }
  </style></head><body>
    <div class="main">
      <div class="kicker">Что дальше</div>
      <h2>Было полезно — сохрани и подпишись</h2>
      <div class="rule"></div>
      <div class="cta">${esc(brand.monetization.primaryCta)}</div>
      <div class="pill">Ссылка в шапке профиля</div>
    </div>
    <div class="footer"><span>${esc(brand.visual.footerTag)}</span><span>${esc(brand.handle)}</span></div>
  </body></html>`
}
