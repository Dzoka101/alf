import { loadBrand, env } from './config.js'
import { listQueue, listPublished, savePost, markPublished } from './queue.js'
import { samplePosts } from './sample-content.js'
import { renderPost } from './render.js'
import { publishEverywhere } from './publish/index.js'
import { collectAnalytics } from './analytics.js'

const args = process.argv.slice(2)
const command = args[0] ?? 'status'
const flag = (name: string) => args.includes(`--${name}`)
const opt = (name: string): string | undefined => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}

const brand = loadBrand()

async function cmdPlan() {
  const count = Number(opt('count') ?? brand.postsPerPlan)
  const offline = flag('offline') || !env.anthropicKey

  let posts
  if (offline) {
    console.log(`Генерирую ${count} постов из офлайн-набора (ANTHROPIC_API_KEY не задан или --offline)...`)
    posts = samplePosts(count)
  } else {
    console.log(`Генерирую ${count} постов через Claude...`)
    const { generatePosts } = await import('./claude.js')
    posts = await generatePosts(brand, count)
  }

  for (const p of posts) {
    savePost(p)
    console.log(`  + [${p.id}] ${p.topic}`)
  }
  console.log(`Готово: ${posts.length} постов в очереди.`)
}

async function cmdRender() {
  const drafts = listQueue().filter((p) => p.status === 'draft')
  if (drafts.length === 0) {
    console.log('Нет черновиков для рендера.')
    return
  }
  for (const post of drafts) {
    console.log(`Рендерю [${post.id}] ${post.topic}...`)
    post.media = await renderPost(post, brand)
    post.status = 'rendered'
    savePost(post)
    console.log(`  ${post.media.length} слайдов -> content/media/${post.id}/`)
  }
}

async function cmdPublish() {
  const ready = listQueue().filter((p) => p.status === 'rendered')
  if (ready.length === 0) {
    console.log('Нет отрендеренных постов в очереди.')
    return
  }
  const post = ready[0]
  console.log(`Публикую [${post.id}] ${post.topic}...`)

  if (flag('dry-run')) {
    console.log('  --dry-run: пропускаю реальные API-вызовы.')
    return
  }

  const results = await publishEverywhere(post, brand)
  let anyOk = false
  for (const r of results) {
    if (r.ok) {
      anyOk = true
      console.log(`  ✓ ${r.platform}: ${r.url ?? r.id}`)
    } else {
      console.log(`  ✗ ${r.platform}: ${r.error}`)
    }
  }
  if (anyOk) {
    markPublished(post)
    console.log(`Пост перемещён в published.`)
  } else {
    savePost(post)
    console.log('Ни одна платформа не приняла пост — остаётся в очереди.')
  }
}

async function cmdAnalyze() {
  console.log('Собираю аналитику...')
  const summary = await collectAnalytics()
  console.log(summary)
}

function cmdStatus() {
  const queue = listQueue()
  const published = listPublished()
  console.log(`Бренд: ${brand.name} (${brand.handle})`)
  console.log(`Очередь: ${queue.length} (черновиков ${queue.filter((p) => p.status === 'draft').length}, готовых ${queue.filter((p) => p.status === 'rendered').length})`)
  console.log(`Опубликовано: ${published.length}`)
  for (const p of queue) console.log(`  [${p.status}] ${p.id} — ${p.topic}`)
}

async function cmdRun() {
  // полный цикл: пополнить очередь при необходимости -> отрендерить -> опубликовать 1 пост -> аналитика
  if (listQueue().length === 0) await cmdPlan()
  await cmdRender()
  await cmdPublish()
  if (env.igToken) await cmdAnalyze().catch((e) => console.warn(`Аналитика: ${e.message}`))
}

const commands: Record<string, () => Promise<void> | void> = {
  plan: cmdPlan,
  render: cmdRender,
  publish: cmdPublish,
  analyze: cmdAnalyze,
  status: cmdStatus,
  run: cmdRun,
}

const fn = commands[command]
if (!fn) {
  console.error(`Неизвестная команда: ${command}. Доступно: ${Object.keys(commands).join(', ')}`)
  process.exit(1)
}
await fn()
