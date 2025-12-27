import { useCallback, useState } from 'preact/hooks'
import { SpinnerSmall } from './Loading'
import { ModalOverlay } from './ModalOverlay'
import * as api from './api'
import { ServerError } from './util'

type Flavor = [string, api.Flavors[string]]

export const NewFlavor: preact.FunctionComponent<{
  flavors: readonly Flavor[] | undefined
  onError: (error: unknown) => void
}> = ({ flavors, onError }) => {
  const [stable, setStable] = useState<boolean | null>(true)
  const [error, setError] = useState<string | undefined>()
  const handleClose = useCallback((): void => {
    window.location.assign('#')
  }, [])
  const handleSubmit = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const self = data.get('self')
      const parent = data.get('parent')
      const email = data.get('email')
      if (typeof self !== 'string' || self === '') return
      if (typeof parent !== 'string' || parent === '') return
      if (typeof email !== 'string' || email === '') return
      if (!/^[0-9A-Za-z][0-9A-Za-z_-]*$/.test(self)) return
      setStable(false)
      const repoName = `${parent}/${self}`
      void Promise.resolve()
        .then(async () => {
          let session
          try {
            session = await api.pull(repoName, true)
          } catch (error) {
            setStable(true)
            throw error
          }
          try {
            await api.push({
              owners: [session.user],
              users: [`!${session.user}`],
              email
            })
          } catch (error) {
            setStable(null)
            throw error
          }
          window.location.assign(`#${repoName}`)
        })
        .catch((error: unknown) => {
          if (
            error instanceof ServerError &&
            error.status === 403 &&
            typeof error.body === 'string'
          ) {
            setError(error.body)
          } else {
            onError(error)
          }
        })
    },
    [onError]
  )
  return (
    <ModalOverlay
      onClose={handleClose}
      title="新しいイメージを追加"
      disabled={stable === false}
    >
      <form onSubmit={handleSubmit} className="new-flavor">
        <div>
          <label>
            <span>親イメージ</span>
            {flavors == null ? (
              <SpinnerSmall />
            ) : (
              <select name="parent" disabled={stable !== true}>
                {flavors.map(
                  ([name, flavor]) =>
                    flavor != null && (
                      <option
                        key={name}
                        value={name}
                        selected={name === 'flavor/master'}
                      >
                        {name}
                      </option>
                    )
                )}
              </select>
            )}
          </label>
        </div>
        <div>
          <label>
            <span>イメージID</span>
            <input
              type="text"
              name="self"
              placeholder="英数字、アンダースコア、ハイフンが使えます"
              pattern="[0-9A-Za-z][0-9A-Za-z_\-]*"
              required={true}
              disabled={stable !== true}
            />
          </label>
        </div>
        <div>
          <label>
            <span>メールアドレス</span>
            <input
              type="email"
              name="email"
              required={true}
              disabled={stable !== true}
            />
          </label>
        </div>
        <div className="new-flavor-buttons">
          {stable !== false ? (
            <input
              type="submit"
              value="作成"
              disabled={stable !== true || flavors == null}
            />
          ) : (
            <SpinnerSmall />
          )}
        </div>
      </form>
      {stable !== false && error != null && <p className="error">{error}</p>}
    </ModalOverlay>
  )
}
