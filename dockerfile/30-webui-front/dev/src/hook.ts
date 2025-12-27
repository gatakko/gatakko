import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

/*
export const useEffectEvent = <A extends readonly unknown[], R>(
  fn: (...args: A) => R
): ((...args: A) => R) => {
  type F = (...args: A) => R
  const ref = useRef<F>()
  useLayoutEffect(() => {
    ref.current = fn
  }, [fn])
  return useCallback((...args: A): R => (ref.current as F)(...args), [])
}
*/

const deleteHash = (hash: string): string =>
  hash.startsWith('#') ? hash.slice(1) : hash

export const useHash = (): string => {
  const [hash, setHash] = useState<string>(() => {
    return deleteHash(window.location.hash)
  })
  useEffect(() => {
    const handleHashChange = (): void => {
      setHash(deleteHash(window.location.hash))
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])
  return hash
}

export const useVisible = <X extends Element>(): [
  boolean,
  preact.RefObject<X>
] => {
  const [visible, setVisible] = useState(false)
  const elemRef = useRef<X>(null)
  useEffect(() => {
    if (elemRef.current == null) return
    const observer = new IntersectionObserver(entries => {
      setVisible(entries[0] != null && entries[0].intersectionRatio > 0)
    })
    observer.observe(elemRef.current)
  }, [])
  return [visible, elemRef]
}

/*
export const useVisible = (ref: preact.RefObject<Element>): boolean => {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (ref.current == null) return
    const observer = new IntersectionObserver(entries => {
      setVisible(entries[0] != null && entries[0].intersectionRatio > 0)
    })
    observer.observe(ref.current)
  }, [ref])
  return visible
}
*/

export const useTimeout = (): {
  (callback: () => void, delay: number): void
  (callback?: null): void
} => {
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current != null) clearTimeout(timeoutIdRef.current)
    }
  }, [])
  return useCallback((callback?: (() => void) | null, delay?: number): void => {
    if (timeoutIdRef.current != null) clearTimeout(timeoutIdRef.current)
    timeoutIdRef.current = undefined
    if (callback == null) return
    timeoutIdRef.current = setTimeout(() => {
      timeoutIdRef.current = undefined
      callback()
    }, delay)
  }, [])
}

/*
export const useTimeout = (
  checkStart: () => readonly [() => void, number] | null | undefined,
  inputs?: readonly unknown[]
): void => {
  const timeoutId = useRef<number>()
  useEffect(() => {
    return () => {
      if (timeoutId.current != null) clearTimeout(timeoutId.current)
    }
  }, [])
  useEffect(() => {
    if (timeoutId.current != null) clearTimeout(timeoutId.current)
    timeoutId.current = undefined
    const callback = checkStart()
    if (callback == null) return
    timeoutId.current = setTimeout(() => {
      timeoutId.current = undefined
      callback[0]()
    }, callback[1])
  }, inputs)
}

export const useAsync = <X>(
  load: (set: (x: X | (() => X)) => void) => PromiseLike<X> | null | undefined,
  inputs?: readonly unknown[]
): X | undefined => {
  const [value, setValue] = useState<X>()
  useEffect(() => {
    void load(setValue)
  }, inputs)
  return value
  }
   */

/*
type UseStore<X> = <Y>(observe: (state: X) => Y) => Y
type SetStore<X> = (update: (state: X) => X) => void

export const createStore: {
  <X>(state: X): [UseStore<X>, SetStore<X>]
  <X = undefined>(): [UseStore<X | undefined>, SetStore<X | undefined>]
} = <X>(state?: X): [UseStore<X | undefined>, SetStore<X | undefined>] => {
  const listeners = new Set<() => void>()
  const setStore: SetStore<X | undefined> = update => {
    state = update(state)
    for (const f of listeners) f()
  }
  const useStore: UseStore<X | undefined> = observe => {
    const [value, setValue] = useState(() => observe(state))
    useEffect(() => {
      let prevValue = value
      const listener = (): void => {
        const newValue = observe(state)
        if (Object.is(prevValue, newValue)) return
        prevValue = newValue
        setValue(newValue)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [])
    return value
  }
  return [useStore, setStore]
}

export const useStore: {
  <X>(state: X, inputs?: readonly unknown[]): [UseStore<X>, SetStore<X>]
  <X = undefined>(): [UseStore<X | undefined>, SetStore<X | undefined>]
} = <X>(
  state?: X,
  inputs?: readonly unknown[]
): [UseStore<X | undefined>, SetStore<X | undefined>] =>
useMemo(() => createStore(state), inputs)
   */

/*
export const createStore = <X>(
  state: X
): [<Y>(observe: (state: X) => Y) => Y, (update: (state: X) => X) => void] => {
  const listeners = new Set<() => void>()
  const setStore = (update: (state: X) => X): void => {
    state = update(state)
    for (const f of listeners) f()
  }
  const useStore = <Y>(observe: (state: X) => Y): Y => {
    const [value, setValue] = useState(() => observe(state))
    useEffect(() => {
      let prevValue = value
      const listener = (): void => {
        const newValue = observe(state)
        if (Object.is(prevValue, newValue)) return
        prevValue = newValue
        setValue(newValue)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [])
    return value
  }
  return [useStore, setStore]
}

export const useStore = <X>(
  state: X
): [<Y>(observe: (state: X) => Y) => Y, (update: (state: X) => X) => void] =>
  useMemo(() => useStore(state))
   */

//export type UseStore<X> = <Y>(observe: (state: X) => Y) => Y
//type SetStore<X> = (update: (state: X) => Partial<X>) => unknown

/*
export const createStore = <X>(
  init: (set: (update: (state: X) => Partial<X>) => unknown) => X
): (<Y>(observe: (state: X) => Y) => Y) => {
  const listeners = new Set<() => void>()
  const set = (update: (state: X) => Partial<X>): void => {
    state = { ...state, ...update(state) }
    for (const f of listeners) f()
  }
  let state: X = init(set)
  return <Y>(observe: (state: X) => Y): Y => {
    const [value, setValue] = useState(() => observe(state))
    useEffect(() => {
      let prevValue = value
      const listener = (): void => {
        const newValue = observe(state)
        if (Object.is(prevValue, newValue)) return
        prevValue = newValue
        setValue(newValue)
      }
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    }, [])
    return value
  }
}

export const useStore = <X>(
  init: (set: (update: (state: X) => Partial<X>) => unknown) => X,
  inputs?: readonly unknown[]
): (<Y>(observe: (state: X) => Y) => Y) =>
  useMemo(() => createStore(init), inputs)
 */
