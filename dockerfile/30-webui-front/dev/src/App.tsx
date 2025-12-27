import { useCallback, useEffect, useState } from 'preact/hooks'
import { Menu } from './Menu'
import { Main } from './Main'
import * as api from './api'
import { type OK, ServerError } from './util'

export const App: preact.FunctionComponent = () => {
  const [ok, setOk] = useState<OK<api.Session>>()
  const setSession = useCallback((data: api.Session): void => {
    setOk({ ok: true, data })
  }, [])
  const setError = useCallback((error: unknown): void => {
    console.error(error)
    setOk({ ok: false, error })
  }, [])
  const logout = useCallback((): void => {
    setOk(undefined)
    void api.logout().then(() => {
      setError(new ServerError(403, 'Session closed', undefined))
    }, setError)
  }, [setError])
  useEffect(() => {
    void api.refresh().then(setSession, setError)
    return () => {
      void api.logout().catch(() => {})
    }
  }, [setSession, setError])
  return (
    <>
      <header>
        <Menu session={ok} logout={logout} />
      </header>
      <main>
        <Main session={ok} setSession={setSession} onError={setError} />
      </main>
    </>
  )
}
