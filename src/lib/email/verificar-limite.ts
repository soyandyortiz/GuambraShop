/**
 * Verifica si se puede enviar un email según los límites del proveedor.
 * Los límites se renuevan automáticamente: diario a medianoche, mensual el 1° de cada mes.
 */

import { createClient } from '@supabase/supabase-js'
import type { ProveedorEmail } from '@/types'

// Límites por proveedor (se bloquea 1 antes del tope para evitar errores del proveedor)
const LIMITE_DIA: Record<ProveedorEmail, number> = {
  gmail:  499,
  smtp:   199,
  resend: 99,
}
const LIMITE_MES_RESEND = 2999

function crearAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface ResultadoVerificacion {
  permitido: boolean
  motivo?: string
  enviosHoy: number
  enviosMes: number
  limiteDia: number
  limiteMes: number | null
}

export async function verificarLimiteEmail(): Promise<ResultadoVerificacion> {
  const admin = crearAdmin()

  const { data: cfg } = await admin
    .from('configuracion_email')
    .select('proveedor, activo')
    .single()

  if (!cfg?.activo) {
    return { permitido: false, motivo: 'El envío de emails no está activado', enviosHoy: 0, enviosMes: 0, limiteDia: 0, limiteMes: null }
  }

  const proveedor = cfg.proveedor as ProveedorEmail
  const limiteDia = LIMITE_DIA[proveedor]
  const limiteMes = proveedor === 'resend' ? LIMITE_MES_RESEND : null

  const ahora     = new Date()
  const hoy       = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).toISOString()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

  const [
    { count: facturasHoy },
    { count: facturasMes },
    { count: proformasHoy },
    { count: proformasMes },
  ] = await Promise.all([
    admin.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy),
    admin.from('facturas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', inicioMes),
    admin.from('proformas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', hoy),
    admin.from('proformas').select('*', { count: 'exact', head: true }).gte('email_enviado_en', inicioMes),
  ])

  const enviosHoy = (facturasHoy ?? 0) + (proformasHoy ?? 0)
  const enviosMes = (facturasMes ?? 0) + (proformasMes ?? 0)

  if (enviosHoy >= limiteDia) {
    return {
      permitido: false,
      motivo:    `Límite diario alcanzado (${enviosHoy}/${limiteDia + 1} emails hoy). Se renueva automáticamente a medianoche.`,
      enviosHoy, enviosMes, limiteDia, limiteMes,
    }
  }

  if (limiteMes !== null && enviosMes >= limiteMes) {
    return {
      permitido: false,
      motivo:    `Límite mensual de Resend alcanzado (${enviosMes}/${limiteMes + 1} emails este mes). Se renueva el 1° del próximo mes.`,
      enviosHoy, enviosMes, limiteDia, limiteMes,
    }
  }

  return { permitido: true, enviosHoy, enviosMes, limiteDia, limiteMes }
}
