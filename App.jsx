import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, ArrowUpRight,
  ArrowDownRight, LogIn, LogOut, ChartNoAxesCombined, ShieldCheck, X
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  addTransaction, checkApi, deleteTransaction, getToken, listTransactions,
  loginUser, registerUser, setToken
} from './api'

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Salary', 'Freelance', 'Education', 'Other']
const COLORS = ['#7c3aed', '#06b6d4', '#f59e0b', '#f43f5e', '#10b981', '#6366f1', '#ec4899', '#84cc16', '#64748b']
const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value || 0)
const today = () => {
  const date = new Date()
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 10)
}

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [apiOnline, setApiOnline] = useState(false)
  const [user, setUser] = useState(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [form, setForm] = useState({
    title: '', amount: '', type: 'expense', category: 'Food', date: today(), note: ''
  })
  const [filterCategory, setFilterCategory] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  async function refresh() {
    try {
      setTransactions(await listTransactions())
    } catch (error) {
      setMessage(error.message || 'Could not load transactions.')
    }
  }

  useEffect(() => {
    checkApi().then(setApiOnline).catch(() => setApiOnline(false))
    refresh()
    if (getToken()) {
  setUser({
    name: localStorage.getItem('pocketplan_user_name') || 'Your account'
  })
}
  }, [])

  const filtered = useMemo(() => transactions.filter(item => {
    const categoryOk = filterCategory === 'All' || item.category === filterCategory
    const typeOk = filterType === 'All' || item.type === filterType
    const date = (item.date || '').slice(0, 10)
    return categoryOk && typeOk &&
      (!fromDate || date >= fromDate) &&
      (!toDate || date <= toDate)
  }), [transactions, filterCategory, filterType, fromDate, toDate])

  const totals = useMemo(() => {
    const income = filtered
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    const expenses = filtered
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0)
    return { income, expenses, balance: income - expenses }
  }, [filtered])

  const chartData = useMemo(() => {
    const totalsByCategory = {}
    filtered.filter(t => t.type === 'expense').forEach(t => {
      totalsByCategory[t.category] =
        (totalsByCategory[t.category] || 0) + Number(t.amount)
    })
    return Object.entries(totalsByCategory).map(([name, value]) => ({ name, value }))
  }, [filtered])

  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      months.push({
        key,
        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        income: 0,
        expenses: 0
      })
    }

    const lookup = Object.fromEntries(months.map(month => [month.key, month]))

    transactions.forEach(item => {
      const key = (item.date || '').slice(0, 7)
      if (!lookup[key]) return

      if (item.type === 'income') {
        lookup[key].income += Number(item.amount)
      } else if (item.type === 'expense') {
        lookup[key].expenses += Number(item.amount)
      }
    })

    return months
  }, [transactions])

  async function submitTransaction(event) {
    event.preventDefault()
    setMessage('')

    if (!form.title.trim() || !form.amount || Number(form.amount) <= 0) {
      setMessage('Enter a description and an amount greater than zero.')
      return
    }

    setLoading(true)
    try {
      await addTransaction({ ...form, title: form.title.trim(), amount: Number(form.amount) })
      setForm({
        title: '', amount: '', type: 'expense', category: 'Food', date: today(), note: ''
      })
      await refresh()
      setMessage('Transaction added successfully.')
    } catch (error) {
      setMessage(error.message || 'Could not add transaction.')
    } finally {
      setLoading(false)
    }
  }

  async function removeTransaction(id) {
    setDeletingId(id)
    setMessage('')
    try {
      await deleteTransaction(id)
      await refresh()
      setMessage('Transaction deleted.')
    } catch (error) {
      setMessage(error.message || 'Could not delete transaction.')
    } finally {
      setDeletingId(null)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')
    setAuthLoading(true)

    try {
      const account = authMode === 'register'
        ? await registerUser(authForm)
        : await loginUser(authForm)

      setUser(account)
      localStorage.setItem('pocketplan_user_name', account?.name || 'Your account')
      setAuthOpen(false)
      setAuthForm({ name: '', email: '', password: '' })
      await refresh()
      setMessage(`Welcome${account?.name ? `, ${account.name}` : ''}!`)
    } catch (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  function logout() {
    setToken(null)
    localStorage.removeItem('pocketplan_user_name')
    setUser(null)
    setMessage('Logged out.')
    refresh()
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark"><Wallet size={21} /></span>
          <span>Pocket<span className="brand-accent">Plan</span><small>PERSONAL FINANCE</small></span>
        </a>

        <div className="top-actions">
          <span className={`status ${apiOnline ? 'online' : 'offline'}`}>
            <i />{apiOnline ? 'API connected' : 'Demo mode'}
          </span>
          {user ? (
            <button className="button button-ghost" onClick={logout}>
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <button className="button button-ghost" onClick={() => {
              setAuthOpen(true)
              setAuthMode('login')
              setAuthError('')
            }}>
              <LogIn size={16} /> Log in
            </button>
          )}
        </div>
      </header>

      <main className="main-content">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">YOUR MONEY, IN CONTROL</p>
            <h1>{user?.name ? `Welcome, ${user.name}!` : 'Good money habits'} <span>{user?.name ? 'Let’s plan ahead.' : 'start here.'}</span></h1>
            <p className="subtitle">A clear picture of your finances, all in one place.</p>
          </div>
          <div className="date-chip">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
            })}
          </div>
        </section>

        {!apiOnline && (
          <div className="notice">
            <ShieldCheck size={18} />
            <span><strong>Demo mode is active.</strong> Try the tracker now. To save account data in MongoDB, start the backend and configure your database.</span>
          </div>
        )}

        {message && (
          <div className="message" role="status">
            {message}
            <button onClick={() => setMessage('')} aria-label="Dismiss message"><X size={15} /></button>
          </div>
        )}

        <section className="summary-grid">
          <SummaryCard title="Total balance" amount={totals.balance} icon={<Wallet />} tone="purple" hint="Income minus expenses" />
          <SummaryCard title="Total income" amount={totals.income} icon={<TrendingUp />} tone="green" hint="Money received" />
          <SummaryCard title="Total expenses" amount={totals.expenses} icon={<TrendingDown />} tone="orange" hint="Money spent" />
        </section>

        <section className="content-grid">
          <div className="panel transaction-panel">
            <div className="panel-heading">
              <div><p className="eyebrow">RECORD ACTIVITY</p><h2>Add transaction</h2></div>
              <span className="heading-icon"><Plus size={18} /></span>
            </div>

            <form onSubmit={submitTransaction} className="transaction-form">
              <label>Description
                <input
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Grocery shopping"
                  maxLength="80"
                  required
                />
              </label>

              <div className="field-row">
                <label>Amount (₹)
                  <input
                    type="number" min="0.01" step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0.00" required
                  />
                </label>
                <label>Date
                  <input
                    type="date" value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    required
                  />
                </label>
              </div>

              <div className="type-switch" role="group" aria-label="Transaction type">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'type-option selected expense' : 'type-option'}
                  onClick={() => setForm({ ...form, type: 'expense', category: 'Food' })}
                ><ArrowUpRight size={16} /> Expense</button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'type-option selected income' : 'type-option'}
                  onClick={() => setForm({ ...form, type: 'income', category: 'Salary' })}
                ><ArrowDownRight size={16} /> Income</button>
              </div>

              <label>Category
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              <label>Note <span className="optional">(optional)</span>
                <input
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="Add a short note" maxLength="160"
                />
              </label>

              <button className="button button-primary submit-button" type="submit" disabled={loading}>
                <Plus size={17} /> {loading ? 'Adding...' : 'Add transaction'}
              </button>
            </form>
          </div>

          <div className="right-column">
            <section className="panel chart-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">SPENDING BREAKDOWN</p><h2>Where it goes</h2></div>
                <span className="heading-icon"><ChartNoAxesCombined size={18} /></span>
              </div>

              {chartData.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={235}>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={3}>
                        {chartData.map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={value => money(value)} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <div className="empty-chart-icon"><ChartNoAxesCombined size={25} /></div>
                  <strong>No spending data yet</strong>
                  <span>Add an expense to see your chart.</span>
                </div>
              )}
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div><p className="eyebrow">MONTHLY OVERVIEW</p><h2>Income vs expenses</h2></div>
                <span className="heading-icon"><ChartNoAxesCombined size={18} /></span>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={value => value >= 1000 ? `₹${value / 1000}k` : `₹${value}`} />
                    <Tooltip formatter={value => money(value)} />
                    <Legend />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="tip-card">
              <div className="tip-icon">✦</div>
              <div><strong>A small tip</strong><p>Review your spending each week. Small changes can make a big difference over time.</p></div>
            </section>
          </div>
        </section>

        <section className="panel history-panel">
          <div className="history-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>
              <h2>Recent transactions <span className="count-pill">{filtered.length}</span></h2>
            </div>
            <div className="filters">
              <select value={filterType} onChange={e => setFilterType(e.target.value)} aria-label="Filter by type">
                <option value="All">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </select>
              <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} aria-label="Filter by category">
                <option value="All">All categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} aria-label="From date" title="From date" />
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} aria-label="To date" title="To date" />
              <button className="button button-ghost" type="button" onClick={() => {
                setFilterType('All')
                setFilterCategory('All')
                setFromDate('')
                setToDate('')
              }}>Clear filters</button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Transaction</th><th>Category</th><th>Date</th><th>Amount</th><th aria-label="Actions"></th></tr>
              </thead>
              <tbody>
                {filtered.slice().sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => (
                  <tr key={item._id}>
                    <td>
                      <div className="transaction-name">
                        <span className={`transaction-symbol ${item.type}`}>
                          {item.type === 'income' ? <ArrowDownRight size={17} /> : <ArrowUpRight size={17} />}
                        </span>
                        <span><strong>{item.title}</strong>{item.note && <small>{item.note}</small>}</span>
                      </div>
                    </td>
                    <td><span className="category-pill">{item.category}</span></td>
                    <td className="muted">
                      {item.date ? new Date(`${item.date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      }) : '—'}
                    </td>
                    <td className={`amount ${item.type}`}>
                      {item.type === 'income' ? '+' : '−'}{money(item.amount)}
                    </td>
                    <td>
                      <button
                        className="icon-button delete-button"
                        onClick={() => removeTransaction(item._id)}
                        title="Delete transaction"
                        aria-label={`Delete ${item.title}`}
                        disabled={deletingId === item._id}
                      >{deletingId === item._id ? '...' : <Trash2 size={16} />}</button>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan="5">
                    <div className="empty-table">
                      <span className="empty-table-icon"><Wallet size={23} /></span>
                      <strong>No transactions found</strong>
                      <p>Add a transaction or change your filters.</p>
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          <span>© {new Date().getFullYear()} PocketPlan</span>
          <span>Build better money habits, one step at a time.</span>
        </footer>
      </main>

      {authOpen && (
        <div className="modal-backdrop" onClick={() => setAuthOpen(false)}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setAuthOpen(false)} aria-label="Close"><X size={18} /></button>
            <div className="auth-logo"><Wallet size={23} /></div>
            <p className="eyebrow">WELCOME TO POCKETPLAN</p>
            <h2>{authMode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="auth-subtitle">
              {authMode === 'login' ? 'Log in to access your saved transactions.' : 'Start keeping track of your money.'}
            </p>

            <form onSubmit={submitAuth} className="transaction-form">
              {authMode === 'register' && (
                <label>Your name
                  <input
                    value={authForm.name}
                    onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                    required minLength="2"
                  />
                </label>
              )}
              <label>Email address
                <input
                  type="email"
                  value={authForm.email}
                  onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </label>
              <label>Password
                <input
                  type="password"
                  value={authForm.password}
                  onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                  required minLength="8" placeholder="At least 8 characters"
                />
              </label>
              {authError && <p className="form-error">{authError}</p>}
              <button className="button button-primary submit-button" disabled={authLoading}>
                {authLoading ? 'Please wait...' : authMode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <p className="auth-toggle">
              {authMode === 'login' ? 'New to PocketPlan?' : 'Already have an account?'}
              {' '}
              <button onClick={() => {
                setAuthMode(authMode === 'login' ? 'register' : 'login')
                setAuthError('')
              }}>{authMode === 'login' ? 'Create account' : 'Log in'}</button>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({ title, amount, icon, tone, hint }) {
  return (
    <article className="summary-card">
      <div className="summary-top">
        <span>{title}</span>
        <span className={`summary-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="summary-amount">{money(amount)}</strong>
      <span className="summary-hint">{hint}</span>
      <div className={`summary-line ${tone}`} />
    </article>
  )
}