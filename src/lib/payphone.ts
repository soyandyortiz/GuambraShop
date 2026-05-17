const PAYPHONE_BASE = 'https://pay.payphonetodoesposible.com/api/button'

export async function crearTransaccionPayphone(opts: {
  token: string
  amount: number
  clientTransactionId: string
  responseUrl: string
  cancellationUrl: string
  storeId?: string | null
  reference?: string
}) {
  const cents = Math.round(opts.amount * 100)
  const res = await fetch(`${PAYPHONE_BASE}/Payments/pay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: cents,
      amountWithTax: cents,
      tax: 0,
      clientTransactionId: opts.clientTransactionId,
      currency: 'USD',
      responseUrl: opts.responseUrl,
      cancellationUrl: opts.cancellationUrl,
      storeId: opts.storeId ?? undefined,
      reference: opts.reference ?? 'Pedido',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Payphone error ${res.status}: ${body}`)
  }
  return res.json() as Promise<{ paymentId: number; payWithCard: string }>
}

export async function verificarPagoPayphone(opts: {
  token: string
  id: number | string
  clientTransactionId: string
}) {
  const res = await fetch(`${PAYPHONE_BASE}/Payments/confirm`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      id: Number(opts.id),
      clientTransactionId: opts.clientTransactionId,
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Payphone verify error ${res.status}: ${body}`)
  }
  return res.json() as Promise<{
    transactionStatus: string
    statusCode: number
    authorizationCode: string
    message: string
    clientTransactionId: string
    id: number
    amount: number
  }>
}
