
import { useEffect, useMemo, useState } from 'react'
import {
  Wallet, TrendingUp, TrendingDown, Plus, Trash2, ArrowUpRight,
  ArrowDownRight, LogIn, LogOut, ChartNoAxesCombined, ShieldCheck, X,
  Eye, EyeOff
} from 'lucide-react'
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import {
  addTransaction, checkApi, deleteTransaction, getToken, listTransactions,
  loginUser, registerUser, setToken
} from './api'

const CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Health',
  'Salary', 'Freelance', 'Education', 'Other'
]

const COLORS = [
  '#7c3aed', '#06b6d4', '#f59e0b', '#f43f5e',
  '#10b981', '#6366f1', '#ec4899', '#84cc16', '#64748b'
]

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0
}).format(value || 0)

const today = () => new Date().toISOString().slice(0, 10)

const strongPasswordRegex =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [apiOnline, setApiOnline] = useState(false)
  const [user, setUser] = useState(null)

  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [showPassword, setShowPassword] = useState(false)

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: ''
  })

  const [authError, setAuthError] = useState('')

  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    date: today(),
    note: ''
  })

  const [filterCategory, setFilterCategory] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [message, setMessage] = useState('')
  const [descriptionError, setDescriptionError] = useState('')

  async function refresh() {
    try {
      setTransactions(await listTransactions())
    } catch (error) {
      setMessage(error.message)
    }
  }

  useEffect(() => {
    checkApi().then(setApiOnline)
    refresh()

    if (getToken()) {
      const savedName = localStorage.getItem('pocketplan_user_name')
      setUser({ name: savedName || 'there' })
    }
  }, [])

  const filtered = useMemo(() => transactions.filter(item => {
    const categoryOk =
      filterCategory === 'All' || item.category === filterCategory

    const typeOk =
      filterType === 'All' || item.type === filterType

    const date = (item.date || '').slice(0, 10)

    return categoryOk &&
      typeOk &&
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

    return {
      income,
      expenses,
      balance: income - expenses
    }
  }, [filtered])

  const chartData = useMemo(() => {
    const totalsByCategory = {}

    filtered
      .filter(t => t.type === 'expense')
      .forEach(t => {
        totalsByCategory[t.category] =
          (totalsByCategory[t.category] || 0) + Number(t.amount)
      })

    return Object.entries(totalsByCategory).map(([name, value]) => ({
      name,
      value
    }))
  }, [filtered])

  const monthlyData = useMemo(() => {
    const months = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - i,
        1
      )

      const key = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`

      months.push({
        key,
        month: date.toLocaleDateString('en-IN', {
          month: 'short'
        }),
        income: 0,
        expenses: 0
      })
    }

    const lookup = Object.fromEntries(
      months.map(month => [month.key, month])
    )

    transactions.forEach(item => {
      const key = (item.date || '').slice(0, 7)

      if (!lookup[key]) return

      if (item.type === 'income') {
        lookup[key].income += Number(item.amount)
      }

      if (item.type === 'expense') {
        lookup[key].expenses += Number(item.amount)
      }
    })

    return months
  }, [transactions])

  async function submitTransaction(event) {
    event.preventDefault()
    setMessage('')

    if (!form.title.trim() || Number(form.amount) <= 0) {
      setMessage(
        'Enter a description and an amount greater than zero.'
      )
      return
    }

    if (!/^[A-Za-z ]+$/.test(form.title.trim())) {
      setDescriptionError(
        'Only English letters and spaces are allowed.'
      )
      return
    }

    setDescriptionError('')

    try {
      await addTransaction({
        ...form,
        title: form.title.trim(),
        amount: Number(form.amount)
      })

      setForm({
        title: '',
        amount: '',
        type: 'expense',
        category: 'Food',
        date: today(),
        note: ''
      })

      await refresh()
      setMessage('Transaction added successfully.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function removeTransaction(id) {
    try {
      await deleteTransaction(id)
      await refresh()
      setMessage('Transaction deleted.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  async function submitAuth(event) {
    event.preventDefault()
    setAuthError('')

    // Strong password validation for new accounts
    if (authMode === 'register') {
      if (!strongPasswordRegex.test(authForm.password)) {
        setAuthError(
          'Password must have at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character.'
        )
        return
      }
    }

    try {
      const account = authMode === 'register'
        ? await registerUser(authForm)
        : await loginUser(authForm)

      const accountName =
        account?.name ||
        account?.user?.name ||
        account?.username ||
        account?.user?.username

      const displayName = accountName || 'there'

      setUser({
        ...account,
        name: displayName
      })

      localStorage.setItem(
        'pocketplan_user_name',
        displayName
      )

      setAuthOpen(false)
      setShowPassword(false)
      setAuthForm({
        name: '',
        email: '',
        password: ''
      })

      await refresh()

    } catch (error) {
      setAuthError(error.message)
    }
  }

  function logout() {
    setToken(null)

    localStorage.removeItem('pocketplan_user_name')

    setUser(null)

    setMessage(
      'Logged out. Demo transactions are stored only in this browser.'
    )

    refresh()
  }

  function openLogin() {
    setAuthMode('login')
    setShowPassword(false)
    setAuthError('')
    setAuthOpen(true)
  }

  function changeAuthMode() {
    setAuthMode(authMode === 'login' ? 'register' : 'login')
    setShowPassword(false)
    setAuthError('')
    setAuthForm({
      name: '',
      email: authForm.email,
      password: ''
    })
  }

  return (
    <div className="app-shell">

      <header className="topbar">
        <a className="brand" href="#">
          <span className="brand-mark">
            <Wallet size={21} />
          </span>

          <span>
            Pocket<span className="brand-accent">Plan</span>
            <small>PERSONAL FINANCE</small>
          </span>
        </a>

        <div className="top-actions">
          <span className={`status ${apiOnline ? 'online' : 'offline'}`}>
            <i />
            {apiOnline ? 'API connected' : 'Demo mode'}
          </span>

          {user ? (
            <button className="button button-ghost" onClick={logout}>
              <LogOut size={16} /> Log out
            </button>
          ) : (
            <button
              className="button button-ghost"
              onClick={openLogin}
            >
              <LogIn size={16} /> Log in
            </button>
          )}
        </div>
      </header>

      <main className="main-content">

        <section className="welcome-row">
          <div>
            <p
              className="greeting-name"
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: '42px',
                fontWeight: 800,
                letterSpacing: '-1.5px',
                margin: '0 0 16px',
                background: 'linear-gradient(90deg, #7045df, #e14fa3)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              Hey, {user?.name || 'there'}!
            </p>

            <h1>
              Good money habits <span>start here.</span>
            </h1>

            <p className="subtitle">
              A clear picture of your finances, all in one place.
            </p>
          </div>

          <div className="date-chip">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </section>

        {!apiOnline && (
          <div className="notice">
            <ShieldCheck size={18} />
            <span>
              <strong>Demo mode is active.</strong>
              Try the tracker now. To save account data in MongoDB,
              start the backend and configure your database.
            </span>
          </div>
        )}

        {message && (
          <div className="message" role="status">
            {message}
            <button
              onClick={() => setMessage('')}
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        <section className="summary-grid">
          <SummaryCard
            title="Total balance"
            amount={totals.balance}
            icon={<Wallet />}
            tone="purple"
            hint="Income minus expenses"
          />

          <SummaryCard
            title="Total income"
            amount={totals.income}
            icon={<TrendingUp />}
            tone="green"
            hint="Money received"
          />

          <SummaryCard
            title="Total expenses"
            amount={totals.expenses}
            icon={<TrendingDown />}
            tone="orange"
            hint="Money spent"
          />
        </section>

        <section className="content-grid">

          <div className="panel transaction-panel">

            <div className="panel-heading">
              <div>
                <p className="eyebrow">RECORD ACTIVITY</p>
                <h2>Add transaction</h2>
              </div>

              <span className="heading-icon">
                <Plus size={18} />
              </span>
            </div>

            <form
              onSubmit={submitTransaction}
              className="transaction-form"
            >

              <label>
                Description

                <input
                  value={form.title}
                  onChange={e => {
                    const value = e.target.value

                    setForm({
                      ...form,
                      title: value
                    })

                    setDescriptionError(
                      value.trim() &&
                      !/^[A-Za-z ]+$/.test(value.trim())
                        ? 'Only English letters and spaces are allowed.'
                        : ''
                    )
                  }}
                  placeholder="e.g. Grocery shopping"
                  maxLength="80"
                  aria-invalid={Boolean(descriptionError)}
                  aria-describedby={
                    descriptionError
                      ? 'description-error'
                      : undefined
                  }
                  required
                />

                {descriptionError && (
                  <small
                    id="description-error"
                    className="form-error"
                  >
                    {descriptionError}
                  </small>
                )}
              </label>

              <div className="field-row">
                <label>
                  Amount (₹)

                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={e =>
                      setForm({
                        ...form,
                        amount: e.target.value
                      })
                    }
                    placeholder="0.00"
                    required
                  />
                </label>

                <label>
                  Date

                  <input
                    type="date"
                    value={form.date}
                    onChange={e =>
                      setForm({
                        ...form,
                        date: e.target.value
                      })
                    }
                    required
                  />
                </label>
              </div>

              <div
                className="type-switch"
                role="group"
                aria-label="Transaction type"
              >
                <button
                  type="button"
                  className={
                    form.type === 'expense'
                      ? 'type-option selected expense'
                      : 'type-option'
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: 'expense',
                      category: 'Food'
                    })
                  }
                >
                  <ArrowUpRight size={16} /> Expense
                </button>

                <button
                  type="button"
                  className={
                    form.type === 'income'
                      ? 'type-option selected income'
                      : 'type-option'
                  }
                  onClick={() =>
                    setForm({
                      ...form,
                      type: 'income',
                      category: 'Salary'
                    })
                  }
                >
                  <ArrowDownRight size={16} /> Income
                </button>
              </div>

              <label>
                Category

                <select
                  value={form.category}
                  onChange={e =>
                    setForm({
                      ...form,
                      category: e.target.value
                    })
                  }
                >
                  {CATEGORIES.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label>
                Note <span className="optional">(optional)</span>

                <input
                  value={form.note}
                  onChange={e =>
                    setForm({
                      ...form,
                      note: e.target.value
                    })
                  }
                  placeholder="Add a short note"
                  maxLength="160"
                />
              </label>

              <button
                className="button button-primary submit-button"
                type="submit"
              >
                <Plus size={17} /> Add transaction
              </button>

            </form>
          </div>

          <div className="right-column">

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">SPENDING BREAKDOWN</p>
                  <h2>Where it goes</h2>
                </div>

                <span className="heading-icon">
                  <ChartNoAxesCombined size={18} />
                </span>
              </div>

              {chartData.length ? (
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={235}>
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={58}
                        outerRadius={86}
                        paddingAngle={3}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>

                      <Tooltip formatter={value => money(value)} />

                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-chart">
                  <div className="empty-chart-icon">
                    <ChartNoAxesCombined size={25} />
                  </div>

                  <strong>No spending data yet</strong>
                  <span>Add an expense to see your chart.</span>
                </div>
              )}
            </section>

            <section className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">MONTHLY OVERVIEW</p>
                  <h2>Income vs expenses</h2>
                </div>

                <span className="heading-icon">
                  <ChartNoAxesCombined size={18} />
                </span>
              </div>

              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis dataKey="month" />

                    <YAxis
                      tickFormatter={value =>
                        value >= 1000
                          ? `₹${value / 1000}k`
                          : `₹${value}`
                      }
                    />

                    <Tooltip formatter={value => money(value)} />

                    <Legend />

                    <Bar
                      dataKey="income"
                      name="Income"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />

                    <Bar
                      dataKey="expenses"
                      name="Expenses"
                      fill="#f59e0b"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="tip-card">
              <div className="tip-icon">✦</div>

              <div>
                <strong>A small tip</strong>
                <p>
                  Review your spending each week. Small changes
                  can make a big difference over time.
                </p>
              </div>
            </section>

          </div>
        </section>

        <section className="panel history-panel">

          <div className="history-heading">
            <div>
              <p className="eyebrow">YOUR ACTIVITY</p>

              <h2>
                Recent transactions
                <span className="count-pill">{filtered.length}</span>
              </h2>
            </div>

            <div className="filters">
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                aria-label="Filter by type"
              >
                <option value="All">All types</option>
                <option value="income">Income</option>
                <option value="expense">Expenses</option>
              </select>

              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                aria-label="Filter by category"
              >
                <option value="All">All categories</option>
                {CATEGORIES.map(c => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <input
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
                aria-label="From date"
                title="From date"
              />

              <input
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
                aria-label="To date"
                title="To date"
              />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th aria-label="Actions"></th>
                </tr>
              </thead>

              <tbody>
                {filtered
                  .slice()
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map(item => (
                    <tr key={item._id}>
                      <td>
                        <div className="transaction-name">
                          <span className={`transaction-symbol ${item.type}`}>
                            {item.type === 'income'
                              ? <ArrowDownRight size={17} />
                              : <ArrowUpRight size={17} />}
                          </span>

                          <span>
                            <strong>{item.title}</strong>
                            {item.note && <small>{item.note}</small>}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="category-pill">
                          {item.category}
                        </span>
                      </td>

                      <td className="muted">
                        {new Date(
                          `${(item.date || '').slice(0, 10)}T00:00:00`
                        ).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>

                      <td className={`amount ${item.type}`}>
                        {item.type === 'income' ? '+' : '−'}
                        {money(item.amount)}
                      </td>

                      <td>
                        <button
                          className="icon-button delete-button"
                          onClick={() => removeTransaction(item._id)}
                          title="Delete transaction"
                          aria-label={`Delete ${item.title}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}

                {!filtered.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-table">
                        <span className="empty-table-icon">
                          <Wallet size={23} />
                        </span>

                        <strong>No transactions found</strong>
                        <p>Add a transaction or change your filters.</p>
                      </div>
                    </td>
                  </tr>
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
        <div
          className="modal-backdrop"
          onClick={() => setAuthOpen(false)}
        >
          <div
            className="auth-modal"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setAuthOpen(false)}
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="auth-logo">
              <Wallet size={23} />
            </div>

            <p className="eyebrow">WELCOME TO POCKETPLAN</p>

            <h2>
              {authMode === 'login'
                ? 'Welcome back'
                : 'Create your account'}
            </h2>

            <p className="auth-subtitle">
              {authMode === 'login'
                ? 'Log in to access your saved transactions.'
                : 'Start keeping track of your money.'}
            </p>

            <form
              onSubmit={submitAuth}
              className="transaction-form"
            >
              {authMode === 'register' && (
                <label>
                  Your name

                  <input
                    value={authForm.name}
                    onChange={e =>
                      setAuthForm({
                        ...authForm,
                        name: e.target.value
                      })
                    }
                    required
                    minLength="2"
                  />
                </label>
              )}

              <label>
                Email address

                <input
                  type="email"
                  value={authForm.email}
                  onChange={e =>
                    setAuthForm({
                      ...authForm,
                      email: e.target.value
                    })
                  }
                  required
                />
              </label>

              <label>
                Password

                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%'
                }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={authForm.password}
                    onChange={e =>
                      setAuthForm({
                        ...authForm,
                        password: e.target.value
                      })
                    }
                    required
                    minLength={authMode === 'register' ? 8 : undefined}
                    placeholder={
                      authMode === 'register'
                        ? 'Create a strong password'
                        : 'Enter your password'
                    }
                    style={{
                      width: '100%',
                      paddingRight: '44px'
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'transparent',
                      color: '#858b9b',
                      padding: '4px',
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer'
                    }}
                  >
                    {showPassword
                      ? <EyeOff size={18} />
                      : <Eye size={18} />}
                  </button>
                </div>

                {authMode === 'register' && (
                  <small style={{
                    color: '#858b9b',
                    fontSize: '10px',
                    lineHeight: 1.5
                  }}>
                    Use 8+ characters with uppercase, lowercase,
                    a number and a special character.
                  </small>
                )}
              </label>

              {authError && (
                <p className="form-error">{authError}</p>
              )}

              <button
                className="button button-primary submit-button"
                type="submit"
              >
                {authMode === 'login'
                  ? 'Log in'
                  : 'Create account'}
              </button>
            </form>

            <p className="auth-toggle">
              {authMode === 'login'
                ? 'New to PocketPlan?'
                : 'Already have an account?'}

              <button onClick={changeAuthMode}>
                {authMode === 'login'
                  ? 'Create account'
                  : 'Log in'}
              </button>
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
