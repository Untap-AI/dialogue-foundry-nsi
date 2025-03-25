import { useState, useEffect } from 'react'
import { Widget } from './Widget'
import type { WidgetProps } from './Widget'

export interface AnimatedWidgetProps extends WidgetProps {
  initialDelay?: number
  pulseButton?: boolean
}

export const AnimatedWidget = ({
  initialDelay = 3000,
  pulseButton = true,
  ...widgetProps
}: AnimatedWidgetProps) => {
  const [visible, setVisible] = useState(false)
  const [showNotificationDot, setShowNotificationDot] = useState(false)

  // Show widget after initial delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(true)
    }, initialDelay)

    return () => {
      clearTimeout(timer)
    }
  }, [initialDelay])

  // Add notification dot after widget is visible
  useEffect(() => {
    if (visible && pulseButton) {
      const timer = setTimeout(() => {
        setShowNotificationDot(true)
      }, 1500)

      return () => {
        clearTimeout(timer)
      }
    }

    return () => {}
  }, [visible, pulseButton])

  if (!visible) return undefined

  return (
    <div
      className={`transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <Widget {...widgetProps} showNotificationDot={showNotificationDot} />
    </div>
  )
}
