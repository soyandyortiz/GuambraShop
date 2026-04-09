'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, ShoppingBag, FlaskConical } from 'lucide-react'
import { crearClienteSupabase } from '@/lib/supabase/cliente'
import { Input } from '@/components/ui/input'
import { Botón } from '@/components/ui/boton'
import { ModalRecuperarContrasena } from './modal-recuperar-contrasena'


const esquema = z.object({
  email: z.string().min(1, 'Ingresa tu usuario'),
  contrasena: z.string().min(1, 'Ingresa tu contraseña'),
})

type DatosLogin = z.infer<typeof esquema>

const DEMO_USUARIO = 'demo'
const DEMO_CONTRASENA = 'demo123'

export function FormularioLogin() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<DatosLogin>({
    resolver: zodResolver(esquema),
  })

  // Si ingresa solo números → 0604511089@tiendademo.local
  // Si ingresa "demo"       → demo@tiendademo.local
  function normalizarEmail(email: string): string {
    const v = email.trim()
    const soloNumeros = /^\d+$/.test(v)
    const esDemo = v.toLowerCase() === 'demo'
    if (soloNumeros || esDemo) return `${v.toLowerCase()}@tiendademo.local`
    return v
  }

  function rellenarDemo() {
    setValue('email', DEMO_USUARIO)
    setValue('contrasena', DEMO_CONTRASENA)
  }

  async function onSubmit(datos: DatosLogin) {
    setError('')
    const supabase = crearClienteSupabase()

    const { error: errAuth } = await supabase.auth.signInWithPassword({
      email: normalizarEmail(datos.email),
      password: datos.contrasena,
    })

    if (errAuth) {
      setError('Usuario o contraseña incorrectos')
      return
    }

    router.push('/admin/dashboard')
    router.refresh()
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">

        {/* Toggle tema */}
        <div className="absolute top-4 right-4">

        </div>

        {/* Card de login */}
        <div className="w-full max-w-sm">

          {/* Logo / Marca */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-4">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
            <p className="text-sm text-foreground-muted mt-1">Ingresa a tu panel de administración</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">

            <Input
              etiqueta="Usuario"
              placeholder="admin@tiendademo.com"
              icono={<User className="w-4 h-4" />}
              autoComplete="email"
              autoCapitalize="none"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              etiqueta="Contraseña"
              type="password"
              placeholder="••••••••"
              icono={<Lock className="w-4 h-4" />}
              autoComplete="current-password"
              error={errors.contrasena?.message}
              {...register('contrasena')}
            />

            {/* Error del servidor */}
            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 px-4 py-3 text-sm text-danger">
                {error}
              </div>
            )}

            <Botón
              type="submit"
              anchoCompleto
              tamaño="lg"
              cargando={isSubmitting}
              className="mt-1"
            >
              Ingresar
            </Botón>

            {/* Recuperar contraseña */}
            <button
              type="button"
              onClick={() => setModalAbierto(true)}
              className="text-sm text-foreground-muted hover:text-primary transition-colors text-center"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>

          {/* Demo box */}
          <button
            type="button"
            onClick={rellenarDemo}
            className="w-full mt-6 rounded-2xl border-2 border-amber-400 bg-amber-400 px-4 py-3 text-left hover:bg-amber-500 hover:border-amber-500 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-amber-900 flex-shrink-0" />
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">Modo Demo</p>
              <span className="ml-auto text-[10px] font-semibold text-amber-800 group-hover:underline">Clic para rellenar</span>
            </div>
            <div className="flex gap-4 text-xs text-amber-950 font-medium">
              <span>Usuario: <span className="font-bold">{DEMO_USUARIO}</span></span>
              <span>Contraseña: <span className="font-bold">{DEMO_CONTRASENA}</span></span>
            </div>
          </button>

          {/* Footer */}
          <p className="text-xs text-foreground-muted text-center mt-8">
            Powered by{' '}
            <a
              href="https://guambraweb.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline"
            >
              GuambraWeb
            </a>
          </p>
        </div>
      </div>

      <ModalRecuperarContrasena
        abierto={modalAbierto}
        alCerrar={() => setModalAbierto(false)}
      />
    </>
  )
}
