import { useCallback, useState } from 'preact/hooks'
import * as api from './api'
import { SpinnerSmall } from './Loading'

const modeToString = (mode: number): string =>
  ((mode & 4) === 0 ? '-' : 'r') +
  ((mode & 2) === 0 ? '-' : 'w') +
  ((mode & 1) === 0 ? '-' : 'x')

const basename = (path: string): string => path.replace(/^.*\//, '')

export const FileList: preact.FunctionComponent<{
  files: api.Files
  setFiles: (files: api.Files) => void
  onError: (error: unknown) => void
  readOnly?: boolean | undefined
}> = ({ files, setFiles, onError, readOnly }) => {
  const [stable, setStable] = useState(true)
  const uploadFile = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const form = e.currentTarget
      const data = new FormData(form)
      const file = data.get('file')
      const path = data.get('path')
      const mode = data.get('exec') != null ? '755' : '644'
      if (!(file instanceof File)) return
      if (typeof path !== 'string' || !/^(?:\/[^/]+)+$/.test(path)) return
      setStable(false)
      void Promise.resolve()
        .then(async () => {
          const files = await api.putFile(path.slice(1), file, mode)
          form.reset()
          setFiles(files)
          setStable(true)
        })
        .catch((error: unknown) => {
          setStable(true)
          onError(error)
        })
    },
    [setFiles, onError]
  )
  const deleteFile = (path: string) => (): void => {
    setStable(false)
    void Promise.resolve()
      .then(async () => {
        const files = await api.deleteFile(path)
        setFiles(files)
        setStable(true)
      })
      .catch((error: unknown) => {
        setStable(true)
        onError(error)
      })
  }
  const entries = Object.entries(files)
  return (
    <div className="file-list">
      {entries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>操作</th>
              <th>モード</th>
              <th>ファイル名</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([path, mode]) => (
              <tr key={`${mode}:${path}`}>
                <td>
                  <button
                    onClick={deleteFile(path)}
                    disabled={readOnly === true || !stable}
                  >
                    削除
                  </button>
                </td>
                <td>{modeToString(mode)}</td>
                <td>
                  <a href={api.getFile(path)} download={basename(path)}>
                    /{path}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <details>
        <summary>ファイルを追加</summary>
        <form onSubmit={uploadFile}>
          <div>
            <label>
              <span>ファイル</span>
              <input
                type="file"
                name="file"
                required={true}
                disabled={readOnly === true || !stable}
              />
            </label>
          </div>
          <div>
            <label>
              <span>絶対パス</span>
              <input
                type="text"
                name="path"
                pattern="(?:\/[^\/]+)+"
                required={true}
                disabled={readOnly === true || !stable}
              />
            </label>
          </div>
          <div>
            <label>
              <span>実行可能</span>
              <input
                type="checkbox"
                name="exec"
                disabled={readOnly === true || !stable}
              />
            </label>
          </div>
          <div>
            {stable ? (
              <input type="submit" value="追加" disabled={readOnly === true} />
            ) : (
              <SpinnerSmall />
            )}
          </div>
        </form>
      </details>
    </div>
  )
}
