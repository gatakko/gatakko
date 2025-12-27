import { FlavorList } from './FlavorList'
import { Flavor } from './Flavor'
import { Loading } from './Loading'
import { Login } from './Login'
import { useHash } from './hook'
import type * as api from './api'
import type { OK } from './util'

export const Main: preact.FunctionComponent<{
  session: OK<api.Session> | undefined
  setSession: (session: api.Session) => void
  onError: (error: unknown) => void
}> = ({ session, setSession, onError }) => {
  const hash = useHash()
  return session == null ? (
    <Loading />
  ) : !session.ok ? (
    <Login session={session} setSession={setSession} onError={onError} />
  ) : hash === '' || hash.startsWith('/') ? (
    <FlavorList onError={onError} hash={hash} />
  ) : (
    <Flavor key={hash} repoName={hash} session={session} onError={onError} />
  )
}
