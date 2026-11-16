import { useCallback, useRef, useState } from 'react'

/**
 * Защита от повторной отправки формы.
 *
 * Кнопка блокируется через `pending`, но React применит это только после перерисовки:
 * второй клик или Enter в ту же миллисекунду успел бы отправить запрос ещё раз.
 * Поэтому флаг «запрос уже идёт» хранится в ref и проверяется синхронно.
 */
export function useSingleFlight() {
  const inFlight = useRef(false)
  const [pending, setPending] = useState(false)

  const run = useCallback(async (task: () => Promise<void>) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(true)
    try {
      await task()
    } finally {
      inFlight.current = false
      setPending(false)
    }
  }, [])

  return { pending, run }
}
