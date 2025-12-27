import { useEffect, useState } from 'preact/hooks'
import { Loading } from './Loading'
import * as api from './api'
import { ModalOverlay } from './ModalOverlay'

export const FlavorLog: preact.FunctionComponent<{
  repoName: string
  onError: (error: unknown) => void
}> = ({ repoName, onError }) => {
  const [log, setLog] = useState<string | undefined>()
  useEffect(() => {
    void api.log(repoName).then(setLog, onError)
  }, [repoName, onError])
  const handleClose = (): void => {
    window.location.assign('#')
  }
  return (
    <ModalOverlay onClose={handleClose} title={repoName}>
      <Loading data={log} />
      {log != null && <pre className="flavor-log">{log}</pre>}
    </ModalOverlay>
  )
}
