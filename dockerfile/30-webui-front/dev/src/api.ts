import * as z from 'zod/v4-mini'
import { para, seq, sync } from './sched'
import { fetchJson } from './util'

const emptySchema = z.object({})
export type Empty = z.infer<typeof emptySchema>

const sessionSchema = z.object({
  user: z.string(),
  ttl: z.number()
})
export type Session = z.infer<typeof sessionSchema>

let currentUpdater: ReturnType<typeof setTimeout> | undefined

const startUpdater = (session: Session): void => {
  const now = new Date().getTime() / 1000
  if (session.ttl <= now) return
  if (currentUpdater != null) clearTimeout(currentUpdater)
  const callback = (): void => {
    void refresh()
  }
  currentUpdater = setTimeout(callback, (1000 * (session.ttl - now) * 3) / 4)
  const ttl = new Date(session.ttl * 1000).toString()
  console.log(`session will be kept until ${ttl}`)
}

export const login = async (user: string, pass: string): Promise<Session> => {
  const session = await sync(
    async () =>
      await fetchJson('/api/login', sessionSchema, {
        method: 'POST',
        body: JSON.stringify({ user, pass }),
        headers: { 'content-type': 'application/json' }
      })
  )
  startUpdater(session)
  return session
}

export const logout = async (): Promise<Empty> =>
  await sync(async () => {
    return await fetchJson('/api/logout', emptySchema, {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' }
    })
  })

export const refresh = async (): Promise<Session> => {
  const session = await sync(async () => {
    return await fetchJson('/api/refresh', sessionSchema, {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' }
    })
  })
  startUpdater(session)
  return session
}

const searchSchema = z.array(
  z.object({
    name: z.string(),
    desc: z.string()
  })
)
export type Search = z.infer<typeof searchSchema>

export const search = async (
  first: number,
  count: number,
  query: string
): Promise<Search> =>
  await seq(async () => {
    const q = encodeURIComponent(query)
    return await fetchJson(`/api/search?${first}&${count}&${q}`, searchSchema)
  })

const pkginfoSchema = z.object({
  packages: z.record(z.string(), z.object({ desc: z.string() })),
  size: z.number()
})
export type Pkginfo = z.infer<typeof pkginfoSchema>

export const pkginfo = async (pkgs: Iterable<string>): Promise<Pkginfo> =>
  await seq(async () => {
    const qs = Array.from(pkgs, encodeURIComponent).join('&')
    return await fetchJson(`/api/pkginfo?${qs}`, pkginfoSchema)
  })

const flavorsSchema = z.record(
  z.string(),
  z.union([
    z.null(),
    z.object({
      id: z.string(),
      title: z.optional(z.string()),
      startTime: z.optional(z.number()),
      endTime: z.optional(z.number())
    })
  ])
)
export type Flavors = z.infer<typeof flavorsSchema>

export const flavors = async (): Promise<Flavors> =>
  await para(async () => await fetchJson('/api/flavors', flavorsSchema))

const statusSchema = z.record(z.string(), z.string())
export type Status = z.infer<typeof statusSchema>

export const status = async (repoName: string): Promise<Status> =>
  await para(async () => {
    return await fetchJson(`/api/status/${repoName}`, statusSchema)
  })

export const log = async (repoName: string): Promise<string> =>
  await para(async () => await fetchJson(`/api/log/${repoName}`, z.string()))

const lastSchema = z.array(
  z.object({
    p: z.string(), // protocol
    u: z.string(), // user
    t: z.number(), // time
    s: z.optional(z.number()) // exit status
  })
)
export type Last = z.infer<typeof lastSchema>

export const last = async (repoName: string, count: number): Promise<Last> =>
  await para(async () => {
    return await fetchJson(`/api/last/${repoName}?${count}`, lastSchema)
  })

export const pull = async (
  repoName: string,
  create = false
): Promise<Session> => {
  const session = await sync(async () => {
    const flag = create ? 'c' : 'e'
    const qs = encodeURIComponent(repoName)
    return await fetchJson(`/api/pull?${flag}&${qs}`, sessionSchema, {
      method: 'POST',
      body: '{}',
      headers: { 'content-type': 'application/json' }
    })
  })
  startUpdater(session)
  return session
}

const manifestSchema = z.looseObject({})
export type Manifest = z.infer<typeof manifestSchema>

const filesSchema = z.record(z.string(), z.number())
export type Files = z.infer<typeof filesSchema>

const repoSchema = z.object({
  manifest: z.nullable(manifestSchema),
  files: filesSchema
})
export type Repo = z.infer<typeof repoSchema>

export const repo = async (): Promise<Repo> =>
  await para(async () => await fetchJson('/api/repo', repoSchema))

export const putFile = async (
  path: string,
  content: File | Blob,
  mode: '644' | '755'
): Promise<Files> =>
  await para(async () => {
    return await fetchJson(`/api/repo/${path}?${mode}`, filesSchema, {
      method: 'PUT',
      body: content,
      headers: { 'content-type': 'application/octet-stream' }
    })
  })

export const deleteFile = async (path: string): Promise<Files> =>
  await para(async () => {
    return await fetchJson(`/api/repo/${path}`, filesSchema, {
      method: 'DELETE'
    })
  })

export const getFile = (path: string): string => `/api/repo/${path}`

export const push = async (manifest: Manifest): Promise<Empty> =>
  await para(async () => {
    return await fetchJson('/api/push', emptySchema, {
      method: 'POST',
      body: JSON.stringify(manifest),
      headers: { 'content-type': 'application/json' }
    })
  })
