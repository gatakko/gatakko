import { useEffect, useState } from 'preact/hooks'
import { CiBadge } from './CiBadge'
import { FlavorLog } from './FlavorLog'
import { ModalOverlay } from './ModalOverlay'
import { NewFlavor } from './NewFlavor'
import { Loading } from './Loading'
import * as api from './api'

type Flavor = [string, api.Flavors[string]]

const fetchFlavors = async (): Promise<Flavor[]> => {
  const flavors = await api.flavors()
  return Object.entries(flavors).sort((x, y) => {
    if (x[1] != null && y[1] == null) return -1
    if (x[1] == null && y[1] != null) return 1
    return x[0].localeCompare(y[0])
  })
}

export const FlavorList: preact.FunctionComponent<{
  onError: (error: unknown) => void
  hash: string
}> = ({ onError, hash }) => {
  const [flavors, setFlavors] = useState<readonly Flavor[]>()
  useEffect(() => {
    void fetchFlavors().then(setFlavors, onError)
  }, [onError])
  return (
    <div className="flavor-list">
      <h1>イメージ一覧</h1>
      <Loading data={flavors} />
      {flavors != null && (
        <div className="flavor-list">
          <ul>
            <li key={null} className="flavor-list-new-flavor">
              <a href="#/new">新しいイメージ</a>
            </li>
            {flavors.map(([name, flavor]) => (
              <li key={name} data-name={name}>
                <a href={`#${name}`}>
                  <span className="flavor-list-flavor-id">{name}</span>
                  <span className="flavor-list-flavor-title">
                    {flavor == null
                      ? '（このイメージは無効になっています）'
                      : flavor.title == null || flavor.title === ''
                        ? '（無題）'
                        : flavor.title}
                  </span>
                  <CiBadge repoName={name} onError={onError} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {hash === '/new' ? (
        <NewFlavor flavors={flavors} onError={onError} />
      ) : hash.startsWith('/log/') ? (
        <FlavorLog key={hash} repoName={hash.slice(5)} onError={onError} />
      ) : hash !== '' ? (
        <ModalOverlay disabled={true}>
          <p className="error">Page not found</p>
        </ModalOverlay>
      ) : undefined}
    </div>
  )
}
