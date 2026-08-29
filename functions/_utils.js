export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } })
}

export function badRequest(message) { return json({ error: message }, 400) }
export function serverError(error) { console.error(error); return json({ error: 'Erro interno do servidor.' }, 500) }

export function isISODate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) }

export function brDate(iso) {
  const [y,m,d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function localDateParts(request) {
  const now = new Date()
  // Cloudflare executa em UTC. O frontend envia timezone apenas quando necessário; para a home usamos horário de Brasília fixo.
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' })
  const parts = Object.fromEntries(formatter.formatToParts(now).filter(p => p.type !== 'literal').map(p => [p.type, p.value]))
  return { year:Number(parts.year), month:Number(parts.month), day:Number(parts.day), iso:`${parts.year}-${parts.month}-${parts.day}` }
}

export function weekBoundsSundayToSaturday(iso) {
  const [y,m,d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  const weekday = date.getUTCDay()
  const start = new Date(date); start.setUTCDate(date.getUTCDate() - weekday)
  const end = new Date(start); end.setUTCDate(start.getUTCDate() + 6)
  return { start: start.toISOString().slice(0,10), end: end.toISOString().slice(0,10) }
}
