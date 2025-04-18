import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface PortalProps {
  children: React.ReactNode
  containerSelector?: string
}

const Portal = ({ children, containerSelector = 'body' }: PortalProps) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  return mounted
    ? createPortal(
        children,
        document.querySelector(containerSelector) || document.body
      )
    : null
}

export default Portal 