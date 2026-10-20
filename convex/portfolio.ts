import { internalMutation, internalQuery } from './_generated/server'
import { v } from 'convex/values'

const configValue = async (ctx: any, key: string) => {
  const item = await ctx.db.query('config').withIndex('by_key', (q: any) => q.eq('key', key)).unique()
  return item?.value
}

const recordById = async (ctx: any, table: 'projects' | 'posts' | 'inquiries', id: string) =>
  ctx.db.query(table).withIndex('by_record_id', (q: any) => q.eq('id', id)).unique()

export const getPublicData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await configValue(ctx, 'settings')
    const projects = await ctx.db.query('projects').collect()
    const posts = await ctx.db.query('posts').collect()
    return {
      settings: settings || {},
      projects: projects.filter((item) => item.published).map((item) => item.record),
      posts: posts.filter((item) => item.status === 'published').map((item) => item.record),
    }
  },
})

export const getPublishedPost = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const item = await ctx.db.query('posts').withIndex('by_slug', (q) => q.eq('slug', slug)).unique()
    return item?.status === 'published' ? item.record : null
  },
})

export const getAdminData = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await configValue(ctx, 'settings')
    const admin = await configValue(ctx, 'admin')
    const projects = await ctx.db.query('projects').collect()
    const posts = await ctx.db.query('posts').collect()
    const inquiries = await ctx.db.query('inquiries').collect()
    return {
      settings: settings || {},
      admin: admin || null,
      projects: projects.map((item) => item.record),
      posts: posts.map((item) => item.record),
      messages: inquiries.map((item) => item.record),
    }
  },
})

export const getAdmin = internalQuery({
  args: {},
  handler: async (ctx) => (await configValue(ctx, 'admin')) || null,
})

export const getAdminForSession = internalQuery({
  args: { hash: v.string(), now: v.number() },
  handler: async (ctx, { hash, now }) => {
    const session = await ctx.db.query('sessions').withIndex('by_hash', (q) => q.eq('hash', hash)).unique()
    if (!session || session.expiresAt <= now) return null
    const admin = await configValue(ctx, 'admin')
    return admin ? { email: admin.email } : null
  },
})

export const setSettings = internalMutation({
  args: { settings: v.any() },
  handler: async (ctx, { settings }) => {
    const current = await ctx.db.query('config').withIndex('by_key', (q) => q.eq('key', 'settings')).unique()
    if (current) await ctx.db.patch(current._id, { value: settings })
    else await ctx.db.insert('config', { key: 'settings', value: settings })
    return settings
  },
})

export const setAdmin = internalMutation({
  args: { admin: v.any() },
  handler: async (ctx, { admin }) => {
    const current = await ctx.db.query('config').withIndex('by_key', (q) => q.eq('key', 'admin')).unique()
    if (current) await ctx.db.patch(current._id, { value: admin })
    else await ctx.db.insert('config', { key: 'admin', value: admin })
    if (admin === null) {
      for (const session of await ctx.db.query('sessions').collect()) await ctx.db.delete(session._id)
    }
    return admin
  },
})

export const createSession = internalMutation({
  args: { hash: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const previous = await ctx.db.query('sessions').withIndex('by_hash', (q) => q.eq('hash', args.hash)).unique()
    if (previous) await ctx.db.delete(previous._id)
    for (const session of await ctx.db.query('sessions').collect()) {
      if (session.expiresAt <= Date.now()) await ctx.db.delete(session._id)
    }
    await ctx.db.insert('sessions', args)
    return true
  },
})

export const deleteSession = internalMutation({
  args: { hash: v.string() },
  handler: async (ctx, { hash }) => {
    const session = await ctx.db.query('sessions').withIndex('by_hash', (q) => q.eq('hash', hash)).unique()
    if (session) await ctx.db.delete(session._id)
    return true
  },
})

export const createProject = internalMutation({
  args: { record: v.any() },
  handler: async (ctx, { record }) => {
    const duplicate = await ctx.db.query('projects').withIndex('by_slug', (q) => q.eq('slug', record.slug)).unique()
    if (duplicate) throw new Error('A project with this slug already exists.')
    await ctx.db.insert('projects', { id: record.id, slug: record.slug, published: record.published === true, featured: record.featured === true, number: String(record.number || ''), record })
    return record
  },
})

