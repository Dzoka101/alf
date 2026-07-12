import { env } from '../config.js'
import type { Post, PublishResult } from '../types.js'

const GRAPH = 'https://graph.facebook.com/v21.0'

type GraphResponse = { id?: string; permalink?: string; error?: { message: string } }

async function graph(pathPart: string, params: Record<string, string>): Promise<GraphResponse> {
  const body = new URLSearchParams({ ...params, access_token: env.igToken! })
  const res = await fetch(`${GRAPH}/${pathPart}`, { method: 'POST', body })
  const json = (await res.json()) as GraphResponse
  if (json.error) throw new Error(json.error.message)
  return json
}

async function waitReady(containerId: string): Promise<void> {
  // контейнер обрабатывается асинхронно; ждём статус FINISHED
  for (let i = 0; i < 20; i++) {
    const res = await fetch(
      `${GRAPH}/${containerId}?fields=status_code&access_token=${env.igToken}`,
    )
    const json = (await res.json()) as { status_code?: string; error?: { message: string } }
    if (json.error) throw new Error(json.error.message)
    if (json.status_code === 'FINISHED') return
    if (json.status_code === 'ERROR') throw new Error('Контейнер медиа в статусе ERROR')
    await new Promise((r) => setTimeout(r, 3000))
  }
  throw new Error('Контейнер медиа не обработался за отведённое время')
}

/**
 * Публикация через Instagram Graph API (бизнес/креатор-аккаунт).
 * Instagram скачивает изображения по публичному URL: mediaBaseUrl + путь файла.
 */
export async function publishToInstagram(post: Post): Promise<PublishResult> {
  const platform = 'instagram'
  if (!env.igToken || !env.igUserId) {
    return { platform, ok: false, error: 'IG_ACCESS_TOKEN / IG_USER_ID не заданы' }
  }
  if (!env.mediaBaseUrl) {
    return { platform, ok: false, error: 'MEDIA_BASE_URL не задан (публичный URL для картинок)' }
  }

  try {
    const urls = post.media.map(
      (m) => `${env.mediaBaseUrl!.replace(/\/$/, '')}/agent/${m.replaceAll(path_sep(), '/')}`,
    )

    let creationId: string
    if (urls.length > 1) {
      const children: string[] = []
      for (const u of urls) {
        const child = await graph(`${env.igUserId}/media`, {
          image_url: u,
          is_carousel_item: 'true',
        })
        children.push(child.id!)
      }
      const container = await graph(`${env.igUserId}/media`, {
        media_type: 'CAROUSEL',
        children: children.join(','),
        caption: post.caption,
      })
      creationId = container.id!
    } else {
      const container = await graph(`${env.igUserId}/media`, {
        image_url: urls[0],
        caption: post.caption,
      })
      creationId = container.id!
    }

    await waitReady(creationId)
    const published = await graph(`${env.igUserId}/media_publish`, { creation_id: creationId })

    const permRes = await fetch(
      `${GRAPH}/${published.id}?fields=permalink&access_token=${env.igToken}`,
    )
    const perm = (await permRes.json()) as GraphResponse

    return { platform, ok: true, id: published.id, url: perm.permalink }
  } catch (e) {
    return { platform, ok: false, error: (e as Error).message }
  }
}

function path_sep(): string {
  return process.platform === 'win32' ? '\\' : '/'
}
