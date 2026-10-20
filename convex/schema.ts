import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  config: defineTable({ key: v.string(), value: v.any() }).index('by_key', ['key']),
  projects: defineTable({ id: v.string(), slug: v.string(), published: v.boolean(), featured: v.boolean(), number: v.string(), record: v.any() })
    .index('by_record_id', ['id'])
    .index('by_slug', ['slug']),
  posts: defineTable({ id: v.string(), slug: v.string(), status: v.string(), date: v.string(), record: v.any() })
    .index('by_record_id', ['id'])
    .index('by_slug', ['slug']),
  inquiries: defineTable({ id: v.string(), createdAt: v.string(), readAt: v.union(v.string(), v.null()), record: v.any() })
    .index('by_record_id', ['id'])
    .index('by_created_at', ['createdAt']),
  sessions: defineTable({ hash: v.string(), expiresAt: v.number() }).index('by_hash', ['hash']),
})
