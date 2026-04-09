'use client'

import { useTheme } from '@/components/providers/theme-provider'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface PropsToggleTema {
  className?: string
}

export function ToggleTema({ className }: PropsToggleTema) {
  const { theme, setTheme } = useTheme()
  const [montado, setMontado] = useState(false)

  useEffect(() => setMontado(true), [])

  if (!montado) return (
    <div className={cn('w-9 h-9 rounded-xl bg-background-subtle', className)} />
  )

  const esDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(esDark ? 'light' : 'dark')}
      aria-label={esDark ? 'Activar tema claro' : 'Activar tema oscuro'}
      className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center',
        'bg-background-subtle hover:bg-border border border-border',
        'text-foreground-muted hover:text-foreground',
        'transition-all duration-200 active:scale-95',
        className
      )}
    >
      {esDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
