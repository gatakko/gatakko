export const SpinnerLarge: preact.FunctionComponent = () => (
  <span className="loading-spinner-large"></span>
)

export const SpinnerSmall: preact.FunctionComponent = () => (
  <span className="loading-spinner-small"></span>
)

export const Loading: preact.FunctionComponent<{
  data?: unknown
}> = ({ data, children }) =>
  data !== undefined ? (
    children
  ) : (
    <div className="loading">
      <SpinnerLarge />
    </div>
  )
