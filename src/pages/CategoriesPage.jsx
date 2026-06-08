import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [transactions, setTransactions] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [deleteError, setDeleteError] = useState('')

  // Form
  const [form, setForm] = useState({ name: '', type: 'EXPENSE' })

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [catRes, transRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/transactions'),
      ])
      setCategories(catRes.data)
      setTransactions(transRes.data)
      buildAvailableMonths(transRes.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const buildAvailableMonths = (data) => {
    const monthSet = new Set()
    data.forEach((t) => monthSet.add(t.transactionDate.substring(0, 7)))
    const sorted = Array.from(monthSet).sort((a, b) => b.localeCompare(a))
    setAvailableMonths(sorted)
    setSelectedMonth(sorted[0] || 'ALL')
  }

  const formatMonthLabel = (ym) => {
    if (ym === 'ALL') return 'All Time'
    const [year, month] = ym.split('-')
    return new Date(year, month - 1).toLocaleString('default', {
      month: 'long', year: 'numeric'
    })
  }

  // Filter transactions by selected month
  const filteredTransactions = selectedMonth === 'ALL'
    ? transactions
    : transactions.filter((t) => t.transactionDate.startsWith(selectedMonth))

  // Calculate totals per category
  const getCategoryStats = (categoryName, type) => {
    const relevant = filteredTransactions.filter(
      (t) => t.categoryName === categoryName && t.type === type
    )
    const total = relevant.reduce((sum, t) => sum + Number(t.amount), 0)
    return { total, count: relevant.length }
  }

  const incomeCategories = categories
    .filter((c) => c.type === 'INCOME')
    .map((c) => ({ ...c, ...getCategoryStats(c.name, 'INCOME') }))
    .sort((a, b) => b.total - a.total)

  const expenseCategories = categories
    .filter((c) => c.type === 'EXPENSE')
    .map((c) => ({ ...c, ...getCategoryStats(c.name, 'EXPENSE') }))
    .sort((a, b) => b.total - a.total)

  // Green shades for income — darkest first
  const GREEN_SHADES = [
    '#064e3b', '#065f46', '#047857', '#059669',
    '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'
  ]

  // Red shades for expense — darkest first
  const RED_SHADES = [
    '#7f1d1d', '#991b1b', '#b91c1c', '#dc2626',
    '#ef4444', '#f87171', '#fca5a5', '#fecaca'
  ]

  const openAdd = () => {
      setEditingCategory(null)
      setForm({ name: '', type: 'EXPENSE' })
      setFormError('')
      setShowModal(true)
    }

  const openEdit = (c) => {
      setEditingCategory(c)
      setForm({ name: c.name, type: c.type })
      setFormError('')
      setShowModal(true)
    }

  const handleSubmit = async (e) => {
      e.preventDefault()
      setFormError('')
      try {
        if (editingCategory) {
          await api.put(`/api/categories/${editingCategory.id}`, form)
        } else {
          await api.post('/api/categories', form)
        }
        setShowModal(false)
        fetchAll()
      } catch (err) {
        setFormError(err.response?.data?.message || 'Failed to save category')
      }
    }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/categories/${id}`)
      setShowDeleteConfirm(null)
      setDeleteError('')
      fetchAll()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Cannot delete this category')
    }
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-700">{payload[0].name}</p>
          <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
            ₦{Number(payload[0].value).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {(payload[0].percent * 100).toFixed(1)}% of total
          </p>
        </div>
      )
    }
    return null
  }

  const CategoryCard = ({ category, colors, index, type }) => {
    const totalForType = (type === 'INCOME' ? incomeCategories : expenseCategories)
      .reduce((sum, c) => sum + c.total, 0)
    const percentage = totalForType > 0
      ? ((category.total / totalForType) * 100).toFixed(1)
      : 0

    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            />
            <span className="font-medium text-gray-800">{category.name}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => openEdit(category)}
              className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(category.id)}
              className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-medium transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        <p className="text-xl font-bold text-gray-800 mb-1">
          ₦{Number(category.total).toLocaleString()}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{category.count} transaction{category.count !== 1 ? 's' : ''}</span>
          <span>{percentage}% of total</span>
        </div>
      </div>
    )
  }

  const incomePieData = incomeCategories
    .filter((c) => c.total > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.total,
      fill: GREEN_SHADES[i % GREEN_SHADES.length]
    }))

  const expensePieData = expenseCategories
    .filter((c) => c.total > 0)
    .map((c, i) => ({
      name: c.name,
      value: c.total,
      fill: RED_SHADES[i % RED_SHADES.length]
    }))

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
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
            + Add Category
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading...</p>
      ) : (
        <>
          {/* Cards — Side by Side */}
          <div className="grid grid-cols-2 gap-6 mb-8">

            {/* Income */}
            <div>
              <h2 className="text-lg font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-600 inline-block" />
                Income Categories
              </h2>
              {incomeCategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">💰</div>
                  <p className="text-gray-600 font-medium text-sm">No income categories yet</p>
                  <p className="text-gray-400 text-xs mt-1">Add one to track your income</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {incomeCategories.map((c, i) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      colors={GREEN_SHADES}
                      index={i}
                      type="INCOME"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Expense */}
            <div>
              <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600 inline-block" />
                Expense Categories
              </h2>
              {expenseCategories.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🏷️</div>
                  <p className="text-gray-600 font-medium text-sm">No expense categories yet</p>
                  <p className="text-gray-400 text-xs mt-1">Add one to track your spending</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {expenseCategories.map((c, i) => (
                    <CategoryCard
                      key={c.id}
                      category={c}
                      colors={RED_SHADES}
                      index={i}
                      type="EXPENSE"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pie Charts — Side by Side */}
          <div className="grid grid-cols-2 gap-6">

            {/* Income Pie */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Income Breakdown
              </h2>
              {incomePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={incomePieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      {incomePieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-16">
                  No income data for this period
                </p>
              )}
            </div>

            {/* Expense Pie */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">
                Expense Breakdown
              </h2>
              {expensePieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-400 text-center py-16">
                  No expense data for this period
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                  {formError}
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
                  {editingCategory ? 'Save Changes' : 'Add Category'}
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
            <h2 className="text-lg font-bold text-gray-800 mb-2">Delete Category?</h2>
            <p className="text-gray-500 text-sm mb-2">This action cannot be undone.</p>
            {deleteError && (
              <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded-lg">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(null)
                  setDeleteError('')
                }}
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