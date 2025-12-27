import { useCallback, useEffect, useState } from 'preact/hooks'
import { SpinnerSmall } from './Loading'
import * as api from './api'
import { useVisible, useTimeout } from './hook'

export const CiBadge: preact.FunctionComponent<{
  repoName: string
  onError: (error: unknown) => void
}> = ({ repoName, onError }) => {
  const [status, setStatus] = useState<api.Status | true>()
  const [visible, badgeRef] = useVisible<HTMLButtonElement>()
  const [live, setLive] = useState(false)
  const setTimer = useTimeout()
  useEffect(() => {
    if (status == null && visible) {
      void api.status(repoName).then(setStatus, onError)
      setStatus(true)
    } else if (typeof status === 'object' && !live) {
      const period = 'Status' in status ? 30000 : 10000
      setTimer(() => {
        setStatus(undefined)
        setLive(false)
      }, period)
      setLive(true)
    }
  }, [repoName, onError, status, visible, live, setTimer])
  const handleClick = useCallback(
    (e: Event): void => {
      e.stopPropagation()
      e.preventDefault()
      window.location.assign(`#/log/${repoName}`)
    },
    [repoName]
  )
  return (
    <span className="ci-badge" ref={badgeRef}>
      {typeof status !== 'object' ? (
        <SpinnerSmall />
      ) : status['Status'] === '0' ? (
        <button className="ci-badge-pass" onClick={handleClick}>
          PASS
        </button>
      ) : status['Status'] != null ? (
        <button className="ci-badge-fail" onClick={handleClick}>
          FAIL
        </button>
      ) : 'StartTime' in status ? (
        <button className="ci-badge-running" onClick={handleClick}>
          RUNNING
        </button>
      ) : 'QueueTime' in status ? (
        <button className="ci-badge-waiting" onClick={handleClick}>
          WAITING
        </button>
      ) : (
        <button className="ci-badge-none" onClick={handleClick}>
          NONE
        </button>
      )}
    </span>
  )
}
