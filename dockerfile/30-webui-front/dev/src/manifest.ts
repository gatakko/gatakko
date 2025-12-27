import * as z from 'zod/v4-mini'
import type * as api from './api'

export interface Manifest {
  // undefined means schema check error. null means unspecified
  readonly title: string | undefined
  readonly owners: readonly string[] | undefined
  readonly email: string | null | undefined
  readonly startTime: number | null | undefined
  readonly endTime: number | null | undefined
  readonly days: ReadonlyArray<0 | 1 | 2 | 3 | 4 | 5 | 6> | undefined
  readonly users: readonly string[] | undefined
  readonly packages: readonly string[] | undefined
  readonly files: readonly string[] | undefined
  readonly comment: string | undefined
  readonly original: api.Manifest | null
}

const titleSchema = z.string()
const ownersSchema = z.array(z.string())
const emailSchema = z.union([z.null(), z.string()])
const startTimeSchema = z.union([z.null(), z.number()])
const endTimeSchema = z.union([z.null(), z.number()])
const daysSchema = z.array(
  z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6)
  ])
)
const usersSchema = z.array(z.string())
const packagesSchema = z.array(z.string())
const filesSchema = z.array(z.string())
const commentSchema = z.string()

const parse = <T extends z.ZodMiniType>(
  manifest: api.Manifest | null,
  key: string,
  schema: T,
  defaultValue: z.infer<T>
): z.infer<T> | undefined => {
  if (manifest == null) return undefined
  if (!(key in manifest)) return defaultValue
  const result = schema.safeParse(manifest[key])
  return result.success ? result.data : undefined
}

//const toDate = (seconds: number | null | undefined): Date | null | undefined =>
//  seconds == null ? seconds : new Date(seconds * 1000)

export const parseManifest = (manifest: api.Manifest | null): Manifest => ({
  title: parse(manifest, 'title', titleSchema, ''),
  owners: parse(manifest, 'owners', ownersSchema, []),
  email: parse(manifest, 'email', emailSchema, null),
  startTime: parse(manifest, 'startTime', startTimeSchema, null),
  endTime: parse(manifest, 'endTime', endTimeSchema, null),
  days: parse(manifest, 'days', daysSchema, []),
  users: parse(manifest, 'users', usersSchema, []),
  packages: parse(manifest, 'packages', packagesSchema, []),
  files: parse(manifest, 'files', filesSchema, []),
  comment: parse(manifest, 'comment', commentSchema, ''),
  original: manifest
})

/*
  {
    title: "タイトル",
    owners: [ "uid", ... ],
    email: "hoge@fuga.com",
    packages: [ "pkgname", ... ],
    //disableAptUpgrade: false,
    dead: false,
    startTime: unixTime,
    endTime: unixTime,
    days: [ 1, ... ],
    users: [ "userid", ... ] //!から始まるとstartTimeの影響を受けない
                             //"@all"は全員
    comment: "...",
    files: [
      "Dockerfile",
      "src/usr/share/ca-certificates/cluster.local/ca.crt",
      "run"
    ],
    patch: { ... }
  }
*/
