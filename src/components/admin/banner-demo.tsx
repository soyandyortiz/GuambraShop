'use client'

import { FlaskConical } from 'lucide-react'

export function BannerDemo() {
  return (
    <div className="w-full bg-amber-400 text-amber-950 px-4 py-2 flex items-center justify-center gap-2 text-xs font-bold tracking-wide">
      <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
      MODO DEMO — Los cambios que realices NO se guardarán en la base de datos
    </div>
  )
}
