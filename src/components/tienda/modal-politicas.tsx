'use client'

import { useState } from 'react'
import { FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  politicas: string
}

export function ModalPoliticas({ politicas }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="mt-5">
      <button
        onClick={() => setAbierto(true)}
        className="w-full flex items-center justify-between p-4 rounded-2xl bg-card border border-card-border hover:border-primary/30 hover:shadow-sm transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
            <FileText className="w-5 h-5" />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-foreground">Políticas del negocio</p>
            <p className="text-xs text-foreground-muted">Términos, devoluciones y envíos</p>
          </div>
        </div>
        <div className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg bg-primary/5 group-hover:bg-primary/10 transition-colors">
          Leer más
        </div>
      </button>

      {/* Modal */}
      {abierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
            onClick={() => setAbierto(false)}
          />
          
          {/* Contenido */}
          <div className="relative w-full max-w-lg bg-background rounded-t-[2rem] sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-bold text-foreground">Políticas del negocio</h2>
              </div>
              <button 
                onClick={() => setAbierto(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-background-subtle transition-colors"
              >
                <X className="w-5 h-5 text-foreground-muted" />
              </button>
            </div>
            
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="prose prose-sm max-w-none text-foreground-muted leading-relaxed whitespace-pre-wrap">
                {politicas}
              </div>
            </div>

            <div className="p-4 sm:p-6 bg-background-subtle border-t border-border">
              <button
                onClick={() => setAbierto(false)}
                className="w-full h-12 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 transition-all shadow-md active:scale-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
