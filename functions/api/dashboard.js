import {
  brDate,
  json,
  localDateParts,
  serverError,
  weekBoundsSundayToSaturday
} from '../_utils.js'

export async function onRequestGet({ env, request }) {
  try {
    const now = localDateParts(request)

    /*
      Procura o ciclo que contém HOJE.

      Exemplo:
      hoje = 29/08
      ciclo = 28/08 até 25/09
    */
    const cycle = await env.DB.prepare(`
      SELECT
        id,
        name,
        start_date,
        end_date,
        cycle_limit,
        weekly_limit
      FROM billing_cycles
      WHERE start_date <= ?
        AND end_date >= ?
      ORDER BY start_date DESC
      LIMIT 1
    `)
      .bind(now.iso, now.iso)
      .first()

    /*
      Mesmo sem ciclo configurado,
      ainda conseguimos calcular a semana.
    */
    const week = weekBoundsSundayToSaturday(now.iso)

    if (!cycle) {
      return json({
        today: now.iso,

        cycle: null,

        week: {
          start: week.start,
          end: week.end,
          start_br: brDate(week.start),
          end_br: brDate(week.end),
          spent: 0,
          limit: 0,
          available: 0,
        },

        cycle_summary: {
          spent: 0,
          limit: 0,
          available: 0,
        },
      })
    }

    /*
      Total gasto durante TODO o ciclo.
    */
    const cycleRow = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS spent
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
    `)
      .bind(cycle.start_date, cycle.end_date)
      .first()

    /*
      Para a semana, também respeitamos os limites do ciclo.

      Isso é importante quando uma semana começa antes
      do início da fatura ou termina depois dela.
    */

    const weekStart =
      week.start < cycle.start_date
        ? cycle.start_date
        : week.start

    const weekEnd =
      week.end > cycle.end_date
        ? cycle.end_date
        : week.end

    const weekRow = await env.DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS spent
      FROM expenses
      WHERE expense_date BETWEEN ? AND ?
    `)
      .bind(weekStart, weekEnd)
      .first()

    const cycleSpent = Number(cycleRow?.spent || 0)
    const weekSpent = Number(weekRow?.spent || 0)

    const cycleLimit = Number(cycle.cycle_limit || 0)
    const weeklyLimit = Number(cycle.weekly_limit || 0)

    return json({
      today: now.iso,

      cycle: {
        id: cycle.id,
        name: cycle.name,

        start_date: cycle.start_date,
        end_date: cycle.end_date,

        start_br: brDate(cycle.start_date),
        end_br: brDate(cycle.end_date),

        cycle_limit: cycleLimit,
        weekly_limit: weeklyLimit,
      },

      week: {
        start: weekStart,
        end: weekEnd,

        start_br: brDate(weekStart),
        end_br: brDate(weekEnd),

        spent: weekSpent,
        limit: weeklyLimit,
        available: weeklyLimit - weekSpent,
      },

      cycle_summary: {
        spent: cycleSpent,
        limit: cycleLimit,
        available: cycleLimit - cycleSpent,
      },
    })

  } catch (error) {
    return serverError(error)
  }
}
