'use client'

import { useState, useTransition, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, Store, Image as ImageIcon, MapPin, Share2, User, Star, Palette, Hash, Eye, EyeOff, Lock, Pencil, GripVertical, Calendar, CreditCard, Landmark, Clock, Users } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { SubidorImagenes } from '@/components/ui/subidor-imagenes'
import { cn } from '@/lib/utils'
import { PALETAS } from '@/lib/paletas'
import { TEMAS, obtenerTema } from '@/lib/temas'

// ─── Tipos ───────────────────────────────────────────────────
interface HorarioDia {
  dia: number      // 1=Lun … 7=Dom
  nombre: string
  apertura: string
  cierre: string
  abierto: boolean
}

interface ConfigTienda {
  id: string
  nombre_tienda: string
  descripcion: string | null
  logo_url: string | null
  favicon_url: string | null
  foto_perfil_url: string | null
  foto_portada_url: string | null
  color_primario: string | null
  tema_id: string | null
  whatsapp: string | null
  moneda: string
  simbolo_moneda: string
  pais: string | null
  politicas_negocio: string | null
  meta_descripcion: string | null
  habilitar_citas: boolean
  hora_apertura: string
  hora_cierre: string
  duracion_cita_minutos: number
  capacidad_citas_simultaneas: number
  seleccion_empleado: boolean
  horario_atencion: HorarioDia[] | null
}

interface EmpleadoCita {
  id: string
  nombre_completo: string
  activo: boolean
  orden: number
}

interface Direccion {
  id: string
  etiqueta: string
  direccion: string
  ciudad: string | null
  provincia: string | null
  pais: string
  es_principal: boolean
  enlace_mapa: string | null
}

interface RedSocial {
  id: string
  plataforma: string
  url: string
  esta_activa: boolean
  orden: number
}

interface Perfil {
  id: string
  nombre: string | null
  telefono: string | null
}

interface MetodoPago {
  id: string
  banco: string
  tipo_cuenta: 'corriente' | 'ahorros'
  numero_cuenta: string
  cedula_titular: string
  nombre_titular: string
  esta_activo: boolean
  orden: number
}

interface Props {
  config: ConfigTienda
  direcciones: Direccion[]
  redes: RedSocial[]
  perfil: Perfil
  rol: string
  metodosPago: MetodoPago[]
  empleados: EmpleadoCita[]
}

// ─── Schemas ─────────────────────────────────────────────────
const schemaGeneral = z.object({
  nombre_tienda: z.string().min(2, 'Mínimo 2 caracteres'),
  descripcion: z.string().optional(),
  whatsapp: z.string().optional(),
  moneda: z.string().min(1),
  simbolo_moneda: z.string().min(1),
  pais: z.enum(['EC', 'PE', 'CO']),
  meta_descripcion: z.string().optional(),
  politicas_negocio: z.string().optional(),
})

const schemaMiCuenta = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono: z.string().optional(),
})

const schemaDireccion = z.object({
  etiqueta: z.string().min(2),
  direccion: z.string().min(5),
  ciudad: z.string().optional(),
  provincia: z.string().optional(),
  pais: z.string().min(2),
  es_principal: z.boolean(),
  enlace_mapa: z.string().optional(),
})

const schemaRed = z.object({
  plataforma: z.enum(['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'pinterest', 'linkedin', 'snapchat', 'whatsapp']),
  url: z.string().url('URL inválida'),
  esta_activa: z.boolean(),
  orden: z.string(),
})

type CamposGeneral = z.infer<typeof schemaGeneral>
type CamposMiCuenta = z.infer<typeof schemaMiCuenta>
type CamposDireccion = z.infer<typeof schemaDireccion>
type CamposRed = z.infer<typeof schemaRed>

const schemaCitas = z.object({
  habilitar_citas: z.boolean(),
  hora_apertura: z.string().min(1),
  hora_cierre: z.string().min(1),
  duracion_cita_minutos: z.number().min(5),
  capacidad_citas_simultaneas: z.number().min(1).max(50),
  seleccion_empleado: z.boolean(),
})
type CamposCitas = z.infer<typeof schemaCitas>

// ─── Tabs ────────────────────────────────────────────────────
const TABS = [
  { id: 'general',     label: 'General',        icon: Store      },
  { id: 'horario',     label: 'Horario',         icon: Clock      },
  { id: 'citas',       label: 'Citas',           icon: Calendar   },
  { id: 'pagos',       label: 'Métodos de pago', icon: CreditCard },
  { id: 'imagenes',    label: 'Imágenes',        icon: ImageIcon  },
  { id: 'colores',     label: 'Colores',         icon: Palette    },
  { id: 'direcciones', label: 'Direcciones',     icon: MapPin     },
  { id: 'redes',       label: 'Redes',           icon: Share2     },
  { id: 'micuenta',    label: 'Mi cuenta',       icon: User       },
]

// ─── Horario por defecto ──────────────────────────────────────
const HORARIO_DEFAULT: HorarioDia[] = [
  { dia: 1, nombre: 'Lunes',     apertura: '09:00', cierre: '18:00', abierto: true  },
  { dia: 2, nombre: 'Martes',    apertura: '09:00', cierre: '18:00', abierto: true  },
  { dia: 3, nombre: 'Miércoles', apertura: '09:00', cierre: '18:00', abierto: true  },
  { dia: 4, nombre: 'Jueves',    apertura: '09:00', cierre: '18:00', abierto: true  },
  { dia: 5, nombre: 'Viernes',   apertura: '09:00', cierre: '18:00', abierto: true  },
  { dia: 6, nombre: 'Sábado',    apertura: '09:00', cierre: '14:00', abierto: true  },
  { dia: 7, nombre: 'Domingo',   apertura: '09:00', cierre: '13:00', abierto: false },
]

// ─── Componente principal ─────────────────────────────────────
export function FormularioPerfil({ config, direcciones: dirInic, redes: redesInic, perfil, rol, metodosPago: metodosPagoInic, empleados: empleadosInic }: Props) {
  const [tab, setTab] = useState('general')

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Perfil de tienda</h1>
        <p className="text-xs text-foreground-muted mt-0.5">Configura los datos de tu negocio</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0',
                tab === t.id
                  ? 'bg-primary text-white'
                  : 'bg-card border border-card-border text-foreground-muted hover:text-foreground'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenido */}
      <div className="rounded-2xl bg-card border border-card-border p-5">
        {tab === 'general'     && <TabGeneral config={config} />}
        {tab === 'horario'     && <TabHorario config={config} />}
        {tab === 'citas'       && <TabCitas config={config} empleadosInic={empleadosInic} />}
        {tab === 'pagos'       && <TabMetodosPago metodosPagoInic={metodosPagoInic} />}
        {tab === 'imagenes'    && <TabImagenes config={config} />}
        {tab === 'colores'     && <TabColores config={config} />}
        {tab === 'direcciones' && <TabDirecciones direccionesInic={dirInic} />}
        {tab === 'redes'       && <TabRedes redesInic={redesInic} />}
        {tab === 'micuenta'    && <TabMiCuenta perfil={perfil} rol={rol} />}
      </div>
    </div>
  )
}

