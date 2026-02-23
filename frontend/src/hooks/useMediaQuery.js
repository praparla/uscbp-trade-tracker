import { useState, useEffect } from 'react'

/**
 * Hook to detect screen size breakpoints for responsive layouts.
 * Breakpoints match Tailwind's defaults: sm=640, md=768, lg=1024, xl=1280
 */
export function useMediaQuery() {
  const [screen, setScreen] = useState(() => getScreen())

  useEffect(() => {
    const handleResize = () => setScreen(getScreen())
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return screen
}

function getScreen() {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1024
  return {
    isMobile: w < 640,    // below sm
    isTablet: w >= 640 && w < 1024, // sm to lg
    isDesktop: w >= 1024, // lg+
    width: w,
  }
}
