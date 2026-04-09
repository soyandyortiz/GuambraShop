'use client'

import { Modal } from '@/components/ui/modal'
import { Botón } from '@/components/ui/boton'
import { MessageCircle, Clock, KeyRound, CheckCircle2 } from 'lucide-react'
import { generarEnlaceWhatsApp, generarMensajeRecuperacionContrasena } from '@/lib/whatsapp'

interface PropsModalRecuperar {
  abierto: boolean
  alCerrar: () => void
}

const PASOS = [
  {
    icono: MessageCircle,
    titulo: 'Escríbenos por WhatsApp',
    descripcion: 'Envía un mensaje a GuambraWeb con el botón de abajo.',
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    icono: Clock,
    titulo: 'Espera nuestra respuesta',
    descripcion: 'Te respondemos en horario hábil (lunes a sábado, 8h - 18h).',
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    icono: KeyRound,
    titulo: 'Recibe tus nuevos accesos',
    descripcion: 'Te enviaremos tu nueva contraseña por WhatsApp para que puedas ingresar.',
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
]

export function ModalRecuperarContrasena({ abierto, alCerrar }: PropsModalRecuperar) {
  const urlTienda = typeof window !== 'undefined' ? window.location.origin : ''
  const mensaje = generarMensajeRecuperacionContrasena(urlTienda)
  const enlace = generarEnlaceWhatsApp(
    process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP ?? '0982650929',
    mensaje
  )

  return (
    <Modal
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Recuperar acceso"
      descripcion="Sigue estos pasos para recuperar el acceso a tu tienda."
      tamaño="sm"
    >
      <div className="flex flex-col gap-4">
        {PASOS.map((paso, i) => {
          const Icono = paso.icono
          return (
            <div key={i} className="flex gap-3 items-start">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${paso.bg}`}>
                <Icono className={`w-4 h-4 ${paso.color}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-background-subtle text-foreground-muted text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  {paso.titulo}
                </p>
                <p className="text-xs text-foreground-muted mt-0.5">{paso.descripcion}</p>
              </div>
            </div>
          )
        })}

        <div className="border-t border-border pt-4 flex flex-col gap-2">
          <a href={enlace} target="_blank" rel="noopener noreferrer" className="w-full">
            <Botón variante="primario" anchoCompleto className="bg-success hover:bg-green-700 gap-2">
              <MessageCircle className="w-4 h-4" />
              Abrir WhatsApp
            </Botón>
          </a>
          <Botón variante="fantasma" anchoCompleto onClick={alCerrar}>
            Cerrar
          </Botón>
        </div>
      </div>
    </Modal>
  )
}
