import React, { useEffect, useMemo, useState } from 'react'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function isoToday() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function toCurrencyInput(value) {
  if (value === '' || value == null) return ''
  return String(value).replace('.', ',')
}

function parseMoney(value) {
  if (typeof value === 'number') return value
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || 'Não foi possível concluir a operação.')
  }
  return response.status === 204 ? null : response.json()
}

function Progress({ spent, limit }) {
  const percentage = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0
  const status = percentage >= 100 ? 'danger' : percentage >= 80 ? 'warning' : 'ok'
  return (
    <div className="progress-track" aria-label={`${Math.round(percentage)}% utilizado`}>
      <div className={`progress-fill ${status}`} style={{ width: `${percentage}%` }} />
    </div>
  )
}

function BudgetCard({ title, available, spent, limit, subtitle }) {
  const over = available < 0
  return (
    <section className="budget-card">
      <div className="card-title-row">
        <span className="eyebrow">{title}</span>
        {subtitle && <span className="date-range">{subtitle}</span>}
      </div>
      <div className={`available ${over ? 'negative' : ''}`}>{BRL.format(available)}</div>
      <div className="available-label">{over ? 'acima do limite' : 'disponíveis'}</div>
      <Progress spent={spent} limit={limit} />
      <div className="card-foot">
        <span>{BRL.format(spent)} gastos</span>
        <span>de {BRL.format(limit)}</span>
      </div>
    </section>
  )
}

