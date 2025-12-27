import { useCallback, useEffect, useState } from 'preact/hooks'
import { SelectPackage } from './SelectPackage'
import * as api from './api'
import { humanReadableCapacity } from './util'

const emptyPkgInfo: api.Pkginfo = { packages: {}, size: 0 }

export const PackageList: preact.FunctionComponent<{
  packages: readonly string[]
  setPackages: (packages: readonly string[]) => void
  onError: (error: unknown) => void
  readOnly?: boolean | undefined
}> = ({ packages, setPackages, onError, readOnly }) => {
  const [pkgInfo, setPkgInfo] = useState(emptyPkgInfo)
  useEffect(() => {
    if (packages.length === 0) return
    void api.pkginfo(packages).then(setPkgInfo, onError)
  }, [packages, onError])
  const addPackage = useCallback(
    ({ name, desc }: api.Search[number]): void => {
      if (packages.includes(name)) return
      setPackages([...packages, name])
      setPkgInfo(pkgInfo => ({
        packages: { ...pkgInfo.packages, [name]: { desc } },
        size: pkgInfo.size
      }))
    },
    [packages, setPackages]
  )
  const deletePackage = (name: string) => (): void => {
    setPackages(packages.filter(i => i !== name))
  }
  return (
    <div className="package-list">
      {packages.length > 0 && (
        <ul>
          {packages.map(name => (
            <li key={name}>
              <button onClick={deletePackage(name)} disabled={readOnly}>
                削除
              </button>
              <span>
                <span className="package-name">{name}</span>
                <span className="package-name-sep">:&nbsp;</span>
                <span className="package-desc">
                  {pkgInfo.packages[name]?.desc}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {pkgInfo.size > 0 && packages.length > 0 && (
        <div className="package-list-capacity-estimation">
          概算合計容量: {humanReadableCapacity(pkgInfo.size)}
        </div>
      )}
      <div className="package-list-add-package">
        <label htmlFor="package-list-add-package">追加</label>
        <SelectPackage
          id="package-list-add-package"
          onSelect={addPackage}
          disabled={readOnly}
          onError={onError}
        />
      </div>
    </div>
  )
}
