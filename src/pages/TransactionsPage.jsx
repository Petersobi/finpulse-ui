import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const ROWS_PER_PAGE = 10

export default function TransactionsPage() {
  const [allTransactions, setAllTransactions] = useState([])
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartData, setChartData] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [selectedMonth, setSelectedMonth] = useState('ALL')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Form state
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    transactionDate: '',
    categoryId: '',
  })

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [selectedMonth, typeFilter, allTransactions])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [transRes, catRes] = await Promise.all([
        api.get('/api/transactions'),
        api.get('/api/categories'),
      ])
      setAllTransactions(transRes.data)
      setCategories(catRes.data)
      buildAvailableMonths(transRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildAvailableMonths = (data) => {
    const monthSet = new Set()
    data.forEach((t) => {
      monthSet.add(t.transactionDate.substring(0, 7))
    })
    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a))
    setAvailableMonths(sorted)
    setSelectedMonth(sorted[0] || 'ALL')
  }

  const applyFilters = () => {
    let filtered = [...allTransactions]

    if (selectedMonth !== 'ALL') {
      filtered = filtered.filter((t) =>
        t.transactionDate.startsWith(selectedMonth)
      )
    }

    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.type === typeFilter)
    }

    setTransactions(filtered)
    buildChartData(filtered, selectedMonth)
    setCurrentPage(1)
  }

  const buildChartData = (data, month) => {
    if (month === 'ALL') {
      // Group by month
      const map = {}
      data.forEach((t) => {
        const key = t.transactionDate.substring(0, 7)
        if (!map[key]) map[key] = { label: key, income: 0, expenses: 0 }
        if (t.type === 'INCOME') map[key].income += Number(t.amount)
        if (t.type === 'EXPENSE') map[key].expenses += Number(t.amount)
      })
      setChartData(
        Object.values(map).sort((a, b) => a.label.localeCompare(b.label))
      )
    } else {
      // Group by day of selected month
      const [year, mon] = month.split('-').map(Number)
      const daysInMonth = new Date(year, mon, 0).getDate()

      const map = {}
      for (let d = 1; d <= daysInMonth; d++) {
        map[d] = { label: `${d}`, income: 0, expenses: 0 }
      }

      data.forEach((t) => {
        const day = parseInt(t.transactionDate.substring(8, 10))
        if (t.type === 'INCOME') map[day].income += Number(t.amount)
        if (t.type === 'EXPENSE') map[day].expenses += Number(t.amount)
      })

      setChartData(Object.values(map))
    }
  }

  const formatMonthLabel = (ym) => {
    const [year, month] = ym.split('-')
    const date = new Date(year, month - 1)
    return date.toLocaleString('default', { month: 'long', year: 'numeric' })
  }

  // Pagination
  const totalPages = Math.ceil(transactions.length / ROWS_PER_PAGE)
  const paginated = transactions.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  )

  const openAdd = () => {
    setEditingTransaction(null)
    setForm({
      description: '',
      amount: '',
      type: 'EXPENSE',
      transactionDate: '',
      categoryId: categories[0]?.id || '',
    })
    setShowModal(true)
  }

  const openEdit = (t) => {
    setEditingTransaction(t)
    setForm({
      description: t.description,
      amount: t.amount,
      type: t.type,
      transactionDate: t.transactionDate.substring(0, 16),
      categoryId: categories.find((c) => c.name === t.categoryName)?.id || '',
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingTransaction) {
        await api.put(`/api/transactions/${editingTransaction.id}`, form)
      } else {
        await api.post('/api/transactions', form)
      }
      setShowModal(false)
      fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/transactions/${id}`)
      setShowDeleteConfirm(null)
      fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-600 mb-2">
            {selectedMonth === 'ALL' ? label : `Day ${label}`}
          </p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }} className="text-sm font-bold">
              {p.name}: ₦{Number(p.value).toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">
            {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Transaction
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {['ALL', 'INCOME', 'EXPENSE'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                typeFilter === type
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="ALL">All Time</option>
          {availableMonths.map((ym) => (
            <option key={ym} value={ym}>
              {formatMonthLabel(ym)}
            </option>
          ))}
        </select>
      </div>

{/* Chart */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-1">
          Income vs Expenses
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          {selectedMonth === 'ALL'
            ? 'All time — grouped by month'
            : `${formatMonthLabel(selectedMonth)} — grouped by day`}
        </p>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                label={{
                  value: selectedMonth === 'ALL' ? 'Month' : 'Day',
                  position: 'insideBottom',
                  offset: -2,
                  fontSize: 11,
                  fill: '#9ca3af'
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickFormatter={(v) =>
                  v >= 1000 ? `₦${(v / 1000).toFixed(0)}k` : `₦${v}`
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#incomeGradient)"
                name="Income"
                dot={false}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2.5}
                fill="url(#expenseGradient)"
                name="Expenses"
                dot={false}
                activeDot={{ r: 5, fill: '#ef4444' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-400 text-center py-16">No data for this period</p>
        )}
      </div>

      {/* Table */}
            <div className="bg-white rounded-lg shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Description</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Category</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Type</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Amount</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Date</th>
                      <th className="text-left p-4 text-sm font-semibold text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-gray-400">Loading...</td>
                      </tr>
                    ) : paginated.length === 0 ? (
                      <tr>
                        <td colSpan={6}>
                          <div className="text-center py-16">
                            <div className="text-5xl mb-3">💳</div>
                            <p className="text-gray-600 font-medium">No transactions found</p>
                            <p className="text-gray-400 text-sm mt-1">
                              Add your first transaction to get started
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginated.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium text-gray-800">{t.description}</td>
                          <td className="p-4 text-gray-500 text-sm">{t.categoryName}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              t.type === 'INCOME'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {t.type}
                            </span>
                          </td>
                          <td className={`p-4 font-bold ${
                            t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {t.type === 'INCOME' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                          </td>
                          <td className="p-4 text-gray-500 text-sm">
                            {t.transactionDate.substring(0, 10)}
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEdit(t)}
                                className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(t.id)}
                                className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–{Math.min(currentPage * ROWS_PER_PAGE, transactions.length)} of {transactions.length} transactions
                  </p>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      ←
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                    >
                      →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-6">
                    {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                  </h2>
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                      <input
                        type="text"
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₦)</label>
                      <input
                        type="number"
                        value={form.amount}
                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="EXPENSE">Expense</option>
                        <option value="INCOME">Income</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">Select category</option>
                        {categories
                          .filter((c) => c.type === form.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                      </select>
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="datetime-local"
                        value={form.transactionDate}
                        onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowModal(false)}
                        className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700"
                      >
                        {editingTransaction ? 'Save Changes' : 'Add Transaction'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
                  <div className="text-4xl mb-4">🗑️</div>
                  <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Transaction?</h2>
                  <p className="text-gray-500 text-sm mb-6">This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteConfirm(null)}
                      className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg font-medium hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleDelete(showDeleteConfirm)}
                      className="flex-1 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

    </Layout>
  )
}