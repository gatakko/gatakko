import type * as z from 'zod/v4-mini'

export type OK<X> = { ok: true; data: X } | { ok: false; error: unknown }

export class ServerError extends Error {
  readonly status: number
  readonly body: unknown
  readonly error: unknown

  constructor(status: number, body: unknown, error: unknown) {
    super(`Server response status ${status}`)
    this.status = status
    this.body = body
    this.error = error
  }
}

export const fetchJson = async <T extends z.ZodMiniType>(
  url: string,
  schema: T,
  init?: RequestInit
): Promise<z.infer<T>> => {
  const res = await fetch(url, init)
  if (res.ok) return schema.parse(await res.json())
  let e
  try {
    e = new ServerError(res.status, await res.json(), undefined)
  } catch (error) {
    e = new ServerError(res.status, null, error)
  }
  throw e
}

export const humanReadableCapacity = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export const unixTimeToString = (time: number | null | undefined): string => {
  if (time == null) return ''
  const date = new Date(time * 1000)
  const d = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return d.toISOString().slice(0, 19)
}

export const unixTimeFromString = (time: string): number =>
  new Date(time).getTime() / 1000

export const toPositiveNumber = (s: unknown): number | undefined => {
  if (typeof s !== 'string') return undefined
  const n = parseInt(s)
  return n > 0 ? n : undefined
}