export const updateProject = internalMutation({
  args: { id: v.string(), record: v.any() },
  handler: async (ctx, { id, record }) => {
    const current = await recordById(ctx, 'projects', id)
    if (!current) throw new Error('Project not found.')
    const duplicate = await ctx.db.query('projects').withIndex('by_slug', (q) => q.eq('slug', record.slug)).unique()
    if (duplicate && duplicate.id !== id) throw new Error('A project with this slug already exists.')
    await ctx.db.patch(current._id, { slug: record.slug, published: record.published === true, featured: record.featured === true, number: String(record.number || ''), record })
    return record
  },
})

export const deleteProject = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const item = await recordById(ctx, 'projects', id)
    if (!item) throw new Error('Project not found.')
    await ctx.db.delete(item._id)
    return true
  },
})

export const createPost = internalMutation({
  args: { record: v.any() },
  handler: async (ctx, { record }) => {
    const duplicate = await ctx.db.query('posts').withIndex('by_slug', (q) => q.eq('slug', record.slug)).unique()
    if (duplicate) throw new Error('An article with this slug already exists.')
    await ctx.db.insert('posts', { id: record.id, slug: record.slug, status: record.status, date: String(record.date || ''), record })
    return record
  },
})

export const updatePost = internalMutation({
  args: { id: v.string(), record: v.any() },
  handler: async (ctx, { id, record }) => {
    const current = await recordById(ctx, 'posts', id)
    if (!current) throw new Error('Article not found.')
    const duplicate = await ctx.db.query('posts').withIndex('by_slug', (q) => q.eq('slug', record.slug)).unique()
    if (duplicate && duplicate.id !== id) throw new Error('An article with this slug already exists.')
    await ctx.db.patch(current._id, { slug: record.slug, status: record.status, date: String(record.date || ''), record })
    return record
  },
})

export const deletePost = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const item = await recordById(ctx, 'posts', id)
    if (!item) throw new Error('Article not found.')
    await ctx.db.delete(item._id)
    return true
  },
})

export const createInquiry = internalMutation({
  args: { record: v.any() },
  handler: async (ctx, { record }) => {
    await ctx.db.insert('inquiries', { id: record.id, createdAt: record.createdAt, readAt: null, record })
    return record
  },
})

export const updateInquiry = internalMutation({
  args: { id: v.string(), readAt: v.union(v.string(), v.null()) },
  handler: async (ctx, { id, readAt }) => {
    const item = await recordById(ctx, 'inquiries', id)
    if (!item) throw new Error('Inquiry not found.')
    const record = { ...item.record, readAt }
    await ctx.db.patch(item._id, { readAt, record })
    return record
  },
})

export const deleteInquiry = internalMutation({
  args: { id: v.string() },
  handler: async (ctx, { id }) => {
    const item = await recordById(ctx, 'inquiries', id)
    if (!item) throw new Error('Inquiry not found.')
    await ctx.db.delete(item._id)
    return true
  },
})

export const generateUploadUrl = internalMutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
})

export const getStorageUrl = internalQuery({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, { storageId }) => ctx.storage.getUrl(storageId),
})

export const isInitialized = internalQuery({
  args: {},
  handler: async (ctx) => Boolean(await configValue(ctx, 'initialized')),
})

export const importSnapshot = internalMutation({
  args: { settings: v.any(), projects: v.array(v.any()), posts: v.array(v.any()), messages: v.array(v.any()), admin: v.union(v.any(), v.null()) },
  handler: async (ctx, { settings, projects, posts, messages, admin }) => {
    if (await configValue(ctx, 'initialized')) throw new Error('Convex already has imported portfolio data; refusing to overwrite it.')
    await ctx.db.insert('config', { key: 'settings', value: settings })
    await ctx.db.insert('config', { key: 'admin', value: admin })
    await ctx.db.insert('config', { key: 'initialized', value: true })
    for (const record of projects) await ctx.db.insert('projects', { id: record.id, slug: record.slug, published: record.published === true, featured: record.featured === true, number: String(record.number || ''), record })
    for (const record of posts) await ctx.db.insert('posts', { id: record.id, slug: record.slug, status: record.status, date: String(record.date || ''), record })
    for (const record of messages) await ctx.db.insert('inquiries', { id: record.id, createdAt: record.createdAt, readAt: record.readAt || null, record })
    return { projects: projects.length, posts: posts.length, inquiries: messages.length, adminImported: Boolean(admin) }
  },
})