// ─── Tab General ──────────────────────────────────────────────
function TabGeneral({ config }: { config: ConfigTienda }) {
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CamposGeneral>({
    resolver: zodResolver(schemaGeneral),
    defaultValues: {
      nombre_tienda: config.nombre_tienda,
      descripcion: config.descripcion ?? '',
      whatsapp: config.whatsapp ?? '',
      moneda: config.moneda,
      simbolo_moneda: config.simbolo_moneda,
      pais: (config.pais as 'EC' | 'PE' | 'CO') ?? 'EC',
      meta_descripcion: config.meta_descripcion ?? '',
      politicas_negocio: config.politicas_negocio ?? '',
    },
  })

  async function onSubmit(datos: CamposGeneral) {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('configuracion_tienda').update({
      nombre_tienda: datos.nombre_tienda,
      descripcion: datos.descripcion || null,
      whatsapp: datos.whatsapp || null,
      moneda: datos.moneda,
      simbolo_moneda: datos.simbolo_moneda,
      pais: datos.pais,
      meta_descripcion: datos.meta_descripcion || null,
      politicas_negocio: datos.politicas_negocio || null,
    }).eq('id', config.id)
    setGuardando(false)
    if (error) {
      toast.error('Error al guardar')
      return
    }

    setExito(true)
    toast.success('Cambios guardados correctamente')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* ... inputs ... */}
      <Campo label="Nombre de la tienda *" error={errors.nombre_tienda?.message}>
        <input {...register('nombre_tienda')} className={inputCls} placeholder="Mi Tienda" />
      </Campo>

      <Campo label="Descripción">
        <textarea {...register('descripcion')} rows={3} className={`${inputCls} h-auto py-2 resize-none`} placeholder="Describe tu negocio..." />
      </Campo>

      <Campo label="WhatsApp">
        <input {...register('whatsapp')} className={inputCls} placeholder="Ej: 09xxxxxxxx" />
        <p className="text-[11px] text-foreground-muted mt-1">
          Ingresa solo el número sin espacios ni guiones. Ecuador: <span className="font-mono bg-background-subtle px-1 rounded">09xxxxxxxx</span>
        </p>
      </Campo>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Moneda">
          <input {...register('moneda')} className={inputCls} placeholder="USD" />
        </Campo>
        <Campo label="Símbolo">
          <input {...register('simbolo_moneda')} className={inputCls} placeholder="$" />
        </Campo>
      </div>

      <Campo label="País de operación">
        <select {...register('pais')} className={`${inputCls} appearance-none cursor-pointer`}>
          <option value="EC">🇪🇨 Ecuador (Provincias, USD)</option>
          <option value="PE">🇵🇪 Perú (Regiones/Departamentos, PEN)</option>
          <option value="CO">🇨🇴 Colombia (Departamentos, COP)</option>
        </select>
        <p className="text-[11px] text-foreground-muted mt-1">
          Afecta los dropdowns de provincia/ciudad en el carrito y formularios de cotización.
        </p>
      </Campo>

      <Campo label="Meta descripción (SEO)">
        <textarea {...register('meta_descripcion')} rows={2} className={`${inputCls} h-auto py-2 resize-none`} placeholder="Descripción para buscadores..." />
      </Campo>

      <Campo label="Políticas del negocio">
        <textarea {...register('politicas_negocio')} rows={4} className={`${inputCls} h-auto py-2 resize-none`} placeholder="Política de devoluciones, envíos, etc." />
      </Campo>

      <BtnGuardar guardando={guardando} exito={exito} />
    </form>
  )
}

