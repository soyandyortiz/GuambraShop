import { FormularioLogin } from '@/components/admin/formulario-login'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Ingresar — Panel de administración',
}

export default function PáginaLogin() {
  return <FormularioLogin />
}
