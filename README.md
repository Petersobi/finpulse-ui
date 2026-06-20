# FinPulse UI

A React frontend for FinPulse — a personal finance dashboard featuring interactive charts, budget tracking, and financial reports. Connects to the [FinPulse API](https://github.com/Petersobi/FinPulse-API) backend via JWT authentication.

**Live App:** https://finpulse-ui.netlify.app
**Backend Repo:** https://github.com/Petersobi/FinPulse-API

---

## Features

- Secure login and registration with JWT
- Dashboard with monthly income, expenses, balance, and spending insights
- Transactions page with month/type filtering, pagination, and trend charts
- Categories page with income/expense breakdown and pie charts
- Budget tracking with progress bars and health alerts
- Reports page with category comparison and balance trend analysis
- Quick Add floating button for fast transaction entry
- Collapsible sidebar with persistent state
- Fully responsive, clean, professional UI

---

## Tech Stack

- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **HTTP Client:** Axios
- **Routing:** React Router
- **Deployment:** Netlify

---

## Project Structure

```
src/
├── pages/         # Full page components (Login, Dashboard, Transactions, etc.)
├── components/     # Reusable UI components (Layout, QuickAdd)
├── services/       # Axios API configuration
├── context/        # Auth context for global state
```

---

## Getting Started Locally

### Prerequisites
- Node.js 18+
- The [FinPulse API](https://github.com/Petersobi/FinPulse-API) running locally or accessible remotely

### Setup

1. Clone the repository
```bash
git clone https://github.com/Petersobi/finpulse-ui.git
cd finpulse-ui
```

2. Install dependencies
```bash
npm install
```

3. Update the API base URL in `src/services/api.js`
```js
const api = axios.create({
  baseURL: 'http://localhost:8081', // or your deployed backend URL
})
```

4. Start the dev server
```bash
npm run dev
```

5. Visit `http://localhost:5173`

---

## Pages

| Page | Description |
|------|-------------|
| `/login` | User login |
| `/register` | User registration |
| `/` | Dashboard — current month overview with charts |
| `/transactions` | Transaction list, filtering, and chart |
| `/categories` | Category management with breakdown charts |
| `/budget` | Budget tracking with progress indicators |
| `/reports` | Financial reports and trend analysis |

---

## Author

**Peter Somto Obi**
[LinkedIn](#) · [GitHub](https://github.com/Petersobi)
