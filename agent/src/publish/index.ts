import type { BrandConfig, Post, PublishResult } from '../types.js'
import { publishToInstagram } from './instagram.js'
import { publishToTelegram } from './telegram.js'
import { publishToVK } from './vk.js'

const publishers: Record<string, (post: Post) => Promise<PublishResult>> = {
  instagram: publishToInstagram,
  telegram: publishToTelegram,
  vk: publishToVK,
}

export async function publishEverywhere(post: Post, brand: BrandConfig): Promise<PublishResult[]> {
  const results: PublishResult[] = []
  for (const [name, cfg] of Object.entries(brand.platforms)) {
    if (!cfg.enabled) continue
    const fn = publishers[name]
    if (!fn) continue
    const result = await fn(post)
    results.push(result)
    if (result.ok && result.id) post.publishedTo[name] = result.id
  }
  return results
}
