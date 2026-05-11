'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'

interface Props {
  pedidoId: string
  tieneComprobante: boolean
}

export function AccionesComprobante({ pedidoId, tieneComprobante }: Props) {
  const router = useRouter()
  const [confirmando, setConfirmando] = useState(false)
  const [rechazando, setRechazando] = useState(false)

  async function confirmarPago() {
    setConfirmando(true)
    const supabase = crearClienteSupabase()

    const { error } = await supabase.rpc('confirmar_pedido', { p_pedido_id: pedidoId })
    if (error) {
      toast.error('Error al confirmar el pedido')
      setConfirmando(false)
      return
    }

    if (tieneComprobante) {
      await supabase.rpc('marcar_comprobante_para_eliminar', { p_pedido_id: pedidoId })
    }

    toast.success('Pago confirmado — pedido en procesando')
    router.refresh()
    router.push('/admin/dashboard/pedidos')
  }

  async function rechazarPedido() {
    if (!confirm('¿Rechazar este pedido? Se marcará como cancelado.')) return
    setRechazando(true)
    const supabase = crearClienteSupabase()

    const { error } = await supabase
      .from('pedidos')
      .update({ estado: 'cancelado' })
      .eq('id', pedidoId)

    if (error) {
      toast.error('Error al rechazar el pedido')
      setRechazando(false)
      return
    }

    toast.success('Pedido rechazado y cancelado')
    router.refresh()
    router.push('/admin/dashboard/pedidos')
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={confirmarPago}
        disabled={confirmando || rechazando}
        className="flex items-center gap-2 h-10 px-5 rounded-xl bg-success text-white text-sm font-bold hover:bg-success/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {confirmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        Confirmar pago
      </button>

      <button
        onClick={rechazarPedido}
        disabled={confirmando || rechazando}
        className="flex items-center gap-2 h-10 px-5 rounded-xl border border-danger text-danger text-sm font-bold hover:bg-danger/5 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {rechazando ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
        Rechazar
      </button>
    </div>
  )
}
