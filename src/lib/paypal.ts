/**
 * Helpers para la API de PayPal (Orders v2).
 * Usados solo en rutas de servidor — nunca importar en cliente.
 */

export function obtenerBaseUrl(modo: string): string {
  return modo === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

export async function obtenerToken(clientId: string, secret: string, modo: string): Promise<string> {
  const base = obtenerBaseUrl(modo)
  const credenciales = Buffer.from(`${clientId}:${secret}`).toString('base64')
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credenciales}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error_description ?? 'Error al autenticar con PayPal')
  return data.access_token as string
}

export async function crearOrdenPayPal(opts: {
  token: string
  modo: string
  total: number
  moneda: string
  referencia: string
}): Promise<{ id: string }> {
  const base = obtenerBaseUrl(opts.modo)
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: opts.referencia,
        amount: {
          currency_code: opts.moneda,
          value: opts.total.toFixed(2),
        },
      }],
    }),
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Error al crear orden en PayPal')
  return { id: data.id }
}

export async function capturarOrdenPayPal(opts: {
  token: string
  modo: string
  paypalOrderId: string
}): Promise<{ status: string; captureId: string }> {
  const base = obtenerBaseUrl(opts.modo)
  const res = await fetch(`${base}/v2/checkout/orders/${opts.paypalOrderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Error al capturar pago en PayPal')
  const captureId = data.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? ''
  return { status: data.status as string, captureId }
}
