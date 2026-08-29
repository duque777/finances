import { badRequest, isISODate, json, serverError } from '../../_utils.js'

export async function onRequestGet({ env, request }) {
  try {
    const url = new URL(request.url)
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 500)
    const year = Number(url.searchParams.get('year'))
    const month = Number(url.searchParams.get('month'))
    let stmt
    if (year && month >= 1 && month <= 12) {
      const start = `${year}-${String(month).padStart(2,'0')}-01`
      const next = new Date(Date.UTC(year, month, 1)).toISOString().slice(0,10)
      stmt = env.DB.prepare('SELECT id, expense_date, amount, description, created_at, updated_at FROM expenses WHERE expense_date >= ? AND expense_date < ? ORDER BY expense_date DESC, id DESC LIMIT ?').bind(start, next, limit)
    } else {
      stmt = env.DB.prepare('SELECT id, expense_date, amount, description, created_at, updated_at FROM expenses ORDER BY expense_date DESC, id DESC LIMIT ?').bind(limit)
    }
    const { results } = await stmt.all()
    return json({ items: results.map(x => ({ ...x, amount: Number(x.amount) })) })
  } catch (error) { return serverError(error) }
}

export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json()
    if (!isISODate(body.expense_date)) return badRequest('Data inválida.')
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) return badRequest('Valor inválido.')
    const description = body.description ? String(body.description).trim().slice(0,100) : null
    const result = await env.DB.prepare('INSERT INTO expenses (expense_date, amount, description) VALUES (?, ?, ?) RETURNING id, expense_date, amount, description, created_at, updated_at').bind(body.expense_date, amount, description || null).first()
    return json({ ...result, amount: Number(result.amount) }, 201)
  } catch (error) { return serverError(error) }
}
