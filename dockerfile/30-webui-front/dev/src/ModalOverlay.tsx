import { useCallback, useEffect, useState } from 'preact/hooks'

export const ModalOverlay: preact.FunctionComponent<{
  onClose?: () => void
  title?: preact.ComponentChildren
  disabled?: boolean
}> = ({ onClose, title, disabled, children }) => {
  const [visible, setVisible] = useState(true)
  const handleClick = useCallback(
    (e: Event): void => {
      if (e.target !== e.currentTarget) return
      e.preventDefault()
      if (disabled === true) return
      setVisible(false)
      if (onClose != null) onClose()
    },
    [onClose, disabled]
  )
  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : 'auto'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [visible])
  return (
    visible && (
      <div className="modal-overlay" onClick={handleClick}>
        <div className="modal-overlay-box-outer">
          {title != null && <h2>{title}</h2>}
          <div className="modal-overlay-box-inner">{children}</div>
          <div className="modal-overlay-buttons">
            <button onClick={handleClick} disabled={disabled ?? false}>
              閉じる
            </button>
          </div>
        </div>
      </div>
    )
  )
}
