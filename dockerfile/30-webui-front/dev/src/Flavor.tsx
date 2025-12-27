import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'
import * as api from './api'
import * as util from './util'
import { type Manifest, parseManifest } from './manifest'
import { FileList } from './FileList'
import { PackageList } from './PackageList'
import { UserList } from './UserList'
import { Loading, SpinnerSmall } from './Loading'
import { LoginLog } from './LoginLog'
import { ModalOverlay } from './ModalOverlay'
import { DaysOfWeek } from './DaysOfWeek'

const unixTimeToDate = (time: number | null | undefined): string =>
  util.unixTimeToString(time).slice(0, 10)

export const Flavor: preact.FunctionComponent<{
  session: { data: { user: string } }
  repoName: string
  onError: (error: unknown) => void
}> = ({ session, repoName, onError }) => {
  const [manifest, setManifest] = useState<Manifest>()
  const [days, setDays] = useState<Manifest['days']>()
  const [packages, setPackages] = useState<Manifest['packages']>()
  const [files, setFiles] = useState<api.Files>({})
  const [users, setUsers] = useState<Manifest['users']>()
  const [stable, setStable] = useState(false)
  const [error, setError] = useState<string>()
  const [logCount, setLogCount] = useState<number>()
  const clearError = useCallback(() => {
    setError(undefined)
  }, [])
  useEffect(() => {
    void Promise.resolve()
      .then(async () => {
        await api.pull(repoName)
        const repo = await api.repo()
        const manifest = parseManifest(repo.manifest)
        setManifest(manifest)
        setDays(manifest.days)
        setPackages(manifest.packages)
        setFiles(repo.files)
        setUsers(manifest.users)
        setStable(true)
      })
      .catch(onError)
  }, [repoName, onError])
  const handleError = useCallback(
    (error: unknown) => {
      if (
        error instanceof util.ServerError &&
        (error.status === 403 || error.status === 413) &&
        typeof error.body === 'string' &&
        error.body !== 'Session closed'
      ) {
        setError(error.body)
      } else {
        onError(error)
      }
    },
    [onError]
  )
  const openLoginLog = useCallback(
    (e: preact.TargetedEvent<HTMLFormElement>): void => {
      e.preventDefault()
      const data = new FormData(e.currentTarget)
      const count = util.toPositiveNumber(data.get('count'))
      if (count != null) setLogCount(count)
    },
    []
  )
  const closeLoginLog = useCallback(() => {
    setLogCount(undefined)
  }, [])
  const isOwner = useMemo(() => {
    return manifest?.owners?.includes(session.data.user) === true
  }, [manifest, session])
  const titleRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const startTimeRef = useRef<HTMLInputElement>(null)
  const endTimeRef = useRef<HTMLInputElement>(null)
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const handleSubmit = useCallback(() => {
    if (manifest == null || manifest.original == null) return
    if (titleRef.current?.reportValidity() === false) return
    if (emailRef.current?.reportValidity() === false) return
    if (startTimeRef.current?.reportValidity() === false) return
    if (endTimeRef.current?.reportValidity() === false) return
    const newManifest: api.Manifest = { ...manifest.original }
    if (titleRef.current != null && manifest.title !== undefined) {
      newManifest['title'] = titleRef.current.value.trim()
    }
    if (emailRef.current != null && manifest.email !== undefined) {
      if (emailRef.current.value !== '') {
        newManifest['email'] = emailRef.current.value
      } else {
        delete newManifest['email']
      }
    }
    if (startTimeRef.current != null && manifest.startTime !== undefined) {
      const value = startTimeRef.current.value
      if (value === unixTimeToDate(manifest.startTime)) {
        // do nothing
      } else if (value !== '') {
        newManifest['startTime'] = util.unixTimeFromString(`${value} 00:00:00`)
      } else {
        delete newManifest['startTime']
      }
    }
    if (endTimeRef.current != null && manifest.endTime !== undefined) {
      const value = endTimeRef.current.value
      if (value === unixTimeToDate(manifest.endTime)) {
        // do nothing
      } else if (value !== '') {
        newManifest['endTime'] = util.unixTimeFromString(`${value} 23:59:59`)
      } else {
        delete newManifest['endTime']
      }
    }
    if (commentRef.current != null && manifest.comment !== undefined) {
      const value = commentRef.current.value
      if (value !== '') {
        newManifest['comment'] = value
      } else {
        delete newManifest['comment']
      }
    }
    if (days != null) newManifest['days'] = days
    if (packages != null) newManifest['packages'] = packages
    if (users != null) newManifest['users'] = users
    setStable(false)
    void Promise.resolve()
      .then(async () => {
        await api.push(newManifest)
        window.location.assign('#')
      })
      .catch((error: unknown) => {
        setStable(true)
        handleError(error)
      })
  }, [handleError, manifest, days, packages, users])
  return (
    <>
      <h1>{repoName}</h1>
      <Loading data={manifest} />
      {manifest != null && (
        <div className="flavor-detail">
          {!isOwner && (
            <div className="notice">
              あなたはこのイメージの所有者でないためイメージの更新はできません。
            </div>
          )}
          <h2>所有者</h2>
          {manifest.owners === undefined ? (
            <p className="error">
              （不正な<code>owners</code>です）
            </p>
          ) : manifest.owners.length === 0 ? (
            <p>（未設定）</p>
          ) : (
            <p>{manifest.owners.join(', ')}</p>
          )}
          <h2>
            <label htmlFor="flavor-title">タイトル</label>
          </h2>
          <p>ログイン時のイメージ選択リストに表示されます。</p>
          {manifest.title === undefined ? (
            <p className="error">
              （不正な<code>title</code>です）
            </p>
          ) : (
            <p>
              <input
                id="flavor-title"
                type="text"
                defaultValue={manifest.title}
                readOnly={!isOwner}
                disabled={!stable}
                ref={titleRef}
              />
            </p>
          )}
          <h2>
            <label htmlFor="flavor-email">メールアドレス</label>
          </h2>
          <p>
            イメージのビルドに問題が生じたとき、
            ログがこのメールアドレスに送られます。
          </p>
          {manifest.email === undefined ? (
            <p className="error">
              （不正な<code>email</code>です）
            </p>
          ) : (
            <p>
              <input
                id="flavor-email"
                type="email"
                defaultValue={manifest.email ?? ''}
                readOnly={!isOwner}
                disabled={!stable}
                ref={emailRef}
              />
            </p>
          )}
          <h2>
            <label htmlFor="flavor-startTime">開始日</label>
          </h2>
          <p>
            授業開始日を入力してください。
            この日以降にこのイメージを選択できます。
          </p>
          {manifest.startTime === undefined ? (
            <p className="error">
              （不正な<code>startTime</code>です）
            </p>
          ) : (
            <p>
              <input
                type="date"
                readOnly={!isOwner}
                disabled={!stable}
                defaultValue={unixTimeToDate(manifest.startTime)}
                id="flavor-startTime"
                ref={startTimeRef}
              />
            </p>
          )}
          <h2>
            <label htmlFor="flavor-endTime">終了日</label>
          </h2>
          <p>
            授業終了日を入力してください。
            この日より後はこのイメージを選択できなくなります。
          </p>
          {manifest.endTime === undefined ? (
            <p className="error">
              （不正な<code>endTime</code>です）
            </p>
          ) : (
            <p>
              <input
                type="date"
                readOnly={!isOwner}
                disabled={!stable}
                defaultValue={unixTimeToDate(manifest.endTime)}
                id="flavor-endTime"
                ref={endTimeRef}
              />
            </p>
          )}
          <h2>開講曜日</h2>
          <p>授業が開講される曜日を選んでください。</p>
          {days === undefined ? (
            <p className="error">
              （不正な<code>days</code>です）
            </p>
          ) : (
            <DaysOfWeek
              days={days}
              setDays={setDays}
              readOnly={!isOwner || !stable}
            />
          )}
          <h2>パッケージ一覧</h2>
          <p>イメージに以下のパッケージをインストールします。</p>
          {packages === undefined ? (
            <p className="error">
              （不正な<code>packages</code>です）
            </p>
          ) : (
            <PackageList
              packages={packages}
              setPackages={setPackages}
              onError={handleError}
              readOnly={!isOwner || !stable}
            />
          )}
          <h2>追加ファイル一覧</h2>
          <p>イメージに以下のファイルを追加します。</p>
          <FileList
            files={files}
            setFiles={setFiles}
            onError={handleError}
            readOnly={!isOwner || !stable}
          />
          <h2>ユーザ一覧</h2>
          <p>
            以下のユーザがこのイメージを選択できます。
            チェックをつけると教える側のユーザと認識され、
            開始日/終了日の設定にかかわらず
            いつでもイメージを選択できるようになります。
          </p>
          {users === undefined ? (
            <p className="error">
              （不正な<code>users</code>です）
            </p>
          ) : (
            <UserList
              users={users}
              setUsers={setUsers}
              onError={handleError}
              readOnly={!isOwner || !stable}
            />
          )}
          <details>
            <summary>ログイン情報を取得する</summary>
            <form onSubmit={openLoginLog}>
              <div>
                最新
                <input
                  id="user-list-number-of-logs"
                  type="number"
                  name="count"
                  defaultValue={1000}
                  min={1}
                  max={99999}
                  size={6}
                  required={true}
                  disabled={!stable}
                />
                <label htmlFor="user-list-number-of-logs">件</label>のログを
                <input type="submit" value="読み込む" disabled={!stable} />
              </div>
            </form>
          </details>
          <h2>
            <label htmlFor="flavor-comment">コメント</label>
          </h2>
          <p>
            設定を変えずにリビルドするときは、
            その旨をコメントに書き加えてください。
          </p>
          <textarea
            id="flavor-comment"
            defaultValue={manifest.comment}
            readOnly={!isOwner}
            disabled={!stable}
            ref={commentRef}
          />
          <p className="update-flavor-button">
            {stable ? (
              <button disabled={!isOwner} onClick={handleSubmit}>
                イメージを更新
              </button>
            ) : (
              <SpinnerSmall />
            )}
          </p>
        </div>
      )}
      {stable && error != null && (
        <ModalOverlay title="ERROR" key={error} onClose={clearError}>
          <p className="error">{error}</p>
        </ModalOverlay>
      )}
      {stable && error == null && logCount != null && (
        <LoginLog
          repoName={repoName}
          users={users ?? []}
          count={logCount}
          onError={onError}
          onClose={closeLoginLog}
        />
      )}
    </>
  )
}
