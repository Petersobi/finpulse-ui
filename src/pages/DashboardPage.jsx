import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'

export default function DashboardPage() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/transactions')
      setTransactions(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Current month
  const now = new Date()
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const monthName = now.toLocaleString('default', { month: 'long' })

  // Filter to current month
  const currentMonthTransactions = transactions.filter((t) =>
    t.transactionDate.startsWith(currentYM)
  )

  // Summary stats
  const monthlyIncome = currentMonthTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthlyExpenses = currentMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const monthlyBalance = monthlyIncome - monthlyExpenses
  const totalTransactions = currentMonthTransactions.length

  // Area chart — group by day
  const buildAreaData = () => {
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
    const map = {}
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = { day: `${d}`, income: 0, expenses: 0 }
    }
    currentMonthTransactions.forEach((t) => {
      const day = parseInt(t.transactionDate.substring(8, 10))
      if (t.type === 'INCOME') map[day].income += Number(t.amount)
      if (t.type === 'EXPENSE') map[day].expenses += Number(t.amount)
    })
    return Object.values(map)
  }
  const areaData = buildAreaData()

  // Pie chart — expenses by category
  const categoryMap = {}
  currentMonthTransactions
    .filter((t) => t.type === 'EXPENSE')
    .forEach((t) => {
      categoryMap[t.categoryName] = (categoryMap[t.categoryName] || 0) + Number(t.amount)
    })
  const pieData = Object.entries(categoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Red shades — not too dark, not too light
  const RED_SHADES = [
    '#ef4444', '#f87171', '#fca5a5',
    '#dc2626', '#b91c1c', '#fecaca',
    '#fee2e2', '#f43f5e'
  ]

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-600 mb-2">Day {label}</p>
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

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-700">{payload[0].name}</p>
          <p className="text-sm font-bold text-red-500">
            ₦{Number(payload[0].value).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {(payload[0].percent * 100).toFixed(1)}% of expenses
          </p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">{monthName}'s financial overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-green-50 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">{monthName}'s Income</p>
          <p className="text-2xl font-bold text-green-600 mt-2">
            ₦{Number(monthlyIncome).toLocaleString()}
          </p>
        </div>
        <div className="bg-red-50 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">{monthName}'s Expenses</p>
          <p className="text-2xl font-bold text-red-600 mt-2">
            ₦{Number(monthlyExpenses).toLocaleString()}
          </p>
        </div>
        <div className={`rounded-lg p-6 ${monthlyBalance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-sm text-gray-500 font-medium">{monthName}'s Balance</p>
          <p className={`text-2xl font-bold mt-2 ${monthlyBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {monthlyBalance < 0 ? '-' : ''}₦{Number(Math.abs(monthlyBalance)).toLocaleString()}
          </p>
        </div>
        <div className="bg-purple-50 rounded-lg p-6">
          <p className="text-sm text-gray-500 font-medium">{monthName}'s Transactions</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {totalTransactions}
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">

        {/* Area Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            Income vs Expenses
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {monthName} — day by day
          </p>
          {currentMonthTransactions.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart
                data={areaData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
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
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  stroke="#9ca3af"
                  label={{
                    value: 'Day',
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
                  activeDot={{ r: 5 }}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  fill="url(#expenseGradient)"
                  name="Expenses"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400">No transactions this month</p>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-1">
            Expenses by Category
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            {monthName}'s spending breakdown
          </p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {pieData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={RED_SHADES[index % RED_SHADES.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-400">No expense data this month</p>
            </div>
          )}
        </div>
      </div>
      {/* Spending Insights */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
            Spending Insights
        </h2>
        <div className="grid grid-cols-2 gap-4">

          {/* Insight 1 — Savings Rate */}
          {monthlyIncome > 0 && (
            <div className={`rounded-lg p-4 ${
              monthlyBalance >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <p className="text-sm font-medium text-gray-600">
                {monthlyBalance >= 0
                  ? `✅ You saved ₦${Number(monthlyBalance).toLocaleString()} this month`
                  : `⚠️ You overspent by ₦${Number(Math.abs(monthlyBalance)).toLocaleString()}`}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {monthlyIncome > 0
                  ? `${((monthlyIncome - monthlyExpenses) / monthlyIncome * 100).toFixed(1)}% savings rate`
                  : ''}
              </p>
            </div>
          )}

          {/* Insight 2 — Biggest expense category */}
          {pieData.length > 0 && (
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">
                🏆 Biggest expense: <span className="font-bold text-orange-600">{pieData[0].name}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                ₦{Number(pieData[0].value).toLocaleString()} — {
                  monthlyExpenses > 0
                    ? `${((pieData[0].value / monthlyExpenses) * 100).toFixed(1)}% of total expenses`
                    : ''
                }
              </p>
            </div>
          )}

          {/* Insight 3 — Transaction frequency */}
          {totalTransactions > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600">
                📊 {totalTransactions} transactions this month
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Average ₦{Number(monthlyExpenses / Math.max(
                  currentMonthTransactions.filter(t => t.type === 'EXPENSE').length, 1
                )).toLocaleString()} per expense
              </p>
            </div>
          )}

          {/* Insight 4 — Budget warning */}
          {monthlyExpenses > monthlyIncome && monthlyIncome > 0 ? (
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm font-medium text-red-600">
                🔴 Expenses exceed income this month
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Consider reviewing your budget
              </p>
            </div>
          ) : monthlyIncome > 0 && (monthlyExpenses / monthlyIncome) >= 0.8 ? (
            <div className="bg-yellow-50 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-600">
                🟡 You've used {((monthlyExpenses / monthlyIncome) * 100).toFixed(0)}% of your income
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Watch your spending for the rest of the month
              </p>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm font-medium text-green-600">
                🟢 Spending is healthy this month
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Keep it up!
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-700">
            Recent Transactions
          </h2>
          <p className="text-sm text-gray-400 mt-1">{monthName}'s latest activity</p>
        </div>
        <div className="divide-y divide-gray-50">
          {currentMonthTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No transactions this month</p>
            </div>
          ) : (
            currentMonthTransactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-gray-800">{t.description}</p>
                  <p className="text-sm text-gray-400">
                    {t.categoryName} • {t.transactionDate.substring(0, 10)}
                  </p>
                </div>
                <p className={`font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                  {t.type === 'INCOME' ? '+' : '-'}₦{Number(t.amount).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

    </Layout>
  )
}