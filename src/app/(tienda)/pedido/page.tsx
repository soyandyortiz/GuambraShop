'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Package } from 'lucide-react'

export default function PáginaBuscarPedido() {
  const router = useRouter()
  const [numero, setNumero] = useState('')

  function buscar(e: React.FormEvent) {
    e.preventDefault()
    const limpio = numero.trim().toUpperCase()
    if (!limpio) return
    router.push(`/pedido/${limpio}`)
  }

  return (
    <div className="max-w-sm mx-auto px-4 py-16 flex flex-col items-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Package className="w-8 h-8 text-primary" />
      </div>

      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">Seguimiento de pedido</h1>
        <p className="text-sm text-foreground-muted mt-1">
          Ingresa tu número de orden para ver el estado
        </p>
      </div>

      <form onSubmit={buscar} className="w-full flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="text"
            placeholder="Ej: ORD-00001"
            value={numero}
            onChange={e => setNumero(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-2xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary uppercase placeholder:normal-case placeholder:text-foreground-muted"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!numero.trim()}
          className="w-full h-12 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Ver estado del pedido
        </button>
      </form>

      <p className="text-xs text-foreground-muted text-center">
        El número de orden lo recibiste al confirmar tu compra.<br />
        Ejemplo: <span className="font-mono font-semibold">ORD-00001</span>
      </p>
    </div>
  )
}
