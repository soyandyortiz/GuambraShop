'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PropsModal {
  abierto: boolean
  alCerrar: () => void
  titulo?: string
  descripcion?: string
  children: React.ReactNode
  tamaño?: 'sm' | 'md' | 'lg'
}

export function Modal({ abierto, alCerrar, titulo, descripcion, children, tamaño = 'md' }: PropsModal) {
  const tamaños = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  }

  return (
    <Dialog.Root open={abierto} onOpenChange={(open) => !open && alCerrar()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/55 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            'w-[calc(100%-2rem)] rounded-2xl bg-card border border-card-border shadow-2xl p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            tamaños[tamaño]
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              {titulo && (
                <Dialog.Title className="text-lg font-semibold text-foreground">
                  {titulo}
                </Dialog.Title>
              )}
              {descripcion && (
                <Dialog.Description className="text-sm text-foreground-muted mt-1">
                  {descripcion}
                </Dialog.Description>
              )}
            </div>
            <button
              onClick={alCerrar}
              className="text-foreground-muted hover:text-foreground transition-colors p-1 rounded-lg hover:bg-background-subtle flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
