'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

declare global {
  interface Window {
    paypal?: {
      Buttons: (opts: {
        createOrder: () => Promise<string>
        onApprove: (data: { orderID: string }) => Promise<void>
        onError: (err: unknown) => void
        onCancel?: () => void
        style?: Record<string, string | number>
      }) => { render: (el: HTMLElement) => void }
    }
  }
}

interface Props {
  clientId: string
  currency: string
  numeroTemporal: string
  onSuccess: (data: { numero_orden: string }) => void
  onError: (msg: string) => void
}

export function PayPalBotones({ clientId, currency, numeroTemporal, onSuccess, onError }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [cargando, setCargando] = useState(true)
  const [errorScript, setErrorScript] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId || !containerRef.current) return

    // Limpiar script anterior y container
    const anterior = document.getElementById('paypal-sdk-script')
    if (anterior) anterior.remove()
    if (containerRef.current) containerRef.current.innerHTML = ''

    setCargando(true)
    setErrorScript(null)

    const script = document.createElement('script')
    script.id = 'paypal-sdk-script'
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`
    script.async = true

    script.onload = () => {
      if (!containerRef.current || !window.paypal) {
        setCargando(false)
        return
      }

      setCargando(false)

      window.paypal.Buttons({
        createOrder: async () => {
          const res = await fetch('/api/pedidos/paypal/crear-orden', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero_temporal: numeroTemporal }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Error al crear orden PayPal')
          return data.paypal_order_id as string
        },
        onApprove: async (data) => {
          const res = await fetch('/api/pedidos/paypal/capturar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paypal_order_id: data.orderID,
              numero_temporal: numeroTemporal,
            }),
          })
          const resData = await res.json()
          if (!res.ok) {
            onError(resData.error ?? 'Error al capturar el pago')
            return
          }
          onSuccess({ numero_orden: resData.numero_orden })
        },
        onError: () => {
          onError('Ocurrió un error en el pago con PayPal. Intenta nuevamente.')
        },
        onCancel: () => { /* usuario canceló, no hacer nada */ },
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
      }).render(containerRef.current)
    }

    script.onerror = () => {
      setCargando(false)
      setErrorScript('No se pudo cargar PayPal. Verifica tu conexión e intenta nuevamente.')
    }

    document.body.appendChild(script)
  }, [clientId, currency, numeroTemporal]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full">
      {cargando && (
        <div className="flex items-center justify-center gap-2 py-6 text-foreground-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Cargando PayPal…</span>
        </div>
      )}
      {errorScript && (
        <p className="text-sm text-danger text-center py-3">{errorScript}</p>
      )}
      <div ref={containerRef} className="w-full min-h-[44px]" />
    </div>
  )
}
