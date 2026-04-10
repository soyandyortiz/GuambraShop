import { createClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { NextResponse } from 'next/server'

function generarContrasena(): string {
  const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minusculas = 'abcdefghjkmnpqrstuvwxyz'
  const numeros = '23456789'
  const todos = mayusculas + minusculas + numeros

  // Garantizar al menos una de cada tipo
  let pass =
    mayusculas[Math.floor(Math.random() * mayusculas.length)] +
    minusculas[Math.floor(Math.random() * minusculas.length)] +
    numeros[Math.floor(Math.random() * numeros.length)]

  for (let i = 3; i < 10; i++) {
    pass += todos[Math.floor(Math.random() * todos.length)]
  }

  // Mezclar caracteres
  return pass.split('').sort(() => Math.random() - 0.5).join('')
}

export async function POST() {
  try {
    // 1. Verificar que quien llama es superadmin
    const supabase = await crearClienteServidor()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: perfil } = await supabase
      .from('perfiles')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (perfil?.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // 2. Necesitamos service_role para cambiar contraseñas de otros usuarios
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY no configurada en variables de entorno' },
        { status: 500 }
      )
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 3. Buscar el usuario admin (rol = 'admin') en perfiles
    const { data: perfilAdmin } = await supabase
      .from('perfiles')
      .select('id')
      .eq('rol', 'admin')
      .single()

    if (!perfilAdmin) {
      return NextResponse.json({ error: 'No se encontró ningún usuario admin' }, { status: 404 })
    }

    // 4. Generar y aplicar nueva contraseña
    const nuevaContrasena = generarContrasena()

    const { error } = await adminClient.auth.admin.updateUserById(perfilAdmin.id, {
      password: nuevaContrasena,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ contrasena: nuevaContrasena })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
