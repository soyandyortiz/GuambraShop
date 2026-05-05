'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { toast } from 'sonner'
import { Save, Upload, X, Eye, EyeOff } from 'lucide-react'
import type { ConfiguracionFacturacion, AmbienteSRI } from '@/types'

interface Props {
  config: ConfiguracionFacturacion | null
}

export function FormularioConfigSRI({ config }: Props) {
  const router = useRouter()
  const supabase = crearClienteSupabase()
  const fileRef = useRef<HTMLInputElement>(null)

  const [guardando, setGuardando] = useState(false)
  const [mostrarPin, setMostrarPin] = useState(false)
  const [archivoP12, setArchivoP12] = useState<File | null>(null)

  const [form, setForm] = useState({
    ruc:                    config?.ruc ?? '',
    razon_social:           config?.razon_social ?? '',
    nombre_comercial:       config?.nombre_comercial ?? '',
    direccion_matriz:       config?.direccion_matriz ?? '',
    codigo_establecimiento: config?.codigo_establecimiento ?? '001',
    punto_emision:          config?.punto_emision ?? '001',
    ambiente:               (config?.ambiente ?? 'pruebas') as AmbienteSRI,
    obligado_contabilidad:  config?.obligado_contabilidad ?? false,
    tipo_contribuyente:     (config?.tipo_contribuyente ?? 'ruc') as 'ruc' | 'rimpe_emprendedor' | 'artesano',
    tarifa_iva:             config?.tarifa_iva ?? 15,
    contribuyente_especial: config?.contribuyente_especial ?? '',
    cert_p12_url:           config?.cert_p12_url ?? '',
    cert_pin:               config?.cert_pin ?? '',
  })

  function cambiar(campo: string, valor: string | boolean | number) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function subirCertificado(): Promise<string | null> {
    if (!archivoP12) return form.cert_p12_url || null

    const nombreArchivo = `certificados/${form.ruc}_${Date.now()}.p12`
    const { error } = await supabase.storage
      .from('facturacion')
      .upload(nombreArchivo, archivoP12, { upsert: true })

    if (error) {
      toast.error('Error al subir el certificado')
      return null
    }

    const { data } = supabase.storage.from('facturacion').getPublicUrl(nombreArchivo)
    return data.publicUrl
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.ruc || !form.razon_social || !form.direccion_matriz) {
      toast.error('RUC, razón social y dirección son obligatorios')
      return
    }
    if (form.ruc.length !== 13) {
      toast.error('El RUC debe tener 13 dígitos')
      return
    }

    setGuardando(true)
    try {
      const certUrl = await subirCertificado()
      if (archivoP12 && !certUrl) { setGuardando(false); return }

      const regimenLabel: Record<string, string> = {
        ruc:               'GENERAL',
        rimpe_emprendedor: 'RIMPE EMPRENDEDOR',
        artesano:          'ARTESANO CALIFICADO',
      }
      const payload = {
        ruc:                    form.ruc,
        razon_social:           form.razon_social,
        nombre_comercial:       form.nombre_comercial || null,
        direccion_matriz:       form.direccion_matriz,
        codigo_establecimiento: form.codigo_establecimiento.padStart(3, '0'),
        punto_emision:          form.punto_emision.padStart(3, '0'),
        ambiente:               form.ambiente,
        obligado_contabilidad:  form.obligado_contabilidad,
        tipo_contribuyente:     form.tipo_contribuyente,
        tarifa_iva:             Number(form.tarifa_iva),
        contribuyente_especial: form.contribuyente_especial || null,
        regimen:                regimenLabel[form.tipo_contribuyente] ?? null,
        cert_p12_url:           certUrl,
        cert_pin:               form.cert_pin || null,
      }

      let error
      if (config) {
        ;({ error } = await supabase.from('configuracion_facturacion').update(payload).eq('id', config.id))
      } else {
        ;({ error } = await supabase.from('configuracion_facturacion').insert(payload))
      }

      if (error) throw error

      toast.success('Configuración guardada')
      router.push('/admin/dashboard/facturacion')
      router.refresh()
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <form onSubmit={guardar} className="space-y-6">

      {/* Datos del contribuyente */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Datos del contribuyente</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground-muted block mb-1">RUC *</label>
            <input
              type="text"
              maxLength={13}
              value={form.ruc}
              onChange={e => cambiar('ruc', e.target.value.replace(/\D/g, ''))}
              placeholder="1712345678001"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground-muted block mb-1">Razón social *</label>
            <input
              type="text"
              value={form.razon_social}
              onChange={e => cambiar('razon_social', e.target.value.toUpperCase())}
              placeholder="COMERCIAL EJEMPLO S.A."
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
              required
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground-muted block mb-1">Nombre comercial</label>
            <input
              type="text"
              value={form.nombre_comercial}
              onChange={e => cambiar('nombre_comercial', e.target.value)}
              placeholder="Mi Tienda Online"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-foreground-muted block mb-1">Dirección matriz *</label>
            <input
              type="text"
              value={form.direccion_matriz}
              onChange={e => cambiar('direccion_matriz', e.target.value)}
              placeholder="Av. Principal 123, Quito"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              required
            />
          </div>
        </div>
      </section>

      {/* Configuración de emisión */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Configuración de emisión</h2>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Establecimiento</label>
            <input
              type="text"
              maxLength={3}
              value={form.codigo_establecimiento}
              onChange={e => cambiar('codigo_establecimiento', e.target.value.replace(/\D/g, ''))}
              placeholder="001"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">Punto emisión</label>
            <input
              type="text"
              maxLength={3}
              value={form.punto_emision}
              onChange={e => cambiar('punto_emision', e.target.value.replace(/\D/g, ''))}
              placeholder="001"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground-muted block mb-1">IVA (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.tarifa_iva}
              onChange={e => cambiar('tarifa_iva', Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Ambiente */}
        <div>
          <label className="text-xs font-medium text-foreground-muted block mb-2">Ambiente SRI</label>
          <div className="flex gap-3">
            {(['pruebas', 'produccion'] as AmbienteSRI[]).map(a => (
              <button
                key={a}
                type="button"
                onClick={() => cambiar('ambiente', a)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                  form.ambiente === a
                    ? a === 'produccion'
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-amber-400 bg-amber-50 text-amber-800'
                    : 'border-border text-foreground-muted hover:bg-background-subtle'
                }`}
              >
                {a === 'pruebas' ? '🧪 Pruebas' : '🚀 Producción'}
              </button>
            ))}
          </div>
          {form.ambiente === 'produccion' && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
              ⚠️ En producción las facturas son válidas legalmente y no se pueden anular fácilmente. Asegúrate de que todo esté correcto.
            </p>
          )}
        </div>

        {/* Tipo de contribuyente */}
        <div>
          <label className="text-xs font-medium text-foreground-muted block mb-2">Tipo de contribuyente</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {([
              { val: 'ruc',               label: 'RUC General',              desc: 'Persona natural o sociedad — régimen general o especial' },
              { val: 'rimpe_emprendedor', label: 'RIMPE Emprendedor',         desc: 'Hasta $300.000 de ingresos — emite facturas con IVA' },
              { val: 'artesano',          label: 'Artesano calificado (JNDA)', desc: 'Certificado JNDA — IVA 0% en productos artesanales' },
            ] as { val: string; label: string; desc: string }[]).map(op => (
              <button
                key={op.val}
                type="button"
                onClick={() => cambiar('tipo_contribuyente', op.val)}
                className={`text-left px-3 py-3 rounded-xl border-2 transition-all ${
                  form.tipo_contribuyente === op.val
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border text-foreground-muted hover:border-primary/40 bg-background'
                }`}
              >
                <p className="text-xs font-bold">{op.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{op.desc}</p>
              </button>
            ))}
          </div>
          {form.tipo_contribuyente === 'artesano' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-2">
              Los productos marcados con IVA &quot;Global&quot; usarán automáticamente 0% al ser un artesano calificado.
            </p>
          )}
        </div>

        {/* Checkboxes */}
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.obligado_contabilidad}
              onChange={e => cambiar('obligado_contabilidad', e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-sm text-foreground">Obligado a llevar contabilidad</span>
          </label>
        </div>

        {/* N° Contribuyente especial */}
        <div>
          <label className="text-xs font-medium text-foreground-muted block mb-1">
            N° Contribuyente especial <span className="text-foreground-muted/60">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.contribuyente_especial}
            onChange={e => cambiar('contribuyente_especial', e.target.value)}
            placeholder="Dejar vacío si no aplica"
            className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </section>

      {/* Certificado digital */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Certificado digital (.p12)</h2>
          <p className="text-xs text-foreground-muted mt-0.5">
            El certificado de firma electrónica emitido por el BCE o ANF. Requerido para firmar facturas.
          </p>
        </div>

        {/* Archivo P12 */}
        <div>
          <input
            ref={fileRef}
            type="file"
            accept=".p12,.pfx"
            className="hidden"
            onChange={e => setArchivoP12(e.target.files?.[0] ?? null)}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border hover:border-primary hover:bg-primary/5 text-sm text-foreground-muted hover:text-primary transition-all"
            >
              <Upload className="w-4 h-4" />
              {archivoP12 ? archivoP12.name : 'Seleccionar archivo .p12'}
            </button>
            {archivoP12 && (
              <button type="button" onClick={() => setArchivoP12(null)} className="text-foreground-muted hover:text-danger">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {config?.cert_p12_url && !archivoP12 && (
            <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Certificado cargado. Sube uno nuevo para reemplazarlo.
            </p>
          )}
        </div>

        {/* PIN */}
        <div>
          <label className="text-xs font-medium text-foreground-muted block mb-1">PIN del certificado</label>
          <div className="relative">
            <input
              type={mostrarPin ? 'text' : 'password'}
              value={form.cert_pin}
              onChange={e => cambiar('cert_pin', e.target.value)}
              placeholder="Contraseña del archivo .p12"
              className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => setMostrarPin(!mostrarPin)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            >
              {mostrarPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </section>

      {/* Botones */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={guardando}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-hover disabled:opacity-50 transition-all shadow-sm"
        >
          <Save className="w-4 h-4" />
          {guardando ? 'Guardando…' : 'Guardar configuración'}
        </button>
      </div>
    </form>
  )
}
