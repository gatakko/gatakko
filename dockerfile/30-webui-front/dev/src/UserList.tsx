import { useCallback, useMemo, useState } from 'preact/hooks'
import * as papa from 'papaparse'
import { toPositiveNumber } from './util'
import { SpinnerSmall } from './Loading'

const parseCsv = async (
  file: File,
  column: number
): Promise<readonly string[]> => {
  const result = new Set<string>()
  await new Promise<void>((resolve, reject) => {
    papa.parse<string[], File>(file, {
      worker: true,
      step: row => {
        const value = row.data[column]
        if (value != null && /^[a-zA-Z0-9_-]+$/.test(value)) {
          result.add(value.toLowerCase())
        }
      },
      complete: () => {
        resolve()
      },
      error: (error: Error) => {
        reject(error)
      }
    })
  })
  return Array.from(result)
}

const toArray = (usersMap: ReadonlyMap<string, boolean>): readonly string[] =>
  Array.from(usersMap, ([userId, bang]) => `${bang ? '!' : ''}${userId}`)

const set = <K, V>(
  map: ReadonlyMap<K, V>,
  key: K,
  value: V
): ReadonlyMap<K, V> => {
  const m = new Map(map)
  m.set(key, value)
  return m
}

const remove = <K, V>(map: ReadonlyMap<K, V>, key: K): ReadonlyMap<K, V> => {
  const m = new Map(map)
  m.delete(key)
  return m
}

export const UserList: preact.FunctionComponent<{
  users: readonly string[]
  setUsers: (users: readonly string[]) => void
  onError: (error: unknown) => void
  readOnly?: boolean | undefined
}> = ({ users, setUsers, onError, readOnly }) => {
  const usersMap = useMemo((): ReadonlyMap<string, boolean> => {
    const m = new Map<string, boolean>()
    for (const i of users) m.set(i.replace(/^!/, ''), i.startsWith('!'))
    return m
  }, [users])
  const addUser = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const user = data.get('user')
      if (typeof user !== 'string' || user === '') return
      e.currentTarget.reset()
      const bang = user.startsWith('!')
      const userId = user.replace(/^!/, '')
      if (usersMap.get(userId) !== bang) {
        setUsers(toArray(set(usersMap, userId, bang)))
      }
    },
    [usersMap, setUsers]
  )
  const toggleBang =
    (userId: string) =>
    (e: preact.TargetedEvent<HTMLInputElement>): void => {
      setUsers(toArray(set(usersMap, userId, e.currentTarget.checked)))
    }
  const deleteUser = (userId: string) => (): void => {
    setUsers(toArray(remove(usersMap, userId)))
  }
  const [stable, setStable] = useState(true)
  const importCsv = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const file = data.get('file')
      const column = toPositiveNumber(data.get('column'))
      if (!(file instanceof File)) return
      if (column == null) return
      setStable(false)
      void parseCsv(file, column - 1)
        .then(setUsers, onError)
        .then(() => {
          setStable(true)
        })
    },
    [setUsers, onError]
  )
  return (
    <div className="user-list">
      {stable ? (
        <table>
          <thead>
            <tr>
              <th>操作</th>
              <th></th>
              <th>ユーザID</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(usersMap, ([userId, bang]) => (
              <tr key={userId}>
                <td>
                  <button disabled={readOnly} onClick={deleteUser(userId)}>
                    削除
                  </button>
                </td>
                <td>
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={bang}
                    onClick={toggleBang(userId)}
                  />
                </td>
                <td>{userId}</td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td colSpan={2}>
                <form onSubmit={addUser}>
                  <input
                    type="text"
                    name="user"
                    size={15}
                    placeholder="ユーザID"
                    required={true}
                    disabled={readOnly}
                  />{' '}
                  <button disabled={readOnly}>追加</button>
                </form>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <p>
          <SpinnerSmall />
        </p>
      )}
      <details>
        <summary>CSVファイルからユーザリストを取り込む</summary>
        <form onSubmit={importCsv}>
          <div>
            <label>
              <span>ファイル</span>
              <input
                type="file"
                name="file"
                accept=".csv,text/csv"
                required={true}
                disabled={readOnly === true || !stable}
              />
            </label>
          </div>
          <div>
            <label>
              <span>列番号</span>
              <input
                type="number"
                name="column"
                min="1"
                size={4}
                defaultValue={1}
                required={true}
                disabled={readOnly === true || !stable}
              />
            </label>
          </div>
          <div>
            <input
              type="submit"
              value="取り込む"
              disabled={readOnly === true || !stable}
            />
          </div>
        </form>
      </details>
    </div>
  )
}
