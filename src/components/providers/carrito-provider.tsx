'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

import { TipoProducto } from '@/types'

export interface ItemCarrito {
  producto_id: string
  nombre: string
  slug: string
  tipo_producto: TipoProducto
  imagen_url: string | null
  precio: number
  variante_id?: string
  nombre_variante?: string
  talla?: string
  cantidad: number
  cita?: {
    fecha: string
    hora_inicio: string
    hora_fin: string
    empleado_id?: string | null
    empleado_nombre?: string
  }
  alquiler?: {
    fecha_inicio: string
    fecha_fin: string
    dias: number
    hora_recogida?: string
  }
  // Add-ons seleccionados (variantes con tipo_precio = 'suma')
  extras?: { id: string; nombre: string; precio: number }[]
}

interface CarritoContextType {
  items: ItemCarrito[]
  agregar: (item: ItemCarrito) => void
  quitar: (producto_id: string, variante_id?: string, talla?: string, cita?: ItemCarrito['cita'], alquiler?: ItemCarrito['alquiler']) => void
  actualizarCantidad: (producto_id: string, cantidad: number, variante_id?: string, talla?: string, cita?: ItemCarrito['cita'], alquiler?: ItemCarrito['alquiler']) => void
  limpiar: () => void
  actualizar: (nuevos: ItemCarrito[]) => void
  conteo: number
  subtotal: number
  hidratado: boolean
}

const CarritoContext = createContext<CarritoContextType | undefined>(undefined)

const CLAVE   = 'tienda_carrito'
const CLAVE_V = 'tienda_carrito_v'
const VERSION = '2'  // v2: precio alquiler = tarifa base por día (no × dias)

function leerCarrito(): ItemCarrito[] {
  if (typeof window === 'undefined') return []
  try {
    const version = localStorage.getItem(CLAVE_V) ?? '1'
    const items = (JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as ItemCarrito[])
      .filter(i => i.tipo_producto !== 'evento')
    if (version !== VERSION) {
      // Items de alquiler del formato anterior tenían precio × dias baked in — eliminarlos
      const migrados = items.filter(i => i.tipo_producto !== 'alquiler')
      guardarCarrito(migrados)
      return migrados
    }
    return items
  } catch { return [] }
}

function guardarCarrito(items: ItemCarrito[]) {
  localStorage.setItem(CLAVE, JSON.stringify(items))
  localStorage.setItem(CLAVE_V, VERSION)
}

function claveItem(item: Pick<ItemCarrito, 'producto_id' | 'variante_id' | 'talla' | 'cita' | 'alquiler'>) {
  const citaStr = item.cita ? `${item.cita.fecha}|${item.cita.hora_inicio}` : ''
  const alquilerStr = item.alquiler ? `${item.alquiler.fecha_inicio}|${item.alquiler.fecha_fin}` : ''
  return `${item.producto_id}|${item.variante_id ?? ''}|${item.talla ?? ''}|${citaStr}|${alquilerStr}`
}

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([])
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    setItems(leerCarrito())
    setHidratado(true)
  }, [])

  const actualizar = useCallback((nuevos: ItemCarrito[]) => {
    setItems(nuevos)
    guardarCarrito(nuevos)
  }, [])

  const agregar = useCallback((item: ItemCarrito) => {
    setItems(prev => {
      const clave = claveItem(item)
      const existe = prev.find(i => claveItem(i) === clave)
      const nuevos = existe
        ? prev.map(i => claveItem(i) === clave ? { ...i, cantidad: i.cantidad + item.cantidad } : i)
        : [...prev, item]
      guardarCarrito(nuevos)
      return nuevos
    })
  }, [])

  const quitar = useCallback((producto_id: string, variante_id?: string, talla?: string, cita?: ItemCarrito['cita'], alquiler?: ItemCarrito['alquiler']) => {
    setItems(prev => {
      const nuevos = prev.filter(i => claveItem(i) !== claveItem({ producto_id, variante_id, talla, cita, alquiler }))
      guardarCarrito(nuevos)
      return nuevos
    })
  }, [])

  const actualizarCantidad = useCallback((producto_id: string, cantidad: number, variante_id?: string, talla?: string, cita?: ItemCarrito['cita'], alquiler?: ItemCarrito['alquiler']) => {
    setItems(prev => {
      const nuevos = cantidad <= 0
        ? prev.filter(i => claveItem(i) !== claveItem({ producto_id, variante_id, talla, cita, alquiler }))
        : prev.map(i => claveItem(i) === claveItem({ producto_id, variante_id, talla, cita, alquiler }) ? { ...i, cantidad } : i)
      guardarCarrito(nuevos)
      return nuevos
    })
  }, [])

  const limpiar = useCallback(() => {
    setItems([])
    guardarCarrito([])
  }, [])

  const conteo = items.reduce((s, i) => s + i.cantidad, 0)
  const subtotal = items.reduce((s, i) => {
    const dias = i.tipo_producto === 'alquiler' && i.alquiler ? i.alquiler.dias : 1
    return s + i.precio * dias * i.cantidad
  }, 0)

  return (
    <CarritoContext.Provider value={{ 
      items, agregar, quitar, actualizarCantidad, limpiar, actualizar,
      conteo, subtotal, hidratado 
    }}>
      {children}
    </CarritoContext.Provider>
  )
}

export function useCarritoContext() {
  const context = useContext(CarritoContext)
  if (context === undefined) {
    throw new Error('useCarritoContext debe ser usado dentro de un CarritoProvider')
  }
  return context
}
