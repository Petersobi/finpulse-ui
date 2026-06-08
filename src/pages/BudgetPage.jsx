import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'

export default function BudgetPage() {
  const [budgets, setBudgets] = useState([])
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [isDuplicate, setIsDuplicate] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Form
  const [form, setForm] = useState({
      categoryId: '',
      amount: '',
      budgetMonth: '',
    })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [budgetRes, catRes, transRes] = await Promise.all([
        api.get('/api/budgets'),
        api.get('/api/categories'),
        api.get('/api/transactions'),
      ])
      setBudgets(budgetRes.data)
      setCategories(catRes.data)
      setTransactions(transRes.data)
      buildAvailableMonths(budgetRes.data, transRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildAvailableMonths = (budgets, trans) => {
    const monthSet = new Set()
    budgets.forEach((b) => monthSet.add(b.budgetMonth))
    trans.forEach((t) => monthSet.add(t.transactionDate.substring(0, 7)))
    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a))
    setAvailableMonths(sorted)
    setSelectedMonth(sorted[0] || 'ALL')
  }

  const formatMonthLabel = (ym) => {
      if (!ym || ym === 'ALL') return 'All Time'
      const parts = ym.split('-')
      if (parts.length < 2) return ym
      const [year, month] = parts
      return new Date(year, month - 1).toLocaleString('default', {
        month: 'long', year: 'numeric'
      })
    }

  // Filter budgets by selected month
  const filteredBudgets = selectedMonth === 'ALL'
    ? budgets
    : budgets.filter((b) => b.budgetMonth === selectedMonth)

  // Calculate spent amount for a budget
  const getSpent = (categoryName, budgetMonth) => {
    return transactions
      .filter((t) =>
        t.categoryName === categoryName &&
        t.type === 'EXPENSE' &&
        t.transactionDate.startsWith(budgetMonth)
      )
      .reduce((sum, t) => sum + Number(t.amount), 0)
  }

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-yellow-400'
    return 'bg-green-500'
  }

  const getProgressBg = (percentage) => {
    if (percentage >= 100) return 'bg-red-100'
    if (percentage >= 80) return 'bg-yellow-100'
    return 'bg-green-100'
  }

  const openAdd = () => {
      setFormError('')
      setIsDuplicate(false)
    setEditingBudget(null)
    const now = new Date()
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    setForm({
          categoryId: categories.filter((c) => c.type === 'EXPENSE')[0]?.id || '',
          amount: '',
          budgetMonth: currentYM,
        })
    setShowModal(true)
  }

  const openEdit = (b) => {
    setEditingBudget(b)
    setForm({
          categoryId: categories.find((c) => c.name === b.categoryName)?.id || '',
          amount: b.amount,
          budgetMonth: b.budgetMonth,
        })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setIsDuplicate(false)
    const payload = {
      categoryId: Number(form.categoryId),
      amount: Number(form.amount),
      budgetMonth: form.budgetMonth,
    }
    try {
      if (editingBudget) {
        await api.put(`/api/budgets/${editingBudget.id}`, payload)
      } else {
        await api.post('/api/budgets', payload)
      }
      setShowModal(false)
      fetchAll()
    } catch (err) {
      const message = err.response?.data?.message || ''
      if (message.toLowerCase().includes('duplicate') ||
          err.response?.status === 409) {
        setIsDuplicate(true)
      } else {
        setFormError(message || 'Failed to save budget')
      }
    }
  }

  const handleUpdateExisting = async () => {
    const existing = budgets.find(
      (b) =>
        b.categoryName === categories.find((c) => c.id === Number(form.categoryId))?.name &&
        b.budgetMonth === form.budgetMonth
    )
    if (!existing) return
    try {
      await api.put(`/api/budgets/${existing.id}`, {
        categoryId: Number(form.categoryId),
        amount: Number(form.amount),
        budgetMonth: form.budgetMonth,
      })
      setShowModal(false)
      setIsDuplicate(false)
      fetchAll()
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update budget')
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/budgets/${id}`)
      setShowDeleteConfirm(null)
      fetchAll()
    } catch (err) {
      console.error(err)
    }
  }

  // Summary stats
  const totalBudgeted = filteredBudgets.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + getSpent(b.categoryName, b.budgetMonth), 0)
  const totalRemaining = totalBudgeted - totalSpent

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Budget</h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatMonthLabel(selectedMonth)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="ALL">All Time</option>
            {availableMonths.map((ym) => (
              <option key={ym} value={ym}>{formatMonthLabel(ym)}</option>
            ))}
          </select>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Add Budget
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {filteredBudgets.length > 0 && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-6">
            <p className="text-sm text-gray-500 font-medium">Total Budgeted</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">
              ₦{Number(totalBudgeted).toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-6">
            <p className="text-sm text-gray-500 font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-red-600 mt-2">
              ₦{Number(totalSpent).toLocaleString()}
            </p>
          </div>
          <div className={`rounded-lg p-6 ${
            totalSpent > totalBudgeted ? 'bg-red-50' :
            totalSpent / totalBudgeted >= 0.8 ? 'bg-yellow-50' : 'bg-green-50'
          }`}>
            <p className="text-sm text-gray-500 font-medium">Budget Health</p>
            <p className={`text-2xl font-bold mt-2 ${
              totalSpent > totalBudgeted ? 'text-red-600' :
              totalSpent / totalBudgeted >= 0.8 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {totalSpent > totalBudgeted ? '🔴 Over Budget' :
               totalSpent / totalBudgeted >= 0.8 ? '🟡 Watch Out' : '🟢 On Track'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {totalBudgeted > 0
                ? `${((totalSpent / totalBudgeted) * 100).toFixed(0)}% of total budget used`
                : 'No budget set'}
            </p>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading...</p>
      ) : filteredBudgets.length === 0 ? (
        // Empty State
        <div className="text-center py-24">
          <div className="text-6xl mb-4">💰</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No budgets yet</h2>
          <p className="text-gray-400 mb-6">
            Set a budget for your expense categories to track your spending
          </p>
          <button
            onClick={openAdd}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Create Your First Budget
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBudgets.map((b) => {
            const spent = getSpent(b.categoryName, b.budgetMonth)
            const percentage = Number(b.amount) > 0
              ? Math.min((spent / Number(b.amount)) * 100, 100)
              : 0
            const actualPercentage = Number(b.amount) > 0
              ? (spent / Number(b.amount)) * 100
              : 0
            const remaining = Number(b.amount) - spent
            const isExceeded = spent > Number(b.amount)
            const isWarning = actualPercentage >= 80 && !isExceeded

            return (
              <div
                key={b.id}
                className="bg-white rounded-lg shadow-sm p-6 border border-gray-50"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {b.categoryName}
                    </h3>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                      {formatMonthLabel(b.budgetMonth)}
                    </span>
                    {isExceeded && (
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full font-semibold">
                        ⚠️ Exceeded
                      </span>
                    )}
                    {isWarning && (
                      <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded-full font-semibold">
                        ⚠️ Almost Full
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(b)}
                      className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(b.id)}
                      className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className={`w-full rounded-full h-3 mb-3 ${getProgressBg(actualPercentage)}`}>
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(actualPercentage)}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-6">
                    <div>
                      <p className="text-gray-400">Budgeted</p>
                      <p className="font-semibold text-gray-800">
                        ₦{Number(b.amount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Spent</p>
                      <p className={`font-semibold ${isExceeded ? 'text-red-600' : 'text-gray-800'}`}>
                        ₦{Number(spent).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">
                        {isExceeded ? 'Overspent' : 'Remaining'}
                      </p>
                      <p className={`font-semibold ${isExceeded ? 'text-red-600' : 'text-green-600'}`}>
                        ₦{Math.abs(remaining).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className={`font-bold text-lg ${
                    isExceeded ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {actualPercentage.toFixed(0)}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select category</option>
                  {categories
                      .filter((c) => c.type === 'EXPENSE')
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Amount (₦)
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                />
              </div>
              <div className="mb-6">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Month
                              </label>
                              <input
                                type="month"
                                value={form.budgetMonth}
                                onChange={(e) => setForm({ ...form, budgetMonth: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                              />
                            </div>

                            {formError && (
                              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                                {formError}
                              </div>
                            )}

                            {isDuplicate && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                                <p className="text-sm font-medium text-yellow-700 mb-1">
                                  ⚠️ A budget already exists for this category and month.
                                </p>
                                <p className="text-xs text-yellow-600 mb-3">
                                  Would you like to update it with the new amount?
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setIsDuplicate(false)}
                                    className="flex-1 border border-yellow-300 text-yellow-700 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-100"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleUpdateExisting}
                                    className="flex-1 bg-yellow-500 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-600"
                                  >
                                    Yes, Update
                                  </button>
                                </div>
                              </div>
                            )}

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
                                {editingBudget ? 'Save Changes' : 'Add Budget'}
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
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Budget?</h2>
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