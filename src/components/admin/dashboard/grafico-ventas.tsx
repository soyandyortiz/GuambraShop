'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { cn, formatearPrecio } from '@/lib/utils'

interface DataPoint {
  etiqueta: string
  valor: number
}

interface Props {
  datos: DataPoint[]
  titulo?: string
  subtitulo?: string
  color?: string
}

export function GraficoVentasPremium({ datos, titulo, subtitulo, color = '#6366f1' }: Props) {
  // Configuración de dimensiones
  const width = 600
  const height = 200
  const padding = 40

  const maxValor = useMemo(() => Math.max(...datos.map(d => d.valor), 100) * 1.2, [datos])
  
  // Generar puntos para el SVG
  const puntos = useMemo(() => {
    if (datos.length === 0) return ''
    return datos.map((d, i) => {
      const x = (i / (datos.length - 1)) * (width - padding * 2) + padding
      const y = height - ((d.valor / maxValor) * (height - padding * 2) + padding)
      return { x, y }
    })
  }, [datos, maxValor])

  const pathD = useMemo(() => {
    if (puntos.length === 0) return ''
    return `M ${puntos[0].x} ${puntos[0].y} ` + puntos.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
  }, [puntos])

  const areaD = useMemo(() => {
    if (puntos.length === 0) return ''
    return `${pathD} L ${puntos[puntos.length - 1].x} ${height} L ${puntos[0].x} ${height} Z`
  }, [pathD, puntos])

  const totalActual = datos[datos.length - 1]?.valor || 0
  const totalPrevio = datos[0]?.valor || 0
  const porcentaje = totalPrevio === 0 ? 100 : ((totalActual - totalPrevio) / totalPrevio) * 100

  return (
    <div className="bg-card border border-card-border rounded-3xl p-6 shadow-sm overflow-hidden relative group">
      
      {/* Fondo decorativo de malla */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-sm font-black text-foreground-muted uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {titulo || 'Rendimiento de Ventas'}
          </h3>
          <p className="text-2xl font-black text-foreground mt-1">{formatearPrecio(totalActual)}</p>
          <p className="text-xs text-foreground-muted font-medium">{subtitulo || 'Últimos 28 días'}</p>
        </div>
        
        <div className={cn(
          "flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black border",
          porcentaje >= 0 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
        )}>
          {porcentaje >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(porcentaje).toFixed(1)}%
        </div>
      </div>

      <div className="relative h-[200px] w-full">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full overflow-visible drop-shadow-xl"
          preserveAspectRatio="none"
        >
          {/* Rejilla "Cartesiana" */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line
              key={p}
              x1={padding}
              y1={padding + p * (height - padding * 2)}
              x2={width - padding}
              y2={padding + p * (height - padding * 2)}
              stroke="currentColor"
              strokeDasharray="4 4"
              className="text-border opacity-30"
            />
          ))}

          {/* Área con Gradiente */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill="url(#areaGradient)" className="animate-in fade-in duration-1000" />

          {/* Línea Principal */}
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-in slide-in-from-left-full duration-1000"
          />

          {/* Puntos de Datos */}
          {puntos.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            />
          ))}
        </svg>
      </div>

      {/* Etiquetas de Tiempo */}
      <div className="flex justify-between mt-4 px-2">
        {datos.filter((_, i) => i % 7 === 0 || i === datos.length - 1).map((d, i) => (
          <span key={i} className="text-[10px] font-bold text-foreground-muted uppercase tracking-tighter">
            {d.etiqueta}
          </span>
        ))}
      </div>

    </div>
  )
}
