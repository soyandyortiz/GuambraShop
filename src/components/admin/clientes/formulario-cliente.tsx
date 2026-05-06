'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { obtenerRegiones, obtenerCiudades } from '@/lib/locales'
import type { Cliente, TipoIdentificacionCliente } from '@/types'

const esquema = z.object({
  tipo_identificacion: z.enum(['ruc', 'cedula', 'pasaporte', 'consumidor_final']),
  identificacion: z.string().min(1, 'Requerido'),
  razon_social: z.string().min(2, 'Mínimo 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefono: z.string().optional(),
  direccion: z.string().optional(),
  provincia: z.string().optional(),
  ciudad: z.string().optional(),
  notas: z.string().optional(),
})

type Datos = z.infer<typeof esquema>

const ETIQUETAS_TIPO: Record<TipoIdentificacionCliente, string> = {
  ruc:              'RUC',
  cedula:           'Cédula',
  pasaporte:        'Pasaporte',
  consumidor_final: 'Consumidor Final',
}

interface Props {
  abierto: boolean
  alCerrar: () => void
  cliente?: Cliente
  pais?: string
  alGuardar?: (cliente: Cliente) => void
}

export function FormularioCliente({ abierto, alCerrar, cliente, pais = 'EC', alGuardar }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      tipo_identificacion: 'cedula',
      identificacion: '',
      razon_social: '',
      email: '',
      telefono: '',
      direccion: '',
      provincia: '',
      ciudad: '',
      notas: '',
    },
  })

  const tipoId = watch('tipo_identificacion')
  const provincia = watch('provincia')
  const regiones = obtenerRegiones(pais)
  const ciudades = provincia ? obtenerCiudades(pais, provincia) : []

  useEffect(() => {
    if (cliente) {
      reset({
        tipo_identificacion: cliente.tipo_identificacion,
        identificacion:      cliente.identificacion,
        razon_social:        cliente.razon_social,
        email:               cliente.email ?? '',
        telefono:            cliente.telefono ?? '',
        direccion:           cliente.direccion ?? '',
        provincia:           cliente.provincia ?? '',
        ciudad:              cliente.ciudad ?? '',
        notas:               cliente.notas ?? '',
      })
    } else {
      reset({
        tipo_identificacion: 'cedula',
        identificacion: '',
        razon_social: '',
        email: '',
        telefono: '',
        direccion: '',
        provincia: '',
        ciudad: '',
        notas: '',
      })
    }
  }, [cliente, reset, abierto])

  useEffect(() => {
    if (tipoId === 'consumidor_final') {
      setValue('identificacion', '9999999999999')
      setValue('razon_social', 'Consumidor Final')
    }
  }, [tipoId, setValue])

  async function onSubmit(datos: Datos) {
    const supabase = crearClienteSupabase()
    const payload = {
      tipo_identificacion: datos.tipo_identificacion,
      identificacion:      datos.identificacion,
      razon_social:        datos.razon_social,
      email:               datos.email || null,
      telefono:            datos.telefono || null,
      direccion:           datos.direccion || null,
      provincia:           datos.provincia || null,
      ciudad:              datos.ciudad || null,
      notas:               datos.notas || null,
    }

    if (cliente) {
      const { error } = await supabase.from('clientes').update(payload).eq('id', cliente.id)
      if (error) { toast.error('Error al actualizar'); return }
      toast.success('Cliente actualizado')
      alGuardar?.({ ...cliente, ...payload })
    } else {
      const { data: nuevo, error } = await supabase
        .from('clientes')
        .insert(payload)
        .select()
        .single()
      if (error) { toast.error('Error al guardar'); return }
      toast.success('Cliente creado')
      alGuardar?.(nuevo as Cliente)
    }

    alCerrar()
    startTransition(() => router.refresh())
  }

  const claseInput = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'
  const claseLabel = 'text-xs font-medium text-foreground-muted'
  const claseError = 'text-[11px] text-danger mt-0.5'

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={cliente ? 'Editar cliente' : 'Nuevo cliente'}
      descripcion="Los datos de identificación se usan para facturación electrónica"
      tamaño="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

        {/* Tipo de identificación */}
        <div className="flex flex-col gap-1">
          <label className={claseLabel}>Tipo de identificación</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['cedula', 'ruc', 'pasaporte', 'consumidor_final'] as TipoIdentificacionCliente[]).map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setValue('tipo_identificacion', tipo)}
                className={`h-9 rounded-xl text-xs font-semibold border transition-all ${
                  tipoId === tipo
                    ? 'bg-primary text-white border-primary'
                    : 'bg-input-bg text-foreground-muted border-input-border hover:border-primary/50'
                }`}
              >
                {ETIQUETAS_TIPO[tipo]}
              </button>
            ))}
          </div>
        </div>

        {/* Identificación + Razón Social */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>
              {tipoId === 'ruc' ? 'RUC (13 dígitos)' :
               tipoId === 'cedula' ? 'Cédula (10 dígitos)' :
               tipoId === 'pasaporte' ? 'N.° de pasaporte' : 'Identificación'}
            </label>
            <input
              {...register('identificacion')}
              disabled={tipoId === 'consumidor_final'}
              placeholder={tipoId === 'ruc' ? '1234567890001' : tipoId === 'cedula' ? '1234567890' : ''}
              className={claseInput}
            />
            {errors.identificacion && <p className={claseError}>{errors.identificacion.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>Nombre / Razón social</label>
            <input
              {...register('razon_social')}
              disabled={tipoId === 'consumidor_final'}
              placeholder="Juan Pérez o Empresa S.A."
              className={claseInput}
            />
            {errors.razon_social && <p className={claseError}>{errors.razon_social.message}</p>}
          </div>
        </div>

        {/* Contacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="correo@ejemplo.com"
              className={claseInput}
            />
            {errors.email && <p className={claseError}>{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>Teléfono / WhatsApp</label>
            <input
              {...register('telefono')}
              placeholder="0987654321"
              className={claseInput}
            />
          </div>
        </div>

        {/* Dirección */}
        <div className="flex flex-col gap-1">
          <label className={claseLabel}>Dirección</label>
          <input
            {...register('direccion')}
            placeholder="Calle principal y secundaria, N.° 123"
            className={claseInput}
          />
        </div>

        {/* Provincia + Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>Provincia</label>
            <select
              {...register('provincia')}
              onChange={e => { setValue('provincia', e.target.value); setValue('ciudad', '') }}
              className={claseInput}
            >
              <option value="">Seleccionar…</option>
              {regiones.map(r => (
                <option key={r.nombre} value={r.nombre}>{r.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={claseLabel}>Ciudad</label>
            <select
              {...register('ciudad')}
              disabled={!provincia || ciudades.length === 0}
              className={claseInput}
            >
              <option value="">Seleccionar…</option>
              {ciudades.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Notas internas */}
        <div className="flex flex-col gap-1">
          <label className={claseLabel}>Notas internas</label>
          <textarea
            {...register('notas')}
            rows={2}
            placeholder="Observaciones sobre este cliente…"
            className="w-full px-3 py-2 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            type="button"
            onClick={alCerrar}
            className="h-9 px-4 rounded-xl border border-input-border text-sm text-foreground-muted hover:bg-background-subtle transition-all"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending}
            className="h-9 px-4 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
          >
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {cliente ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>

      </form>
    </Modal>
  )
}