function ExpenseModal({ expense, onClose, onSaved }) {
  const [date, setDate] = useState(expense?.expense_date || isoToday())
  const [amount, setAmount] = useState(expense ? toCurrencyInput(expense.amount) : '')
  const [description, setDescription] = useState(expense?.description || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    const numericAmount = parseMoney(amount)
    if (!date) return setError('Informe a data do gasto.')
    if (numericAmount <= 0) return setError('Informe um valor maior que zero.')
    setSaving(true)
    setError('')
    try {
      const payload = { expense_date: date, amount: numericAmount, description: description.trim() || null }
      if (expense) {
        await api(`/api/expenses/${expense.id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) })
      }
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div className="sheet-header">
          <div>
            <span className="eyebrow">{expense ? 'Editar lançamento' : 'Novo lançamento'}</span>
            <h2>{expense ? 'Editar gasto' : 'Lançar gasto'}</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <form onSubmit={submit} className="form-stack">
          <label>
            <span>Valor</span>
            <div className="money-input-wrap"><b>R$</b><input inputMode="decimal" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" /></div>
          </label>
          <label>
            <span>Data</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label>
            <span>Descrição <em>opcional</em></span>
            <input maxLength="100" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado, gasolina, almoço..." />
          </label>
          {error && <div className="error-box">{error}</div>}
          <button className="primary-btn" disabled={saving}>{saving ? 'Salvando...' : 'Salvar gasto'}</button>
        </form>
      </div>
    </div>
  )
}

function MonthSetup({ initial, onSaved }) {
  const today = isoToday()

  const [name, setName] = useState(initial?.name || '')

  const [startDate, setStartDate] = useState(
    initial?.start_date || today
  )

  const [endDate, setEndDate] = useState(
    initial?.end_date || ''
  )

  const [cycleLimit, setCycleLimit] = useState(
    initial?.cycle_limit
      ? toCurrencyInput(initial.cycle_limit)
      : ''
  )

  const [weekly, setWeekly] = useState(
    initial?.weekly_limit
      ? toCurrencyInput(initial.weekly_limit)
      : ''
  )

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function save(e) {
    e.preventDefault()

    const numericCycleLimit = parseMoney(cycleLimit)
    const weeklyLimit = parseMoney(weekly)

    if (!startDate) {
      setMessage('Informe a data inicial.')
      return
    }

    if (!endDate) {
      setMessage('Informe a data final.')
      return
    }

    if (endDate < startDate) {
      setMessage('A data final deve ser posterior à data inicial.')
      return
    }

    if (numericCycleLimit <= 0 || weeklyLimit <= 0) {
      setMessage('Os dois limites devem ser maiores que zero.')
      return
    }

    setSaving(true)
    setMessage('')

    try {
      await api('/api/budgets', {
        method: 'POST',

        body: JSON.stringify({
          name: name.trim() || null,

          start_date: startDate,
          end_date: endDate,

          cycle_limit: numericCycleLimit,
          weekly_limit: weeklyLimit,
        }),
      })

      setMessage('Ciclo salvo com sucesso.')

      onSaved?.()

    } catch (err) {

      setMessage(err.message)

    } finally {

      setSaving(false)
    }
  }

  return (
    <section className="page-section setup-page">

      <div className="section-heading">
        <div>
          <span className="eyebrow">Planejamento</span>
          <h1>Virar o ciclo</h1>
        </div>
      </div>

      <p className="muted">
        Informe o período da próxima fatura e os limites
        que serão usados durante esse ciclo.
      </p>

      <form
        className="panel form-stack"
        onSubmit={save}
      >

        <label>
          <span>Nome do ciclo <em>opcional</em></span>

          <input
            maxLength="50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Setembro"
          />
        </label>

        <div className="two-cols">

          <label>
            <span>Início do ciclo</span>

            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            <span>Fechamento</span>

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

        </div>

        <label>
          <span>Limite do ciclo</span>

          <div className="money-input-wrap">
            <b>R$</b>

            <input
              inputMode="decimal"
              value={cycleLimit}
              onChange={(e) => setCycleLimit(e.target.value)}
              placeholder="3.000,00"
            />
          </div>
        </label>

        <label>
          <span>Limite semanal</span>

          <div className="money-input-wrap">
            <b>R$</b>

            <input
              inputMode="decimal"
              value={weekly}
              onChange={(e) => setWeekly(e.target.value)}
              placeholder="700,00"
            />
          </div>
        </label>

        {message && (
          <div
            className={
              message.includes('sucesso')
                ? 'success-box'
                : 'error-box'
            }
          >
            {message}
          </div>
        )}

        <button
          className="primary-btn"
          disabled={saving}
        >
          {saving
            ? 'Salvando...'
            : 'Salvar ciclo'}
        </button>

      </form>

    </section>
  )
}

function ExpenseList({ items, onEdit, onDeleted, full = false }) {
  const [deleting, setDeleting] = useState(null)

  async function remove(expense) {
    if (!confirm(`Excluir o gasto de ${BRL.format(expense.amount)}${expense.description ? ` (${expense.description})` : ''}?`)) return
    setDeleting(expense.id)
    try {
      await api(`/api/expenses/${expense.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (!items.length) return <div className="empty-state"><div>✓</div><strong>Nenhum gasto encontrado</strong><span>Seus lançamentos aparecerão aqui.</span></div>

  return <div className="expense-list">{items.map(item => {
    const date = new Date(`${item.expense_date}T12:00:00`)
    return <article className="expense-row" key={item.id}>
      <div className="expense-date"><strong>{String(date.getDate()).padStart(2,'0')}</strong><span>{MONTHS[date.getMonth()].slice(0,3)}</span></div>
      <div className="expense-info"><strong>{item.description || 'Sem descrição'}</strong><span>{date.toLocaleDateString('pt-BR', { weekday: 'short' })}</span></div>
      <div className="expense-value">{BRL.format(item.amount)}</div>
      <button className="dots-btn" onClick={() => onEdit(item)} title="Editar">✎</button>
      {full && <button className="trash-btn" disabled={deleting===item.id} onClick={() => remove(item)} title="Excluir">⌫</button>}
    </article>
  })}</div>
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [dashboard, setDashboard] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [monthExpenses, setMonthExpenses] = useState([])
  const [modalExpense, setModalExpense] = useState(undefined)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

 async function load() {
  setLoading(true)
  setError('')

  try {

    const [dash, latest] = await Promise.all([
      api('/api/dashboard'),
      api('/api/expenses?limit=8'),
    ])

    setDashboard(dash)

    setExpenses(latest.items)

    if (dash.cycle) {

      const current = await api(
        `/api/expenses?start=${dash.cycle.start_date}&end=${dash.cycle.end_date}&limit=500`
      )

      setMonthExpenses(current.items)

    } else {

      setMonthExpenses([])
    }

  } catch (err) {

    setError(err.message)

  } finally {

    setLoading(false)
  }
}

  useEffect(() => { load() }, [])

  const setupInitial = useMemo(
  () => dashboard?.cycle || null,
  [dashboard]
)

  function openNew() { setModalExpense(undefined); setShowModal(true) }
  function openEdit(item) { setModalExpense(item); setShowModal(true) }
  function saved() { setShowModal(false); load() }

  return (
    <div className="app-shell">
      <header className="topbar"><div className="brand-mark">$</div><div><strong>Finanças Diárias</strong><span>Seu limite, sempre à vista</span></div></header>

      <main>
        {loading && <div className="loading"><div className="spinner"/><span>Atualizando seus números...</span></div>}
        {!loading && error && <div className="page-section"><div className="error-box">{error}</div><button className="secondary-btn" onClick={load}>Tentar novamente</button></div>}

        {!loading && !error && tab === 'home' && dashboard && <section className="page-section home-page">
          <div className="hero-row">
            <div><span className="eyebrow">
  {dashboard.cycle
    ? dashboard.cycle.name || 'Ciclo atual'
    : 'Sem ciclo configurado'}
</span><h1>Quanto posso gastar?</h1></div>
            <button className="round-add" onClick={openNew}>+</button>
          </div>

          {!dashboard.cycle ? <div className="setup-callout"><strong>Configure o ciclo da fatura</strong><p>Informe o período da fatura, o limite do ciclo e o limite semanal.</p><button className="primary-btn" onClick={() => setTab('month')}>Configurar agora</button></div> : <>
            <BudgetCard title="Esta semana" available={dashboard.week.available} spent={dashboard.week.spent} limit={dashboard.week.limit} subtitle={`${dashboard.week.start_br} — ${dashboard.week.end_br}`} />
            <BudgetCard
  title="Este ciclo"
  available={dashboard.cycle_summary.available}
  spent={dashboard.cycle_summary.spent}
  limit={dashboard.cycle_summary.limit}
  subtitle={
    `${dashboard.cycle.start_br} — ${dashboard.cycle.end_br}`
  }
/>
          </>}

          <button className="big-expense-btn" onClick={openNew}><span>＋</span><div><strong>Lançar gasto</strong><small>Leva menos de 10 segundos</small></div></button>

          <div className="list-heading"><div><span className="eyebrow">Movimentações</span><h2>Últimos gastos</h2></div><button onClick={() => setTab('history')}>Ver todos</button></div>
          <ExpenseList items={expenses} onEdit={openEdit} onDeleted={load} />
        </section>}

        {!loading && !error && tab === 'history' && <section className="page-section">
          <div className="section-heading"><div><span className="eyebrow">Histórico</span><h1>Gastos do ciclo</h1></div><button className="round-add" onClick={openNew}>+</button></div>
         <div className="history-summary">

  <span>
    {dashboard?.cycle
      ? `Total de ${dashboard.cycle.start_br} a ${dashboard.cycle.end_br}`
      : 'Total do ciclo'}
  </span>

  <strong>
    {BRL.format(
      monthExpenses.reduce(
        (sum, x) => sum + Number(x.amount),
        0
      )
    )}
  </strong>

</div>
          <ExpenseList full items={monthExpenses} onEdit={openEdit} onDeleted={load} />
        </section>}

        {!loading && !error && tab === 'month' && <MonthSetup initial={setupInitial} onSaved={load} />}
      </main>

      <nav className="bottom-nav">
        <button className={tab==='home'?'active':''} onClick={() => setTab('home')}><span>⌂</span><small>Início</small></button>
        <button className={tab==='history'?'active':''} onClick={() => setTab('history')}><span>≡</span><small>Histórico</small></button>
        <button className={tab==='month'?'active':''} onClick={() => setTab('month')}><span>↻</span><small>Virar ciclo</small></button>
      </nav>

      {showModal && <ExpenseModal expense={modalExpense} onClose={() => setShowModal(false)} onSaved={saved} />}
    </div>
  )
}
