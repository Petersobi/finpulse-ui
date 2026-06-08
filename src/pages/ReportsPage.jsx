import { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, ReferenceLine
} from 'recharts'

export default function ReportsPage() {
  const [transactions, setTransactions] = useState([])
  const [availableMonths, setAvailableMonths] = useState([])
  const [selectedMonth, setSelectedMonth] = useState('ALL')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAll()
  }, [])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/transactions')
      setTransactions(res.data)
      buildAvailableMonths(res.data)
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
    if (!ym || ym === 'ALL') return 'All Time'
    const [year, month] = ym.split('-')
    return new Date(year, month - 1).toLocaleString('default', {
      month: 'long', year: 'numeric'
    })
  }

  // Filter transactions
  const filtered = selectedMonth === 'ALL'
    ? transactions
    : transactions.filter((t) => t.transactionDate.startsWith(selectedMonth))

  // Summary stats
  const totalIncome = filtered
    .filter((t) => t.type === 'INCOME')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpenses = filtered
    .filter((t) => t.type === 'EXPENSE')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const netBalance = totalIncome - totalExpenses

  const savingsRate = totalIncome > 0
    ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1)
    : 0

  // Bar chart — income vs expenses by category
  const categoryMap = {}
  filtered.forEach((t) => {
    if (!categoryMap[t.categoryName]) {
      categoryMap[t.categoryName] = { category: t.categoryName, income: 0, expenses: 0 }
    }
    if (t.type === 'INCOME') categoryMap[t.categoryName].income += Number(t.amount)
    if (t.type === 'EXPENSE') categoryMap[t.categoryName].expenses += Number(t.amount)
  })
  const barData = Object.values(categoryMap).sort((a, b) =>
    (b.income + b.expenses) - (a.income + a.expenses)
  )

  // Line chart — cumulative balance trend by day
  const buildLineData = () => {
    if (selectedMonth === 'ALL') {
      const map = {}
      filtered.forEach((t) => {
        const month = t.transactionDate.substring(0, 7)
        if (!map[month]) map[month] = { label: month, net: 0 }
        if (t.type === 'INCOME') map[month].net += Number(t.amount)
        if (t.type === 'EXPENSE') map[month].net -= Number(t.amount)
      })
      return Object.values(map).sort((a, b) => a.label.localeCompare(b.label))
    }

    const [year, mon] = selectedMonth.split('-').map(Number)
    const daysInMonth = new Date(year, mon, 0).getDate()
    const map = {}
    for (let d = 1; d <= daysInMonth; d++) {
      map[d] = { label: `${d}`, net: 0 }
    }
    filtered.forEach((t) => {
      const day = parseInt(t.transactionDate.substring(8, 10))
      if (t.type === 'INCOME') map[day].net += Number(t.amount)
      if (t.type === 'EXPENSE') map[day].net -= Number(t.amount)
    })

    // Make it cumulative
    let running = 0
    return Object.values(map).map((d) => {
      running += d.net
      return { label: d.label, balance: running }
    })
  }
  const lineData = buildLineData()

  // Summary table — grouped by category
  const tableMap = {}
  filtered.forEach((t) => {
    const key = `${t.categoryName}-${t.type}`
    if (!tableMap[key]) {
      tableMap[key] = {
        category: t.categoryName,
        type: t.type,
        total: 0,
        count: 0,
      }
    }
    tableMap[key].total += Number(t.amount)
    tableMap[key].count += 1
  })
  const tableData = Object.values(tableMap).sort((a, b) => b.total - a.total)

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-2">{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.fill }} className="text-sm font-bold">
              {p.name}: ₦{Number(p.value).toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const CustomLineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      return (
        <div className="bg-white border border-gray-100 rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-gray-700 mb-1">
            {selectedMonth === 'ALL' ? label : `Day ${label}`}
          </p>
          <p className={`text-sm font-bold ${value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Balance: ₦{Number(Math.abs(value)).toLocaleString()}
            {value < 0 ? ' (deficit)' : ''}
          </p>
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
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">
            {formatMonthLabel(selectedMonth)}
          </p>
        </div>
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
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-16">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No data for this period</h2>
          <p className="text-gray-400">Add some transactions to see your reports</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-green-50 rounded-lg p-6">
              <p className="text-sm text-gray-500 font-medium">Total Income</p>
              <p className="text-2xl font-bold text-green-600 mt-2">
                ₦{Number(totalIncome).toLocaleString()}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-6">
              <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600 mt-2">
                ₦{Number(totalExpenses).toLocaleString()}
              </p>
            </div>
            <div className={`rounded-lg p-6 ${netBalance >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-500 font-medium">Net Balance</p>
              <p className={`text-2xl font-bold mt-2 ${netBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {netBalance < 0 ? '-' : ''}₦{Number(Math.abs(netBalance)).toLocaleString()}
              </p>
            </div>
            <div className={`rounded-lg p-6 ${savingsRate >= 20 ? 'bg-green-50' : savingsRate >= 0 ? 'bg-yellow-50' : 'bg-red-50'}`}>
              <p className="text-sm text-gray-500 font-medium">Savings Rate</p>
              <p className={`text-2xl font-bold mt-2 ${savingsRate >= 20 ? 'text-green-600' : savingsRate >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                {savingsRate}%
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {savingsRate >= 20 ? 'Great savings!' : savingsRate >= 0 ? 'Room to improve' : 'Spending exceeds income'}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6 mb-8">

            {/* Bar Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-1">
                Income vs Expenses by Category
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Which categories drove your finances
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11 }}
                    angle={-35}
                    textAnchor="end"
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend verticalAlign="top" />
                  <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line Chart */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-700 mb-1">
                Balance Trend
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                Cumulative balance — {selectedMonth === 'ALL' ? 'by month' : 'day by day'}
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#3b82f6' }}
                    name="Balance"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Summary Table */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-700">Category Summary</h2>
              <p className="text-sm text-gray-400 mt-1">Breakdown by category and type</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left p-4 text-sm font-semibold text-gray-500">Category</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500">Type</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500">Total Amount</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500">Transactions</th>
                    <th className="text-left p-4 text-sm font-semibold text-gray-500">Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tableData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-medium text-gray-800">{row.category}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          row.type === 'INCOME'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className={`p-4 font-bold ${
                        row.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ₦{Number(row.total).toLocaleString()}
                      </td>
                      <td className="p-4 text-gray-500">{row.count}</td>
                      <td className="p-4 text-gray-500">
                        ₦{Number(row.total / row.count).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}