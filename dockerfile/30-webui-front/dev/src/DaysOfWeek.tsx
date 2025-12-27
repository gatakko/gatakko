import { useCallback, useMemo } from 'preact/hooks'

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6

const isDay = (n: number): n is Day => n >= 0 && n <= 6

export const DaysOfWeek: preact.FunctionComponent<{
  days: readonly Day[]
  setDays: (days: readonly Day[]) => void
  readOnly?: boolean | undefined
}> = ({ days, setDays, readOnly }) => {
  const daySet = useMemo(() => new Set<number>(days), [days])
  const handleClick = useCallback(
    (e: preact.TargetedEvent<HTMLInputElement>): void => {
      const value = parseInt(e.currentTarget.value)
      if (!isDay(value)) return
      if (e.currentTarget.checked) {
        setDays([...new Set([...days, value])])
      } else {
        setDays(days.filter(i => i !== value))
      }
    },
    [days, setDays]
  )
  return (
    <div className="days-of-week">
      <ul>
        {(['日', '月', '火', '水', '木', '金', '土'] as const).map((day, i) => (
          <li key={day}>
            <label>
              <input
                type="checkbox"
                name="day"
                value={i}
                checked={daySet.has(i)}
                onClick={handleClick}
                disabled={readOnly}
              />
              <span>{day}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
