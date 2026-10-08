import { useState, useEffect, useRef } from 'react'

// Counts down `seconds` while `running`, restarting whenever `resetKey` changes.
// Returns seconds left (null when not running) and calls onExpire once at zero.
export function useCountdown(seconds, running, resetKey, onExpire) {
  const [tick, setTick] = useState({ key: null, left: seconds })
  const expireRef = useRef(onExpire)
  useEffect(() => { expireRef.current = onExpire })

  useEffect(() => {
    if (!running) return
    const deadline = Date.now() + seconds * 1000
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setTick({ key: resetKey, left })
      if (left === 0) {
        clearInterval(id)
        expireRef.current()
      }
    }, 200)
    return () => clearInterval(id)
  }, [seconds, running, resetKey])

  if (!running) return null
  return tick.key === resetKey ? tick.left : seconds
}