// ─── Tab Imágenes ─────────────────────────────────────────────
function TabImagenes({ config }: { config: ConfigTienda }) {
  const [logo, setLogo] = useState<string[]>(config.logo_url ? [config.logo_url] : [])
  const [favicon, setFavicon] = useState<string[]>(config.favicon_url ? [config.favicon_url] : [])
  const [perfil, setPerfil] = useState<string[]>(config.foto_perfil_url ? [config.foto_perfil_url] : [])
  const [portada, setPortada] = useState<string[]>(config.foto_portada_url ? [config.foto_portada_url] : [])
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  async function guardar() {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    
    const { error } = await supabase.from('configuracion_tienda').update({
      logo_url: logo[0] ?? null,
      favicon_url: favicon[0] ?? null,
      foto_perfil_url: perfil[0] ?? null,
      foto_portada_url: portada[0] ?? null,
    }).eq('id', config.id)

    setGuardando(false)
    if (error) {
      toast.error('Error al guardar imágenes')
      return
    }
    setExito(true)
    toast.success('Cambios guardados correctamente')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-bold text-foreground">Identidad Visual</h3>
        <p className="text-xs text-foreground-muted">Gestiona el logotipo, icono y fotos del perfil de tu tienda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Logotipo del Menú */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              Logotipo del Menú
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded">Recomendado</span>
            </label>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Aparece en la barra superior. Se recomienda un formato <strong>rectangular</strong> de aprox. <strong>500x150px</strong>.
            </p>
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2 flex items-start gap-2">
              <span className="flex-shrink-0">📄</span>
              <span>Este logotipo también aparece en los <strong>comprobantes electrónicos RIDE</strong> emitidos al SRI. Usa imagen con fondo blanco o transparente para que se vea correctamente en el PDF.</span>
            </p>
          </div>
          <SubidorImagenes
            imagenes={logo}
            onCambio={setLogo}
            maxImagenes={1}
            carpeta="tienda"
          />
        </div>

        {/* Favicon */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              Favicon del Navegador
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded">Recomendado</span>
            </label>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Icono de la pestaña. Debe ser <strong>cuadrado</strong> (ej. <strong>32x32px</strong> o <strong>512x512px</strong>).
            </p>
          </div>
          <SubidorImagenes
            imagenes={favicon}
            onCambio={setFavicon}
            maxImagenes={1}
            carpeta="tienda"
          />
        </div>

        {/* Foto de Perfil */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              Foto de Perfil (Avatar)
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded">Recomendado</span>
            </label>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Imagen circular en el perfil público. Se recomienda ser <strong>cuadrada</strong> de <strong>400x400px</strong>.
            </p>
          </div>
          <SubidorImagenes
            imagenes={perfil}
            onCambio={setPerfil}
            maxImagenes={1}
            carpeta="tienda"
          />
        </div>

        {/* Foto de Portada */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-foreground flex items-center gap-2">
              Foto de Portada (Banner)
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-primary/10 text-primary rounded">Recomendado</span>
            </label>
            <p className="text-[11px] text-foreground-muted mt-0.5">
              Imagen de fondo en la cabecera del perfil. Formato <strong>horizontal</strong> de aprox. <strong>1200x400px</strong>.
            </p>
          </div>
          <SubidorImagenes
            imagenes={portada}
            onCambio={setPortada}
            maxImagenes={1}
            carpeta="tienda"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-border flex justify-end">
        <BtnGuardar 
          guardando={guardando} 
          exito={exito}
          onClick={guardar} 
          className="w-full sm:w-60 shadow-lg shadow-primary/10"
        />
      </div>
    </div>
  )
}

// ─── Tab Colores ──────────────────────────────────────────────
function TabColores({ config }: { config: ConfigTienda }) {
  const [temaActual,  setTemaActual]  = useState(config.tema_id ?? 'claro')
  const [colorActual, setColorActual] = useState(config.color_primario ?? '#ef4444')
  const [guardandoTema,  setGuardandoTema]  = useState(false)
  const [guardandoColor, setGuardandoColor] = useState(false)

  // ── Guardar tema base ────────────────────────────────────────
  async function guardarTema(temaId: string) {
    if (temaId === temaActual) return
    setTemaActual(temaId)
    setGuardandoTema(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ tema_id: temaId })
      .eq('id', config.id)
    setGuardandoTema(false)
    if (error) { toast.error('Error al guardar tema'); return }

    // Aplica las variables CSS en tiempo real
    const tema = obtenerTema(temaId)
    Object.entries(tema.vars).forEach(([key, val]) => {
      document.documentElement.style.setProperty(key, val)
    })

    toast.success('Tema aplicado')
    setTimeout(() => window.location.reload(), 1000)
  }

  // ── Guardar color de acento ──────────────────────────────────
  async function guardarColor(primario: string) {
    setColorActual(primario)
    setGuardandoColor(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ color_primario: primario })
      .eq('id', config.id)
    setGuardandoColor(false)
    if (error) { toast.error('Error al guardar color'); return }

    // Aplica en tiempo real
    document.documentElement.style.setProperty('--primary', primario)
    const paleta = PALETAS.find(p => p.primary === primario)
    if (paleta) {
      document.documentElement.style.setProperty('--primary-hover', paleta.hover)
      document.documentElement.style.setProperty('--primary-foreground', paleta.foreground)
    }

    toast.success('Color aplicado')
    setTimeout(() => window.location.reload(), 1000)
  }

  const grupos = [
    { label: 'Rojos & Rosas',       ids: ['rojo-vital','rojo-carmesi','rosa-elegante','rosa-fucsia','rose-soft'] },
    { label: 'Naranjas & Amarillos', ids: ['naranja-energia','naranja-mango','ambar-dorado','oro-premium','amarillo-sol'] },
    { label: 'Verdes',               ids: ['verde-esmeralda','bosque-profundo','verde-lima','verde-oliva','teal-fresco'] },
    { label: 'Azules & Celestes',    ids: ['azul-cielo','azul-ocean','azul-medianoche','navy-clasico','cyan-fresh'] },
    { label: 'Púrpuras & Violetas',  ids: ['indigo-moderno','violeta-real','purpura-intenso','morado-uva'] },
    { label: 'Neutros',              ids: ['slate-pro','gris-acero','negro-total','carbon'] },
  ]

  return (
    <div className="flex flex-col gap-8">

      {/* ── Sección 1: Tema base ── */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-foreground">Tema base</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            Cambia los fondos, cards y colores de texto de toda la tienda
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {TEMAS.map(tema => {
            const activo = temaActual === tema.id
            return (
              <button
                key={tema.id}
                onClick={() => guardarTema(tema.id)}
                disabled={guardandoTema}
                className={cn(
                  'relative flex flex-col rounded-2xl overflow-hidden border-2 transition-all text-left',
                  activo
                    ? 'border-primary shadow-lg scale-[1.03]'
                    : 'border-border hover:border-foreground-muted/50 hover:scale-[1.02]'
                )}
              >
                {/* Preview visual del tema */}
                <div
                  className="w-full h-16 flex flex-col justify-between p-2"
                  style={{ backgroundColor: tema.preview.bg }}
                >
                  {/* Card simulada */}
                  <div
                    className="w-full rounded-lg px-2 py-1.5 flex items-center gap-1.5"
                    style={{ backgroundColor: tema.preview.card, border: `1px solid ${tema.preview.border}` }}
                  >
                    <div className="w-4 h-1.5 rounded-full" style={{ backgroundColor: colorActual }} />
                    <div className="flex-1 h-1 rounded-full" style={{ backgroundColor: tema.preview.muted, opacity: 0.4 }} />
                  </div>
                  {/* Líneas de texto simuladas */}
                  <div className="flex flex-col gap-1 px-1">
                    <div className="h-1 w-3/4 rounded-full" style={{ backgroundColor: tema.preview.text, opacity: 0.7 }} />
                    <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: tema.preview.muted, opacity: 0.5 }} />
                  </div>
                </div>

                {/* Info */}
                <div
                  className="px-2.5 py-2"
                  style={{ backgroundColor: tema.preview.card, borderTop: `1px solid ${tema.preview.border}` }}
                >
                  <p className="text-[11px] font-bold leading-tight" style={{ color: tema.preview.text }}>
                    {tema.nombre}
                  </p>
                  <p className="text-[9px] leading-tight mt-0.5" style={{ color: tema.preview.muted }}>
                    {tema.descripcion}
                  </p>
                </div>

                {/* Check activo */}
                {activo && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center text-white text-[9px] font-bold shadow">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {guardandoTema && (
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Aplicando tema...
          </div>
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-border" />

      {/* ── Sección 2: Color de acento ── */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-bold text-foreground">Color de acento</p>
          <p className="text-xs text-foreground-muted mt-0.5">
            Se aplica en botones, badges y elementos interactivos de la tienda
          </p>
        </div>

        {grupos.map(grupo => {
          const paletas = grupo.ids.map(id => PALETAS.find(p => p.id === id)!).filter(Boolean)
          return (
            <div key={grupo.label}>
              <p className="text-[11px] font-bold text-foreground-muted uppercase tracking-wider mb-2">{grupo.label}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {paletas.map(p => {
                  const activo = colorActual.toLowerCase() === p.primary.toLowerCase()
                  return (
                    <button
                      key={p.id}
                      onClick={() => guardarColor(p.primary)}
                      disabled={guardandoColor}
                      title={p.nombre}
                      className={cn(
                        'relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all',
                        activo
                          ? 'border-[3px] shadow-md scale-[1.03]'
                          : 'border-border bg-card hover:border-foreground-muted/40 hover:scale-[1.02]'
                      )}
                      style={activo ? { borderColor: p.primary } : {}}
                    >
                      <div
                        className="w-10 h-10 rounded-full shadow-sm flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: p.primary, color: p.foreground }}
                      >
                        {activo && <Star className="w-4 h-4 fill-current" />}
                      </div>
                      <p className="text-[11px] font-semibold text-foreground text-center leading-tight">{p.nombre}</p>
                      <p className="text-[9px] text-foreground-muted font-mono uppercase">{p.primary}</p>
                      {activo && (
                        <span
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ backgroundColor: p.primary }}
                        >✓</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}

        {guardandoColor && (
          <div className="flex items-center gap-2 text-xs text-primary font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Aplicando color...
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Tab Direcciones ──────────────────────────────────────────
function TabDirecciones({ direccionesInic }: { direccionesInic: Direccion[] }) {
  const [direcciones, setDirecciones] = useState<Direccion[]>(direccionesInic)
  const [modo, setModo] = useState<'lista' | 'nuevo' | { editar: Direccion }>('lista')
  const [, startTransition] = useTransition()

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta dirección?')) return
    const supabase = crearClienteSupabase()
    await supabase.from('direcciones_negocio').delete().eq('id', id)
    startTransition(() => setDirecciones(d => d.filter(x => x.id !== id)))
  }

  async function marcarPrincipal(id: string) {
    const supabase = crearClienteSupabase()
    await supabase.from('direcciones_negocio').update({ es_principal: false }).neq('id', 'none')
    await supabase.from('direcciones_negocio').update({ es_principal: true }).eq('id', id)
    startTransition(() => setDirecciones(d => d.map(x => ({ ...x, es_principal: x.id === id }))))
    toast.success('Cambios guardados correctamente')
  }

  if (modo === 'nuevo' || (typeof modo === 'object' && 'editar' in modo)) {
    return (
      <FormDireccion
        direccion={typeof modo === 'object' && 'editar' in modo ? modo.editar : undefined}
        onGuardado={(d) => {
          if (typeof modo === 'object' && 'editar' in modo) {
            setDirecciones(dirs => dirs.map(x => x.id === d.id ? d : x))
          } else {
            setDirecciones(dirs => [...dirs, d])
          }
          setModo('lista')
        }}
        onCancelar={() => setModo('lista')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {direcciones.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-6">Sin direcciones registradas</p>
      ) : (
        direcciones.map(d => (
          <div key={d.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background-subtle">
            <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{d.etiqueta}</p>
                {d.es_principal && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    <Star className="w-2.5 h-2.5" /> Principal
                  </span>
                )}
              </div>
              <p className="text-xs text-foreground-muted">{d.direccion}</p>
              {(d.ciudad || d.provincia) && (
                <p className="text-xs text-foreground-muted">{[d.ciudad, d.provincia, d.pais].filter(Boolean).join(', ')}</p>
              )}
            </div>
            <div className="flex gap-1 flex-shrink-0">
              {!d.es_principal && (
                <button onClick={() => marcarPrincipal(d.id)} title="Marcar como principal"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-primary/10 transition-all">
                  <Star className="w-3.5 h-3.5" />
                </button>
              )}
              <button onClick={() => setModo({ editar: d })}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-background-subtle transition-all">
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => eliminar(d.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))
      )}
      <button
        onClick={() => setModo('nuevo')}
        className="flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-border text-sm text-foreground-muted hover:border-primary hover:text-primary transition-all"
      >
        <Plus className="w-4 h-4" /> Agregar dirección
      </button>
    </div>
  )
}

/** Extrae la URL del src si el usuario pega el código iframe completo */
function extraerSrcMapa(valor: string): string {
  const matchSrc = valor.match(/src="([^"]+)"/i)
  if (matchSrc) return matchSrc[1]
  return valor.trim()
}

function FormDireccion({ direccion, onGuardado, onCancelar }: {
  direccion?: Direccion
  onGuardado: (d: Direccion) => void
  onCancelar: () => void
}) {
  const [guardando, setGuardando] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CamposDireccion>({
    resolver: zodResolver(schemaDireccion),
    defaultValues: {
      etiqueta: direccion?.etiqueta ?? 'Tienda principal',
      direccion: direccion?.direccion ?? '',
      ciudad: direccion?.ciudad ?? '',
      provincia: direccion?.provincia ?? '',
      pais: direccion?.pais ?? 'Ecuador',
      es_principal: direccion?.es_principal ?? false,
      enlace_mapa: direccion?.enlace_mapa ?? '',
    },
  })

  async function onSubmit(datos: CamposDireccion) {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const payload = {
      etiqueta: datos.etiqueta,
      direccion: datos.direccion,
      ciudad: datos.ciudad || null,
      provincia: datos.provincia || null,
      pais: datos.pais,
      es_principal: datos.es_principal,
      enlace_mapa: extraerSrcMapa(datos.enlace_mapa || '') || null,
    }

    if (direccion) {
      const { error } = await supabase.from('direcciones_negocio').update(payload).eq('id', direccion.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      onGuardado({ ...direccion, ...payload, enlace_mapa: payload.enlace_mapa ?? null })
    } else {
      const { data, error } = await supabase.from('direcciones_negocio').insert(payload).select().single()
      if (error || !data) { toast.error('Error al guardar'); setGuardando(false); return }
      onGuardado(data as Direccion)
    }
    toast.success('Cambios guardados correctamente')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">{direccion ? 'Editar dirección' : 'Nueva dirección'}</p>

      <Campo label="Etiqueta *" error={errors.etiqueta?.message}>
        <input {...register('etiqueta')} className={inputCls} placeholder="Tienda principal" />
      </Campo>
      <Campo label="Dirección *" error={errors.direccion?.message}>
        <input {...register('direccion')} className={inputCls} placeholder="Av. Ejemplo 123" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Ciudad">
          <input {...register('ciudad')} className={inputCls} placeholder="Quito" />
        </Campo>
        <Campo label="Provincia">
          <input {...register('provincia')} className={inputCls} placeholder="Pichincha" />
        </Campo>
      </div>
      <Campo label="País">
        <input {...register('pais')} className={inputCls} placeholder="Ecuador" />
      </Campo>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input type="checkbox" {...register('es_principal')} className="rounded" />
        <span className="text-foreground">Marcar como dirección principal</span>
      </label>

      <Campo label="Enlace de Google Maps (opcional)">
        <input
          {...register('enlace_mapa')}
          className={inputCls}
          placeholder="Pega aquí el enlace o el código iframe de Google Maps"
        />
        <p className="text-[11px] text-foreground-muted leading-snug mt-1">
          En Google Maps: <strong>Compartir → Insertar mapa</strong> → copia todo el código o solo la URL del <code className="bg-background-subtle px-1 rounded">src</code>
        </p>
      </Campo>

      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 h-10 rounded-xl border border-border text-sm text-foreground-muted hover:text-foreground transition-all">
          Cancelar
        </button>
        <BtnGuardar guardando={guardando} className="flex-1" />
      </div>
    </form>
  )
}

// ─── Tab Redes sociales ───────────────────────────────────────
const PLATAFORMAS = ['instagram', 'facebook', 'tiktok', 'youtube', 'twitter', 'pinterest', 'linkedin', 'snapchat', 'whatsapp'] as const

function TabRedes({ redesInic }: { redesInic: RedSocial[] }) {
  const [redes, setRedes] = useState<RedSocial[]>([...redesInic].sort((a, b) => a.orden - b.orden))
  const [modo, setModo] = useState<'lista' | 'nuevo' | { editar: RedSocial }>('lista')
  const [, startTransition] = useTransition()
  const dragIdx = useRef<number | null>(null)

  async function toggleActiva(id: string, activa: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('redes_sociales').update({ esta_activa: !activa }).eq('id', id)
    startTransition(() => setRedes(r => r.map(x => x.id === id ? { ...x, esta_activa: !activa } : x)))
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta red social?')) return
    const supabase = crearClienteSupabase()
    await supabase.from('redes_sociales').delete().eq('id', id)
    startTransition(() => setRedes(r => r.filter(x => x.id !== id)))
  }

  async function guardarOrden(lista: RedSocial[]) {
    const supabase = crearClienteSupabase()
    await Promise.all(lista.map((r, i) => supabase.from('redes_sociales').update({ orden: i }).eq('id', r.id)))
  }

  function onDragStart(i: number) { dragIdx.current = i }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === i) return
    const nueva = [...redes]
    const [mov] = nueva.splice(dragIdx.current, 1)
    nueva.splice(i, 0, mov)
    dragIdx.current = i
    setRedes(nueva)
  }

  function onDrop() {
    dragIdx.current = null
    guardarOrden(redes)
    toast.success('Orden guardado')
  }

  if (modo === 'nuevo' || (typeof modo === 'object' && 'editar' in modo)) {
    return (
      <FormRed
        red={typeof modo === 'object' && 'editar' in modo ? modo.editar : undefined}
        onGuardado={(r) => {
          if (typeof modo === 'object' && 'editar' in modo) {
            setRedes(rs => rs.map(x => x.id === r.id ? r : x))
          } else {
            setRedes(rs => [...rs, r])
          }
          setModo('lista')
        }}
        onCancelar={() => setModo('lista')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {redes.length === 0 ? (
        <p className="text-sm text-foreground-muted text-center py-6">Sin redes sociales registradas</p>
      ) : (
        <>
          <p className="text-[11px] text-foreground-muted flex items-center gap-1">
            <GripVertical className="w-3 h-3" /> Arrastra para cambiar el orden
          </p>
          {redes.map((r, i) => (
            <div
              key={r.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={e => onDragOver(e, i)}
              onDrop={onDrop}
              className="flex items-center gap-2 p-3 rounded-xl border border-border bg-background-subtle cursor-grab active:cursor-grabbing active:opacity-60 active:scale-[0.99] transition-all"
            >
              {/* Handle */}
              <GripVertical className="w-4 h-4 text-foreground-muted/40 flex-shrink-0" />

              {/* Icono plataforma */}
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Share2 className="w-4 h-4 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground capitalize">{r.plataforma}</p>
                <p className="text-xs text-foreground-muted truncate">{r.url}</p>
              </div>

              {/* Acciones */}
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggleActiva(r.id, r.esta_activa)}
                  className={cn('h-7 px-2 rounded-lg flex items-center justify-center transition-all text-[10px] font-bold',
                    r.esta_activa ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted')}>
                  {r.esta_activa ? 'ON' : 'OFF'}
                </button>
                <button onClick={() => setModo({ editar: r })}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-foreground hover:bg-card transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => eliminar(r.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </>
      )}
      <button
        onClick={() => setModo('nuevo')}
        className="flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-border text-sm text-foreground-muted hover:border-primary hover:text-primary transition-all"
      >
        <Plus className="w-4 h-4" /> Agregar red social
      </button>
    </div>
  )
}

function FormRed({ red, onGuardado, onCancelar }: {
  red?: RedSocial
  onGuardado: (r: RedSocial) => void
  onCancelar: () => void
}) {
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CamposRed>({
    resolver: zodResolver(schemaRed),
    defaultValues: {
      plataforma: (red?.plataforma as typeof PLATAFORMAS[number]) ?? 'instagram',
      url: red?.url ?? '',
      esta_activa: red?.esta_activa ?? true,
      orden: String(red?.orden ?? 0),
    },
  })

  async function onSubmit(datos: CamposRed) {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const payload = {
      plataforma: datos.plataforma,
      url: datos.url,
      esta_activa: datos.esta_activa,
      orden: parseInt(datos.orden) || 0,
    }

    if (red) {
      const { error } = await supabase.from('redes_sociales').update(payload).eq('id', red.id)
      if (error) { toast.error('Error al guardar'); setGuardando(false); return }
      onGuardado({ ...red, ...payload })
    } else {
      const { data, error } = await supabase.from('redes_sociales').insert(payload).select().single()
      if (error || !data) { toast.error('Error al guardar'); setGuardando(false); return }
      onGuardado(data as RedSocial)
    }
    setGuardando(false)
    setExito(true)
    toast.success('Cambios guardados correctamente')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-foreground">{red ? 'Editar red social' : 'Nueva red social'}</p>

      <Campo label="Plataforma">
        <select {...register('plataforma')} className={`${inputCls} capitalize`}>
          {PLATAFORMAS.map(p => (
            <option key={p} value={p} className="capitalize">{p}</option>
          ))}
        </select>
      </Campo>
      <Campo label="URL *" error={errors.url?.message}>
        <input {...register('url')} className={inputCls} placeholder="https://instagram.com/mitienda" />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Orden">
          <input {...register('orden')} type="number" min="0" className={inputCls} placeholder="0" />
        </Campo>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Estado</label>
          <label className="flex items-center gap-2 h-10 cursor-pointer">
            <input type="checkbox" {...register('esta_activa')} className="rounded" />
            <span className="text-sm text-foreground">Activa</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 mt-1">
        <button type="button" onClick={onCancelar}
          className="flex-1 h-10 rounded-xl border border-border text-sm text-foreground-muted hover:text-foreground transition-all">
          Cancelar
        </button>
        <BtnGuardar guardando={guardando} exito={exito} className="flex-1" />
      </div>
    </form>
  )
}

// ─── Tab Horario ──────────────────────────────────────────────
function TabHorario({ config }: { config: ConfigTienda }) {
  const [horario, setHorario] = useState<HorarioDia[]>(
    config.horario_atencion && config.horario_atencion.length === 7
      ? config.horario_atencion
      : HORARIO_DEFAULT
  )
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  function actualizarDia(idx: number, campo: keyof HorarioDia, valor: string | boolean) {
    setHorario(h => h.map((d, i) => i === idx ? { ...d, [campo]: valor } : d))
  }

  async function guardar() {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase
      .from('configuracion_tienda')
      .update({ horario_atencion: horario })
      .eq('id', config.id)
    setGuardando(false)
    if (error) { toast.error('Error al guardar'); return }
    setExito(true)
    toast.success('Horario guardado')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-sm font-bold text-foreground">Horario de atención</h3>
        <p className="text-xs text-foreground-muted mt-0.5">
          Este horario aparece en tu perfil público para que los clientes sepan cuándo pueden visitarte o contactarte.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {horario.map((dia, idx) => (
          <div
            key={dia.dia}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border transition-all',
              dia.abierto ? 'border-card-border bg-card' : 'border-border bg-background-subtle opacity-60'
            )}
          >
            {/* Toggle abierto/cerrado */}
            <button
              type="button"
              onClick={() => actualizarDia(idx, 'abierto', !dia.abierto)}
              className={cn(
                'w-10 h-5 rounded-full transition-colors flex-shrink-0 relative',
                dia.abierto ? 'bg-primary' : 'bg-border'
              )}
            >
              <span className={cn(
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                dia.abierto && 'translate-x-5'
              )} />
            </button>

            {/* Nombre del día */}
            <span className="w-24 text-sm font-semibold text-foreground flex-shrink-0">{dia.nombre}</span>

            {dia.abierto ? (
              <div className="flex items-center gap-2 flex-1 flex-wrap">
                <input
                  type="time"
                  value={dia.apertura}
                  onChange={e => actualizarDia(idx, 'apertura', e.target.value)}
                  className="h-9 px-2 rounded-lg border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span className="text-xs text-foreground-muted">–</span>
                <input
                  type="time"
                  value={dia.cierre}
                  onChange={e => actualizarDia(idx, 'cierre', e.target.value)}
                  className="h-9 px-2 rounded-lg border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ) : (
              <span className="text-xs text-foreground-muted italic ml-2">Cerrado</span>
            )}
          </div>
        ))}
      </div>

      <BtnGuardar guardando={guardando} exito={exito} onClick={guardar} className="w-full sm:w-60" />
    </div>
  )
}

// ─── Tab Citas ────────────────────────────────────────────────
function TabCitas({ config, empleadosInic }: { config: ConfigTienda; empleadosInic: EmpleadoCita[] }) {
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const [empleados, setEmpleados] = useState<EmpleadoCita[]>(empleadosInic)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [guardandoEmp, setGuardandoEmp] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<CamposCitas>({
    resolver: zodResolver(schemaCitas),
    defaultValues: {
      habilitar_citas: config.habilitar_citas,
      hora_apertura: config.hora_apertura,
      hora_cierre: config.hora_cierre,
      duracion_cita_minutos: config.duracion_cita_minutos,
      capacidad_citas_simultaneas: config.capacidad_citas_simultaneas ?? 1,
      seleccion_empleado: config.seleccion_empleado ?? false,
    },
  })

  const seleccionEmpleado = watch('seleccion_empleado')

  async function onSubmit(datos: CamposCitas) {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('configuracion_tienda').update({
      habilitar_citas: datos.habilitar_citas,
      hora_apertura: datos.hora_apertura,
      hora_cierre: datos.hora_cierre,
      duracion_cita_minutos: datos.duracion_cita_minutos,
      capacidad_citas_simultaneas: datos.capacidad_citas_simultaneas,
      seleccion_empleado: datos.seleccion_empleado,
    }).eq('id', config.id)
    setGuardando(false)
    if (error) { toast.error('Error al guardar configuración de citas'); return }
    setExito(true)
    toast.success('Cambios guardados correctamente')
    setTimeout(() => window.location.reload(), 1200)
  }

  async function agregarEmpleado() {
    if (!nuevoNombre.trim()) return
    setGuardandoEmp(true)
    const supabase = crearClienteSupabase()
    const { data, error } = await supabase
      .from('empleados_cita')
      .insert({ nombre_completo: nuevoNombre.trim(), activo: true, orden: empleados.length })
      .select()
      .single()
    setGuardandoEmp(false)
    if (error || !data) { toast.error('Error al agregar'); return }
    setEmpleados(e => [...e, data as EmpleadoCita])
    setNuevoNombre('')
    toast.success('Empleado agregado')
  }

  async function toggleEmpleado(id: string, activo: boolean) {
    const supabase = crearClienteSupabase()
    await supabase.from('empleados_cita').update({ activo: !activo }).eq('id', id)
    setEmpleados(e => e.map(x => x.id === id ? { ...x, activo: !activo } : x))
  }

  async function eliminarEmpleado(id: string) {
    if (!confirm('¿Eliminar este empleado? No se puede deshacer.')) return
    const supabase = crearClienteSupabase()
    await supabase.from('empleados_cita').delete().eq('id', id)
    setEmpleados(e => e.filter(x => x.id !== id))
    toast.success('Empleado eliminado')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-bold text-foreground">Gestión de Citas y Servicios</h3>
        <p className="text-xs text-foreground-muted mt-0.5">Configura horarios, capacidad y personal para el agendamiento.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Habilitar módulo */}
        <div className="flex bg-background-subtle border border-border p-4 rounded-xl flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('habilitar_citas')} className="w-5 h-5 rounded" />
            <span className="font-semibold text-foreground text-sm">Habilitar módulo de servicios y agendamiento</span>
          </label>
          <p className="text-xs text-foreground-muted ml-8">
            Permite crear productos de tipo "Servicio" con reserva de fecha y hora.
          </p>
        </div>

        {/* Horarios y duración */}
        <div className="grid grid-cols-2 gap-4">
          <Campo label="Hora de apertura" error={errors.hora_apertura?.message}>
            <input type="time" {...register('hora_apertura')} className={inputCls} />
          </Campo>
          <Campo label="Hora de cierre" error={errors.hora_cierre?.message}>
            <input type="time" {...register('hora_cierre')} className={inputCls} />
          </Campo>
          <Campo label="Duración por cita (min)" error={errors.duracion_cita_minutos?.message}>
            <input type="number" step="5" min="5" {...register('duracion_cita_minutos', { valueAsNumber: true })} className={inputCls} placeholder="30" />
          </Campo>
          {!seleccionEmpleado && (
            <Campo label="Citas simultáneas" error={errors.capacidad_citas_simultaneas?.message}>
              <input type="number" min="1" max="50" {...register('capacidad_citas_simultaneas', { valueAsNumber: true })} className={inputCls} placeholder="1" />
              <p className="text-[11px] text-foreground-muted mt-1">Cuántas citas se pueden tomar al mismo tiempo en toda la tienda.</p>
            </Campo>
          )}
        </div>

        {/* Selección de empleado */}
        <div className="flex bg-background-subtle border border-border p-4 rounded-xl flex-col gap-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register('seleccion_empleado')} className="w-5 h-5 rounded" />
            <span className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Permitir selección de empleado
            </span>
          </label>
          <p className="text-xs text-foreground-muted ml-8">
            El cliente podrá elegir con quién ser atendido. La capacidad se define por el número de empleados activos.
          </p>
        </div>

        <BtnGuardar guardando={guardando} exito={exito} className="w-full sm:w-60" />
      </form>

      {/* Gestión de empleados */}
      {seleccionEmpleado && (
        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Personal
              </p>
              <p className="text-xs text-foreground-muted">Los empleados activos aparecen en el selector de citas</p>
            </div>
          </div>

          {/* Lista de empleados */}
          <div className="flex flex-col gap-2">
            {empleados.length === 0 && (
              <p className="text-sm text-foreground-muted text-center py-4">Sin empleados registrados</p>
            )}
            {empleados.map(emp => (
              <div key={emp.id} className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all',
                emp.activo ? 'border-card-border bg-card' : 'border-border bg-background-subtle opacity-60'
              )}>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <p className={cn('flex-1 text-sm font-medium', emp.activo ? 'text-foreground' : 'text-foreground-muted line-through')}>
                  {emp.nombre_completo}
                </p>
                <button
                  onClick={() => toggleEmpleado(emp.id, emp.activo)}
                  className={cn('h-7 px-2 rounded-lg text-[10px] font-bold transition-all',
                    emp.activo ? 'bg-success/10 text-success' : 'bg-foreground-muted/10 text-foreground-muted')}
                >
                  {emp.activo ? 'Activo' : 'Inactivo'}
                </button>
                <button
                  onClick={() => eliminarEmpleado(emp.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Agregar empleado */}
          <div className="flex gap-2">
            <input
              value={nuevoNombre}
              onChange={e => setNuevoNombre(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarEmpleado())}
              placeholder="Nombre completo del empleado"
              className={cn(inputCls, 'flex-1')}
            />
            <button
              onClick={agregarEmpleado}
              disabled={guardandoEmp || !nuevoNombre.trim()}
              className="h-10 px-4 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-all flex items-center gap-1.5"
            >
              {guardandoEmp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Agregar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab Mi cuenta ────────────────────────────────────────────
function TabMiCuenta({ perfil, rol }: { perfil: Perfil; rol: string }) {
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<CamposMiCuenta>({
    resolver: zodResolver(schemaMiCuenta),
    defaultValues: {
      nombre: perfil.nombre ?? '',
      telefono: perfil.telefono ?? '',
    },
  })

  async function onSubmit(datos: CamposMiCuenta) {
    setGuardando(true)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('perfiles').update({
      nombre: datos.nombre,
      telefono: datos.telefono || null,
    }).eq('id', perfil.id)
    setGuardando(false)
    if (error) {
      toast.error('Error al guardar')
      return
    }

    setExito(true)
    toast.success('Cambios guardados correctamente')
    setTimeout(() => window.location.reload(), 1200)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{perfil.nombre ?? 'Sin nombre'}</p>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{rol}</span>
        </div>
      </div>

      <Campo label="Nombre *" error={errors.nombre?.message}>
        <input {...register('nombre')} className={inputCls} placeholder="Tu nombre" />
      </Campo>

      <Campo label="Teléfono">
        <input {...register('telefono')} className={inputCls} placeholder="0999999999" />
      </Campo>

      <BtnGuardar guardando={guardando} exito={exito} />
      
      <div className="mt-8 pt-6 border-t border-border">
        <SeccionPassword />
      </div>
    </form>
  )
}

function SeccionPassword() {
  const [actual, setActual] = useState('')
  const [nueva, setNueva] = useState('')
  const [verActual, setVerActual] = useState(false)
  const [verNueva, setVerNueva] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito] = useState(false)

  async function cambiarPassword(e?: React.FormEvent) {
    if (e) e.preventDefault()
    if (nueva.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    setGuardando(true)
    const supabase = crearClienteSupabase()

    // 1. Verificar contraseña actual (re-autenticación)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      toast.error('No se pudo verificar el usuario')
      setGuardando(false)
      return
    }

    const { error: errorAuth } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: actual
    })

    if (errorAuth) {
      toast.error('La contraseña actual es incorrecta')
      setGuardando(false)
      return
    }

    // 2. Actualizar contraseña
    const { error } = await supabase.auth.updateUser({ password: nueva })
    
    setGuardando(false)
    if (error) {
      toast.error('Error al actualizar contraseña: ' + error.message)
    } else {
      setExito(true)
      toast.success('Cambios guardados correctamente')
      setActual('')
      setNueva('')
      setTimeout(() => window.location.reload(), 1200)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          Seguridad de la cuenta
        </h3>
        <p className="text-xs text-foreground-muted mt-0.5">Cambia tu contraseña de acceso al panel</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Contraseña actual</label>
          <div className="relative">
            <input
              type={verActual ? 'text' : 'password'}
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setVerActual(!verActual)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            >
              {verActual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-foreground">Contraseña nueva</label>
          <div className="relative">
            <input
              type={verNueva ? 'text' : 'password'}
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className={inputCls}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setVerNueva(!verNueva)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground transition-colors"
            >
              {verNueva ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <BtnGuardar
        onClick={cambiarPassword}
        guardando={guardando}
        exito={exito}
        disabled={!actual || !nueva}
        className="w-full sm:w-60 self-end"
      />
    </div>
  )
}

// ─── Tab Métodos de Pago ──────────────────────────────────────
function TabMetodosPago({ metodosPagoInic }: { metodosPagoInic: MetodoPago[] }) {
  const [metodos, setMetodos] = useState<MetodoPago[]>(metodosPagoInic)
  const [editando, setEditando] = useState<MetodoPago | null>(null)
  const [creando, setCreando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const vacío: Omit<MetodoPago, 'id' | 'orden'> = {
    banco: '', tipo_cuenta: 'ahorros', numero_cuenta: '',
    cedula_titular: '', nombre_titular: '', esta_activo: true,
  }
  const [form, setForm] = useState(vacío)

  function abrirNuevo() { setForm(vacío); setEditando(null); setCreando(true) }
  function abrirEditar(m: MetodoPago) { setForm({ banco: m.banco, tipo_cuenta: m.tipo_cuenta, numero_cuenta: m.numero_cuenta, cedula_titular: m.cedula_titular, nombre_titular: m.nombre_titular, esta_activo: m.esta_activo }); setEditando(m); setCreando(true) }
  function cerrar() { setCreando(false); setEditando(null) }

  async function guardar() {
    if (!form.banco.trim() || !form.numero_cuenta.trim() || !form.cedula_titular.trim() || !form.nombre_titular.trim()) {
      toast.error('Completa todos los campos'); return
    }
    setGuardando(true)
    const supabase = crearClienteSupabase()

    if (editando) {
      const { error } = await supabase.from('metodos_pago').update({ ...form }).eq('id', editando.id)
      if (error) { toast.error('Error al actualizar'); setGuardando(false); return }
      setMetodos(ms => ms.map(m => m.id === editando.id ? { ...m, ...form } : m))
      toast.success('Método actualizado')
    } else {
      const { data, error } = await supabase.from('metodos_pago').insert({ ...form, orden: metodos.length }).select().single()
      if (error || !data) { toast.error('Error al guardar'); setGuardando(false); return }
      setMetodos(ms => [...ms, data as MetodoPago])
      toast.success('Método agregado')
    }
    setGuardando(false)
    cerrar()
  }

  async function eliminar(id: string) {
    setEliminando(id)
    const supabase = crearClienteSupabase()
    const { error } = await supabase.from('metodos_pago').delete().eq('id', id)
    setEliminando(null)
    if (error) { toast.error('Error al eliminar'); return }
    setMetodos(ms => ms.filter(m => m.id !== id))
    toast.success('Método eliminado')
  }

  async function toggleActivo(m: MetodoPago) {
    const supabase = crearClienteSupabase()
    await supabase.from('metodos_pago').update({ esta_activo: !m.esta_activo }).eq('id', m.id)
    setMetodos(ms => ms.map(x => x.id === m.id ? { ...x, esta_activo: !x.esta_activo } : x))
  }

  const inputP = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Métodos de pago</h3>
          <p className="text-xs text-foreground-muted mt-0.5">Aparecen en el perfil público y en la confirmación de pedidos</p>
        </div>
        <button onClick={abrirNuevo}
          className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all">
          <Plus className="w-3.5 h-3.5" /> Agregar
        </button>
      </div>

      {/* Formulario inline */}
      {creando && (
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            {editando ? 'Editar método' : 'Nuevo método de pago'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground-muted">Banco / Cooperativa *</label>
              <input value={form.banco} onChange={e => setForm(f => ({ ...f, banco: e.target.value }))}
                placeholder="Ej: Banco Pichincha" className={inputP} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground-muted">Tipo de cuenta *</label>
              <select value={form.tipo_cuenta} onChange={e => setForm(f => ({ ...f, tipo_cuenta: e.target.value as 'corriente' | 'ahorros' }))}
                className={inputP + ' cursor-pointer'}>
                <option value="ahorros">Ahorros</option>
                <option value="corriente">Corriente</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground-muted">Número de cuenta *</label>
              <input value={form.numero_cuenta} onChange={e => setForm(f => ({ ...f, numero_cuenta: e.target.value }))}
                placeholder="Ej: 21xxxxxxxxx" className={inputP} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground-muted">Nombre del titular *</label>
              <input value={form.nombre_titular} onChange={e => setForm(f => ({ ...f, nombre_titular: e.target.value }))}
                placeholder="Ej: Juan Pérez" className={inputP} />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground-muted">Cédula del titular *</label>
              <input value={form.cedula_titular} onChange={e => setForm(f => ({ ...f, cedula_titular: e.target.value }))}
                placeholder="Ej: 06xxxxxxxxx" className={inputP} maxLength={13} />
            </div>

            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="mp-activo" checked={form.esta_activo}
                onChange={e => setForm(f => ({ ...f, esta_activo: e.target.checked }))}
                className="w-4 h-4 accent-primary" />
              <label htmlFor="mp-activo" className="text-xs font-medium text-foreground cursor-pointer">Visible en tienda</label>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={cerrar}
              className="flex-1 h-10 rounded-xl border border-border text-sm font-medium text-foreground-muted hover:bg-background-subtle transition-all">
              Cancelar
            </button>
            <button onClick={guardar} disabled={guardando}
              className="flex-1 h-10 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editando ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {metodos.length === 0 && !creando ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <CreditCard className="w-8 h-8 text-foreground-muted/30 mx-auto mb-2" />
          <p className="text-sm font-medium text-foreground-muted">Sin métodos de pago</p>
          <p className="text-xs text-foreground-muted/70 mt-0.5">Agrega bancos o cooperativas para que los clientes puedan realizar transferencias</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {metodos.map(m => (
            <div key={m.id} className={cn(
              'rounded-xl border bg-card p-3 flex items-start gap-3 transition-all',
              m.esta_activo ? 'border-card-border' : 'border-border opacity-60'
            )}>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Landmark className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-foreground">{m.banco}</p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{m.tipo_cuenta}</span>
                  {!m.esta_activo && <span className="text-[10px] text-foreground-muted italic">Oculto</span>}
                </div>
                <div className="mt-0.5 text-xs text-foreground-muted space-y-0.5">
                  <p>Cuenta: <span className="font-mono font-semibold text-foreground">{m.numero_cuenta}</span></p>
                  <p>Titular: <span className="font-semibold text-foreground">{m.nombre_titular}</span> · CI: <span className="font-mono">{m.cedula_titular}</span></p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActivo(m)} title={m.esta_activo ? 'Ocultar' : 'Mostrar'}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:bg-background-subtle transition-all">
                  {m.esta_activo ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => abrirEditar(m)} title="Editar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-primary hover:bg-primary/10 transition-all">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => eliminar(m.id)} disabled={eliminando === m.id} title="Eliminar"
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-foreground-muted hover:text-danger hover:bg-danger/10 disabled:opacity-50 transition-all">
                  {eliminando === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
const inputCls = 'w-full h-10 px-3 rounded-xl border border-input-border bg-input-bg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

function Campo({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

function BtnGuardar({ 
  guardando, 
  exito,
  onClick, 
  disabled,
  className 
}: { 
  guardando: boolean; 
  exito?: boolean;
  onClick?: () => void; 
  disabled?: boolean;
  className?: string 
}) {
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      onClick={onClick}
      disabled={guardando || exito || disabled}
      className={cn(
        'group relative flex items-center justify-center gap-2 h-12 px-6 rounded-2xl font-bold text-sm overflow-hidden transition-all duration-500 shadow-lg hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed',
        exito 
          ? 'bg-[#22c55e] text-white' // Verde éxito
          : 'bg-primary text-white hover:bg-primary/90 hover:scale-[1.02]',
        guardando && 'opacity-80 pointer-events-none',
        className
      )}
    >
      {guardando ? (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Guardando...</span>
        </div>
      ) : exito ? (
        <div className="flex items-center gap-2 animate-in zoom-in-50 duration-300">
          <svg className="w-5 h-5 text-white animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
          <span>¡Guardado!</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Save className="w-4 h-4 transition-transform group-hover:scale-110" />
          <span>Guardar cambios</span>
        </div>
      )}
    </button>
  )
}
