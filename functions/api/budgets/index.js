import { badRequest, isISODate, json, serverError } from '../../_utils.js'

export async function onRequestPost({ env, request }) {
  try {
    const body = await request.json()

    const name = body.name
      ? String(body.name).trim().slice(0, 50)
      : null

    const startDate = body.start_date
    const endDate = body.end_date

    const cycleLimit = Number(body.cycle_limit)
    const weeklyLimit = Number(body.weekly_limit)

    if (!isISODate(startDate)) {
      return badRequest('Data inicial inválida.')
    }

    if (!isISODate(endDate)) {
      return badRequest('Data final inválida.')
    }

    if (endDate < startDate) {
      return badRequest('A data final deve ser igual ou posterior à data inicial.')
    }

    if (!Number.isFinite(cycleLimit) || cycleLimit <= 0) {
      return badRequest('O limite do ciclo deve ser maior que zero.')
    }

    if (!Number.isFinite(weeklyLimit) || weeklyLimit <= 0) {
      return badRequest('O limite semanal deve ser maior que zero.')
    }

    /*
      Impede dois ciclos sobrepostos.

      Exemplo inválido:

      28/08 -> 25/09
      20/09 -> 25/10
    */
    const overlapping = await env.DB.prepare(`
      SELECT id
      FROM billing_cycles
      WHERE start_date <= ?
        AND end_date >= ?
      LIMIT 1
    `)
      .bind(endDate, startDate)
      .first()

    if (overlapping) {
      return badRequest('Já existe um ciclo dentro desse intervalo de datas.')
    }

    const row = await env.DB.prepare(`
      INSERT INTO billing_cycles (
        name,
        start_date,
        end_date,
        cycle_limit,
        weekly_limit
      )
      VALUES (?, ?, ?, ?, ?)
      RETURNING
        id,
        name,
        start_date,
        end_date,
        cycle_limit,
        weekly_limit
    `)
      .bind(
        name,
        startDate,
        endDate,
        cycleLimit,
        weeklyLimit
      )
      .first()

    return json({
      ...row,
      cycle_limit: Number(row.cycle_limit),
      weekly_limit: Number(row.weekly_limit),
    })

  } catch (error) {
    return serverError(error)
  }
}
