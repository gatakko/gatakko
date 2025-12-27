import { useCallback, useState, useRef } from 'preact/hooks'
import * as api from './api'
import { useTimeout } from './hook'

type HTMLEvent<X extends Element = HTMLElement> = preact.TargetedEvent<X>

const within = (index: number, max: number): number =>
  index < 0 ? 0 : max <= 0 ? 0 : index >= max ? max - 1 : index

const showItem = (listElement: Element, index: number): void => {
  const item = listElement.childNodes[index] as Element | undefined
  if (item == null) return
  item.scrollIntoView({ block: 'nearest' })
}

const indexOf = (elem: HTMLElement): number => {
  if (elem.dataset['index'] != null) {
    const index = parseInt(elem.dataset['index'])
    if (elem.parentNode?.childNodes[index] === elem) return index
  }
  return Array.from(elem.parentNode?.childNodes ?? []).indexOf(elem)
}

interface Request {
  readonly query: string
  readonly first: number
}

interface Search {
  readonly result: api.Search
  readonly first: number
  readonly next: boolean
}

const itemsPerPage = 50
const initialResult: Search = { result: [], first: 0, next: false }

const fetchSearch = async (request: Request): Promise<Search> => {
  const count = itemsPerPage + 1
  const result = await api.search(request.first, count, request.query)
  const next = result.length > itemsPerPage
  if (next) result.pop()
  return { result, first: request.first, next }
}

const useSearch = (
  delay: number,
  onError: (error: unknown) => void
): [Search, boolean, (query: string, page: number) => void] => {
  const [result, setResult] = useState<Search | undefined>()
  const [stable, setStable] = useState(true)
  const lastRequestRef = useRef<Request>()
  const setTimer = useTimeout()
  const requestSearch = useCallback(
    (query: string, first: number): void => {
      setTimer(undefined)
      if (query === '') {
        setResult(undefined)
      } else {
        const doSearch = async (request: Request): Promise<void> => {
          const result = await fetchSearch(request)
          if (lastRequestRef.current === request) {
            setResult(result)
            setStable(true)
          }
        }
        const request: Request = { query, first }
        const old = lastRequestRef.current
        lastRequestRef.current = request
        setStable(false)
        if (old?.query === query) {
          void doSearch(request).catch(onError)
        } else {
          setTimer(() => {
            void doSearch(request).catch(onError)
          }, delay)
        }
      }
    },
    [delay, onError, setTimer]
  )
  return [result ?? initialResult, stable, requestSearch]
}

export const SelectPackage: preact.FunctionComponent<{
  onSelect: (pkg: api.Search[number]) => void
  id?: string
  disabled?: boolean | undefined
  onError: (error: unknown) => void
}> = ({ onSelect, id, disabled, onError }) => {
  const [query, setQuery] = useState('')
  const [search, stable, requestSearch] = useSearch(250, onError)
  const [select, setSelect] = useState(0)
  const queryInputRef = useRef<HTMLInputElement>(null)
  const suggestList = useRef<HTMLUListElement>(null)
  const startSearch = useCallback(
    (query: string, first: number): void => {
      setSelect(0)
      requestSearch(query, first)
    },
    [requestSearch]
  )
  const updateQuery = useCallback(
    (query: string): void => {
      setQuery(query)
      startSearch(query, 0)
    },
    [startSearch]
  )
  const onInput = (event: HTMLEvent<HTMLInputElement>): void => {
    updateQuery(event.currentTarget.value)
  }
  const submit = useCallback(
    (index: number): void => {
      if (index < 0 || index >= search.result.length) return
      if (queryInputRef.current != null) queryInputRef.current.value = ''
      updateQuery('')
      onSelect(search.result[index] as api.Search[number])
    },
    [onSelect, search, updateQuery]
  )
  const toggleMidQuery = (event: HTMLEvent<HTMLInputElement>): void => {
    if (queryInputRef.current == null) return
    const newQuery = event.currentTarget.checked
      ? query.replace(/^(?:\.\*)?/, '.*')
      : query.replace(/^\.\*/, '')
    queryInputRef.current.focus()
    queryInputRef.current.value = newQuery
    updateQuery(newQuery)
  }
  const onMouseEnter = useCallback(
    (e: HTMLEvent): void => {
      if (stable) setSelect(indexOf(e.currentTarget))
    },
    [stable]
  )
  const onClick = useCallback(
    (e: HTMLEvent): void => {
      if (stable) submit(indexOf(e.currentTarget))
    },
    [stable, submit]
  )
  const onKeyDown = (event: KeyboardEvent): void => {
    const updateSelect = (index: number): void => {
      const newIndex = within(index, search.result.length)
      setSelect(newIndex)
      if (suggestList.current != null) showItem(suggestList.current, newIndex)
    }
    switch (event.key) {
      case 'ArrowDown':
        if (stable) updateSelect(select + 1)
        event.preventDefault()
        break
      case 'ArrowUp':
        if (stable) updateSelect(select - 1)
        event.preventDefault()
        break
      case 'Enter':
        if (stable) submit(select)
        event.preventDefault()
        break
    }
  }
  const goToPrevPage = (): void => {
    if (search.first < itemsPerPage || !stable) return
    startSearch(query, search.first - itemsPerPage)
  }
  const goToNextPage = (): void => {
    if (!search.next || !stable) return
    startSearch(query, search.first + itemsPerPage)
  }
  const isMidQuery = /^\s*\.\*/.test(query)
  return (
    <div className="select-package">
      <input
        id={id}
        type="text"
        onInput={onInput}
        onKeyDown={onKeyDown}
        placeholder="パッケージ検索クエリを入力"
        ref={queryInputRef}
        disabled={disabled}
      />
      {query.length > 0 && (
        <div className="select-package-suggest">
          <div className="select-package-suggest-header">
            <div>
              <label>
                <input
                  type="checkbox"
                  tabIndex={0}
                  onChange={toggleMidQuery}
                  checked={isMidQuery}
                />
                <span>途中に含むものを含める</span>
              </label>
            </div>
            <div>
              {search.result.length === 0 ? (
                <span>0件</span>
              ) : (
                <span>
                  {search.first + 1}〜{search.first + search.result.length}件目
                </span>
              )}
              <button
                onClick={goToPrevPage}
                aria-disabled={!stable}
                disabled={search.first === 0}
                className="previous-page"
                tabIndex={0}
              >
                前
              </button>
              <button
                onClick={goToNextPage}
                aria-disabled={!stable}
                disabled={!search.next}
                className="next-page"
                tabIndex={0}
              >
                次
              </button>
            </div>
          </div>
          <ul ref={suggestList}>
            {search.result.map(({ name, desc }, index) => (
              <li
                key={name}
                data-index={index}
                onMouseEnter={onMouseEnter}
                onClick={onClick}
                className={stable && select === index ? 'selected' : undefined}
              >
                <span className="package-name">{name}</span>
                <span className="package-name-sep">:&nbsp;</span>
                <span className="package-desc">{desc}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
