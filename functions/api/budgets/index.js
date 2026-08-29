import { badRequest, json, serverError } from '../../_utils.js'

export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json()
    const year = Number(body.year), month = Number(body.month), monthly = Number(body.monthly_limit), weekly = Number(body.weekly_limit)
    if (!Number.isInteger(year) || year < 2020 || year > 2100) return badRequest('Ano inválido.')
    if (!Number.isInteger(month) || month < 1 || month > 12) return badRequest('Mês inválido.')
    if (!Number.isFinite(monthly) || monthly <= 0 || !Number.isFinite(weekly) || weekly <= 0) return badRequest('Os limites devem ser maiores que zero.')
    const row = await env.DB.prepare(`
      INSERT INTO monthly_budgets (year, month, monthly_limit, weekly_limit)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(year, month) DO UPDATE SET monthly_limit=excluded.monthly_limit, weekly_limit=excluded.weekly_limit, updated_at=CURRENT_TIMESTAMP
      RETURNING year, month, monthly_limit, weekly_limit
    `).bind(year, month, monthly, weekly).first()
    return json({ ...row, monthly_limit: Number(row.monthly_limit), weekly_limit: Number(row.weekly_limit) })
  } catch (error) { return serverError(error) }
}
