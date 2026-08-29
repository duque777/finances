import { brDate, json, localDateParts, serverError, weekBoundsSundayToSaturday } from '../_utils.js'

export async function onRequestGet({ env, request }) {
  try {
    const now = localDateParts(request)
    const monthStart = `${now.year}-${String(now.month).padStart(2,'0')}-01`
    const nextMonthDate = new Date(Date.UTC(now.year, now.month, 1))
    const nextMonth = nextMonthDate.toISOString().slice(0,10)
    const week = weekBoundsSundayToSaturday(now.iso)

    const budget = await env.DB.prepare('SELECT year, month, monthly_limit, weekly_limit FROM monthly_budgets WHERE year = ? AND month = ?').bind(now.year, now.month).first()
    const monthRow = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS spent FROM expenses WHERE expense_date >= ? AND expense_date < ?').bind(monthStart, nextMonth).first()
    const weekRow = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS spent FROM expenses WHERE expense_date BETWEEN ? AND ?').bind(week.start, week.end).first()

    const monthSpent = Number(monthRow?.spent || 0)
    const weekSpent = Number(weekRow?.spent || 0)
    const monthlyLimit = Number(budget?.monthly_limit || 0)
    const weeklyLimit = Number(budget?.weekly_limit || 0)

    return json({
      year: now.year,
      month: now.month,
      today: now.iso,
      budget: budget ? { year: budget.year, month: budget.month, monthly_limit: monthlyLimit, weekly_limit: weeklyLimit } : null,
      week: { start: week.start, end: week.end, start_br: brDate(week.start), end_br: brDate(week.end), spent: weekSpent, limit: weeklyLimit, available: weeklyLimit - weekSpent },
      month_summary: { spent: monthSpent, limit: monthlyLimit, available: monthlyLimit - monthSpent },
    })
  } catch (error) { return serverError(error) }
}
