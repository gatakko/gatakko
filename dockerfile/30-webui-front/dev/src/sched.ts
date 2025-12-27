let sequence: PromiseLike<undefined> = Promise.resolve(undefined)
let bulksync: PromiseLike<undefined> = sequence

const ignore = (): undefined => undefined

// Launch f after all `sync`s are finished
export const para = <X>(f: () => PromiseLike<X>): PromiseLike<X> => {
  const promise = bulksync.then(() => f())
  const step = promise.then(ignore, ignore)
  sequence = sequence.then(() => step)
  return promise
}

// Launch f after all previously launched tasks are finished
export const seq = <X>(f: () => PromiseLike<X>): PromiseLike<X> => {
  const promise = sequence.then(() => f())
  const step = promise.then(ignore, ignore)
  sequence = sequence.then(() => step)
  return promise
}

// Same as `seq` but disallows launching other tasks until f is finished
export const sync = <X>(f: () => PromiseLike<X>): PromiseLike<X> => {
  const promise = sequence.then(() => f())
  const step = promise.then(ignore, ignore)
  sequence = sequence.then(() => step)
  bulksync = bulksync.then(() => step)
  return promise
}
