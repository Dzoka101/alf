import { readFileSync } from 'node:fs'
import path from 'node:path'
import { AGENT_ROOT, env } from '../config.js'
import type { Post, PublishResult } from '../types.js'

const V = '5.199'

type VkEnvelope<T> = { response?: T; error?: { error_msg: string } }

async function vk<T>(method: string, params: Record<string, string>): Promise<T> {
  const body = new URLSearchParams({ ...params, access_token: env.vkToken!, v: V })
  const res = await fetch(`https://api.vk.com/method/${method}`, { method: 'POST', body })
  const json = (await res.json()) as VkEnvelope<T>
  if (json.error) throw new Error(`${method}: ${json.error.error_msg}`)
  return json.response as T
}

/** Публикация на стену сообщества VK: upload фото -> saveWallPhoto -> wall.post */
export async function publishToVK(post: Post): Promise<PublishResult> {
  const platform = 'vk'
  if (!env.vkToken || !env.vkGroupId) {
    return { platform, ok: false, error: 'VK_ACCESS_TOKEN / VK_GROUP_ID не заданы' }
  }

  try {
    const groupId = env.vkGroupId.replace(/^-/, '')
    const attachments: string[] = []

    for (const m of post.media) {
      const upload = await vk<{ upload_url: string }>('photos.getWallUploadServer', {
        group_id: groupId,
      })

      const form = new FormData()
      const bytes = readFileSync(path.join(AGENT_ROOT, m))
      form.set('photo', new Blob([bytes], { type: 'image/png' }), 'slide.png')
      const upRes = await fetch(upload.upload_url, { method: 'POST', body: form })
      const upJson = (await upRes.json()) as { server: number; photo: string; hash: string }

      const saved = await vk<{ owner_id: number; id: number }[]>('photos.saveWallPhoto', {
        group_id: groupId,
        server: String(upJson.server),
        photo: upJson.photo,
        hash: upJson.hash,
      })
      attachments.push(`photo${saved[0].owner_id}_${saved[0].id}`)
    }

    const posted = await vk<{ post_id: number }>('wall.post', {
      owner_id: `-${groupId}`,
      from_group: '1',
      message: post.caption,
      attachments: attachments.join(','),
    })

    return {
      platform,
      ok: true,
      id: String(posted.post_id),
      url: `https://vk.com/wall-${groupId}_${posted.post_id}`,
    }
  } catch (e) {
    return { platform, ok: false, error: (e as Error).message }
  }
}
