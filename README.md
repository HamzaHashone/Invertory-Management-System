# Inventory Management System

A multi-tenant SaaS platform for inventory lot management and sales tracking.

## Features

- **Multi-tenant Architecture** - Complete data isolation between businesses
- **User Roles** - Admin and Staff roles with appropriate permissions
- **Lot Management** - Create lots with nested color/size inventory structure
- **Sales Transactions** - Modal-based selling with stock validation
- **Financial Tracking** - Real-time investment, revenue, and profit calculations
- **Dashboard** - Aggregated financials and recent transaction history

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Sonner for toast notifications
- Axios for API calls

**Backend:**
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- JWT authentication
- bcrypt for password hashing
- Zod for validation

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```bash
git clone <repo-url>
cd inventory-management
```

2. Set up backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

3. Set up frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local with your API URL
npm run dev
```

4. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### First Time Setup

1. Go to http://localhost:3000/signup
2. Create your business account (this creates a tenant + admin user)
3. Login and start creating lots

## Project Structure

```
inventory-management/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── models/         # Mongoose models
│   │   ├── routes/         # API routes
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth middleware
│   │   ├── utils/          # JWT utilities
│   │   └── server.ts       # Express app entry
│   └── package.json
├── frontend/
│   ├── app/                # Next.js pages (App Router)
│   ├── components/         # React components
│   ├── lib/                # API client, auth context
│   ├── types/              # TypeScript types
│   └── package.json
└── docs/
    └── plans/              # Design and implementation docs
```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create tenant + admin
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Lots
- `GET /api/lots` - List all lots
- `POST /api/lots` - Create new lot
- `GET /api/lots/:id` - Get lot details
- `POST /api/lots/generate-number` - Auto-generate lot number

### Transactions
- `POST /api/lots/:id/sell` - Create sale transaction
- `GET /api/transactions` - List transactions
- `GET /api/transactions/:id` - Get transaction details

### Dashboard
- `GET /api/dashboard/stats` - Get aggregated stats
- `GET /api/dashboard/recent-transactions` - Get recent sales

## Development

### Running Tests

Tests are not yet implemented. Future versions will include:
- Backend API tests (using Jest + Supertest)
- Frontend component tests (using Jest + React Testing Library)

### Building for Production
```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
npm start
```

## Deployment

### Backend (Railway/Render)
1. Connect GitHub repository
2. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `NODE_ENV=production`
3. Deploy

### Frontend (Vercel)
1. Connect GitHub repository
2. Set environment variable:
   - `NEXT_PUBLIC_API_URL`
3. Deploy

## License

MIT
