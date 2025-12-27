import { useEffect, useState } from 'preact/hooks'
import * as api from './api'
import { unixTimeToString } from './util'
import { Loading } from './Loading'
import { ModalOverlay } from './ModalOverlay'

interface LogItem {
  readonly login: string
  readonly logout?: string
}

interface LogItemEx extends LogItem {
  readonly specified: boolean
}

interface Range {
  in?: number
  out?: number
}

interface Summary {
  minTime: number | undefined
  ranges: ReadonlyMap<string, Range>
}

const timeToString = (t: number | undefined): string =>
  unixTimeToString(t).replace(/T/, ' ')

const isLaterThan = (r1: Range, r2: Range): boolean => {
  const r1out = r1.out ?? Infinity
  const r2out = r2.out ?? Infinity
  const r1in = r1.in ?? -Infinity
  const r2in = r2.in ?? -Infinity
  return r1out > r2out || r1in > r2in
}

const lastRange = (pm: Iterable<[unknown, Range]>): Range | undefined => {
  let latest
  for (const i of pm) {
    const range = i[1]
    if (latest == null || isLaterThan(range, latest)) latest = range
  }
  return latest
}

const toLogItem = (range: Range | undefined, ifNull: string): LogItem =>
  range?.in != null || range?.out != null
    ? { login: timeToString(range.in), logout: timeToString(range.out) }
    : { login: ifNull }

const summarize = (last: api.Last): Summary => {
  const um = new Map<string, Map<string, Range>>()
  let minTime: number | undefined
  for (const { p, u, t, s } of last) {
    if (minTime == null || t < minTime) minTime = t
    let pm = um.get(u)
    if (pm == null) {
      pm = new Map<string, Range>()
      um.set(u, pm)
    }
    const log = pm.get(p)
    if (s == null) {
      pm.set(p, { in: t })
    } else {
      pm.set(p, { ...(log ?? {}), out: t })
    }
  }
  const result = new Map<string, Range>()
  for (const [u, pm] of um) {
    const range = lastRange(pm)
    if (range != null) result.set(u, range)
  }
  return { minTime, ranges: result }
}

const analyze = (
  summary: Summary,
  users: readonly string[]
): Iterable<[string, LogItemEx]> => {
  const nullItem =
    summary.minTime == null
      ? '（記録なし）'
      : `（${timeToString(summary.minTime)}以降記録なし）`
  const result = new Map<string, LogItemEx>()
  for (const i of users) {
    const user = i.replace(/^!/, '')
    const item = toLogItem(summary.ranges.get(user), nullItem)
    result.set(user, { ...item, specified: true })
  }
  const others: Array<[string, LogItemEx]> = []
  for (const [user, range] of summary.ranges) {
    if (result.has(user)) continue
    const item = toLogItem(range, nullItem)
    others.push([user, { ...item, specified: false }])
  }
  others.sort((x, y) => x[0].localeCompare(y[0]))
  return [...result, ...others]
}

export const LoginLog: preact.FunctionComponent<{
  repoName: string
  users: readonly string[]
  count: number
  onError: (error: unknown) => void
  onClose: () => void
}> = ({ repoName, users, count, onError, onClose }) => {
  const [log, setLog] = useState<Iterable<[string, LogItemEx]>>()
  useEffect(() => {
    void Promise.resolve()
      .then(async () => {
        const last = await api.last(repoName, count)
        const summary = summarize(last)
        const log = analyze(summary, users)
        setLog(log)
      })
      .catch(onError)
  }, [repoName, users, count, onError])
  return (
    <ModalOverlay title={repoName} onClose={onClose}>
      <Loading data={log} />
      {log != null && (
        <table className="login-log">
          <thead>
            <tr>
              <th>ユーザID</th>
              <th>最終ログイン</th>
              <th style="width: 1px">〜</th>
              <th>最終ログアウト</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(log, ([user, item]) => {
              const className = item.specified ? '' : 'login-log-unspecified'
              return (
                <tr key={user}>
                  <td className={className}>{user}</td>
                  {item.logout == null ? (
                    <td className={className} colSpan={3}>
                      {item.login}
                    </td>
                  ) : (
                    <>
                      <td className={className}>{item.login}</td>
                      <td className={className}>〜</td>
                      <td className={className}>{item.logout}</td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </ModalOverlay>
  )
}
