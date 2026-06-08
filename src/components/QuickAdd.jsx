import { useState, useEffect } from 'react'
import api from '../services/api'

export default function QuickAdd() {
  const [showModal, setShowModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    description: '',
    amount: '',
    type: 'EXPENSE',
    transactionDate: '',
    categoryId: '',
  })

  useEffect(() => {
    if (showModal) fetchCategories()
  }, [showModal])

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/categories')
      setCategories(res.data)
      setForm((prev) => ({
        ...prev,
        categoryId: res.data.filter((c) => c.type === 'EXPENSE')[0]?.id || '',
        transactionDate: new Date().toISOString().substring(0, 16),
      }))
    } catch (err) {
      console.error(err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.post('/api/transactions', {
        ...form,
        categoryId: Number(form.categoryId),
        amount: Number(form.amount),
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        setShowModal(false)
        setForm({
          description: '',
          amount: '',
          type: 'EXPENSE',
          transactionDate: new Date().toISOString().substring(0, 16),
          categoryId: '',
        })
      }, 1500)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 flex items-center justify-center z-40 text-2xl font-light"
        title="Quick Add Transaction"
      >
        +
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">

            {success ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-lg font-bold text-green-600">Transaction Added!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-800">Quick Add</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-xl font-light"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What was this for?"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount (₦)
                    </label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      required
                      min="0"
                    />
                  </div>

                  {/* Type Toggle */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                      {['EXPENSE', 'INCOME'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            type,
                            categoryId: categories.filter((c) => c.type === type)[0]?.id || ''
                          })}
                          className={`flex-1 py-2 text-sm font-medium transition-colors ${
                            form.type === type
                              ? type === 'EXPENSE'
                                ? 'bg-red-500 text-white'
                                : 'bg-green-500 text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {type === 'EXPENSE' ? 'Expense' : 'Income'}
                        </button>
                      ))}
                    </div>
                  </div>

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
                        .filter((c) => c.type === form.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Date
                    </label>
                    <input
                      type="datetime-local"
                      value={form.transactionDate}
                      onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Add Transaction
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}