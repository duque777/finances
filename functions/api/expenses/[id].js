import { badRequest, isISODate, json, serverError } from '../../_utils.js'

export async function onRequestPut({ env, request, params }) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return badRequest('ID inválido.')
    const body = await request.json()
    if (!isISODate(body.expense_date)) return badRequest('Data inválida.')
    const amount = Number(body.amount)
    if (!Number.isFinite(amount) || amount <= 0) return badRequest('Valor inválido.')
    const description = body.description ? String(body.description).trim().slice(0,100) : null
    const row = await env.DB.prepare("UPDATE expenses SET expense_date = ?, amount = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? RETURNING id, expense_date, amount, description, created_at, updated_at").bind(body.expense_date, amount, description || null, id).first()
    if (!row) return json({ error: 'Gasto não encontrado.' }, 404)
    return json({ ...row, amount: Number(row.amount) })
  } catch (error) { return serverError(error) }
}

export async function onRequestDelete({ env, params }) {
  try {
    const id = Number(params.id)
    if (!Number.isInteger(id) || id <= 0) return badRequest('ID inválido.')
    const row = await env.DB.prepare('DELETE FROM expenses WHERE id = ? RETURNING id').bind(id).first()
    if (!row) return json({ error: 'Gasto não encontrado.' }, 404)
    return new Response(null, { status: 204 })
  } catch (error) { return serverError(error) }
}
