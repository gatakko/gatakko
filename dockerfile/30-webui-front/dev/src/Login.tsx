import { useCallback, useState } from 'preact/hooks'
import { SpinnerSmall } from './Loading'
import * as api from './api'
import { ServerError } from './util'

const ErrorMessage: preact.FunctionComponent<{
  error: unknown
}> = ({ error }) => {
  if (error instanceof ServerError && error.status === 403) {
    if (error.body === 'Session closed') {
      return undefined
    } else if (typeof error.body === 'string') {
      return <p className="error">{error.body}</p>
    }
  }
  return <p className="error">{String(error)}</p>
}

export const Login: preact.FunctionComponent<{
  session: { error: unknown }
  setSession: (data: api.Session) => void
  onError: (error: unknown) => void
}> = ({ session, setSession, onError }) => {
  const [stable, setStable] = useState(true)
  const handleSubmit = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const user = data.get('user')
      const pass = data.get('pass')
      if (typeof user !== 'string' || typeof pass !== 'string') return
      setStable(false)
      void api.login(user, pass).then(setSession, (error: unknown) => {
        setStable(true)
        onError(error)
      })
    },
    [setSession, onError]
  )
  return (
    <div className="login">
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            <span>Username</span>
            <input type="text" name="user" disabled={!stable} />
          </label>
        </div>
        <div>
          <label>
            <span>Password</span>
            <input type="password" name="pass" disabled={!stable} />
          </label>
        </div>
        <div>
          {stable ? <input type="submit" value="Login" /> : <SpinnerSmall />}
        </div>
      </form>
      {stable && <ErrorMessage error={session.error} />}
    </div>
  )
}
