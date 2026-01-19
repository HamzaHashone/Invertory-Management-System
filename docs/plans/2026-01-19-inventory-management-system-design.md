# Inventory Management System - Design Document

**Date:** January 19, 2026
**Project Type:** Multi-tenant SaaS
**Tech Stack:** Next.js (TypeScript) + Node.js (Express, TypeScript) + MongoDB + shadcn/ui

---

## 1. High-Level Architecture

### System Overview
A multi-tenant Inventory Management SaaS with three main components:

**Frontend (Next.js + TypeScript):**
- Deployed on Vercel
- Uses shadcn/ui for components
- App Router architecture
- Client-side state management with React Query for API calls
- Protected routes with authentication middleware
- Responsive design for desktop/tablet use

**Backend (Node.js + Express + TypeScript):**
- Deployed on Railway/Render
- RESTful API architecture
- JWT-based authentication
- Tenant isolation middleware (every request scoped to tenant)
- MongoDB connection with Mongoose ODM
- CORS configured to allow Vercel frontend

**Database (MongoDB):**
- Collections: `tenants`, `users`, `lots`, `transactions`, `colors`, `sizes`
- Tenant ID embedded in all records for data isolation
- Indexes on tenantId for query performance

**Authentication Flow:**
- Signup creates a new tenant + admin user
- Login returns JWT with userId, tenantId, and role
- Every API request includes JWT in Authorization header
- Backend middleware validates token and extracts tenant context

---

## 2. Data Models

### Tenant Model
```typescript
{
  _id: ObjectId,
  businessName: string,
  email: string,
  createdAt: Date,
  settings: {
    lotPrefix: string // for auto-generation, e.g., "LOT-"
  }
}
```

### User Model
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  name: string,
  email: string,
  passwordHash: string,
  role: 'admin' | 'staff',
  createdAt: Date
}
```

### Lot Model
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  lotNumber: string, // manually entered or auto-generated
  items: [
    {
      color: string,
      sizes: [
        {
          size: string,
          quantity: number,
          remainingQuantity: number,
          purchaseCostPerPiece: number,
          sellCostPerPiece: number
        }
      ]
    }
  ],
  totalInvestment: number, // calculated on save
  totalRevenue: number, // updated on each sale
  totalProfit: number, // revenue - investment spent
  createdAt: Date,
  createdBy: ObjectId // user who created the lot
}
```

### Transaction Model
```typescript
{
  _id: ObjectId,
  tenantId: ObjectId,
  lotId: ObjectId,
  soldItems: [
    {
      color: string,
      size: string,
      quantity: number,
      sellPricePerPiece: number,
      totalAmount: number
    }
  ],
  totalRevenue: number,
  soldBy: ObjectId, // user who made the sale
  customerName?: string, // optional
  invoiceNumber?: string, // optional
  createdAt: Date
}
```

---

## 3. Frontend Structure & Pages

### Page Routes
- `/signup` - Tenant registration (creates business + admin user)
- `/login` - User login
- `/dashboard` - Main dashboard with financial overview
- `/lots` - List all lots with search/filter
- `/lots/new` - Create new lot form
- `/lots/[id]` - View lot details and financials

### Dashboard Page (`/dashboard`)
- Header with tenant business name, logged-in user, logout button
- Financial overview cards:
  - Total Investment (sum across all lots)
  - Total Revenue (sum of all sales)
  - Total Profit (revenue - investment)
  - Active Lots count
- Recent transactions list (last 10 sales)
- Quick action button: "Create New Lot"

### Lots List Page (`/lots`)
- Table showing: Lot Number, Created Date, Total Investment, Revenue, Profit, Remaining Items count
- Search by lot number
- Filter by date range
- Each row has "View Details" and "Sell" buttons

### Create Lot Page (`/lots/new`)
- Lot number input with "Auto-generate" button
- Add Color button → opens color section
- For each color: Add Size button → row with size, quantity, purchase cost, sell cost inputs
- Remove buttons for colors and sizes
- Real-time total investment calculation display
- Save button validates and creates lot

---

## 4. Selling Flow & Modal

### Sell Button Behavior
- Available on lots list page and lot details page
- Opens shadcn/ui Dialog modal
- Modal shows lot number and available inventory

### Sell Modal Layout

**Left section:** Selection form
- Color dropdown (populated from current lot's available colors)
- Size dropdown (populated based on selected color, shows only sizes with remainingQuantity > 0)
- Quantity input with max validation
- "Add to Sale" button

**Right section:** Selling items cart
- List of selected items to sell
- Each item shows: Color, Size, Quantity, Unit Price, Subtotal
- Remove button for each item
- Total revenue displayed at bottom

**Footer:**
- Optional fields: Customer Name, Invoice Number
- "Cancel" and "Complete Sale" buttons

### Sale Processing
1. Validate all quantities against remainingQuantity
2. If validation fails: show error with available quantities
3. If validation passes:
   - Create transaction record
   - Update lot.items.sizes.remainingQuantity
   - Recalculate lot.totalRevenue and lot.totalProfit
   - Close modal and show success message
   - Refresh lot data

---

## 5. API Endpoints

### Authentication Endpoints
- `POST /api/auth/signup` - Create tenant + admin user, return JWT
- `POST /api/auth/login` - Authenticate user, return JWT
- `GET /api/auth/me` - Get current user info

### Lot Endpoints
- `GET /api/lots` - List all lots for tenant (with filters, pagination)
- `POST /api/lots` - Create new lot
- `GET /api/lots/:id` - Get single lot details
- `POST /api/lots/generate-number` - Generate next lot number for tenant
- `PATCH /api/lots/:id` - Update lot (if needed for corrections)

### Transaction Endpoints
- `POST /api/lots/:id/sell` - Create sale transaction
- `GET /api/transactions` - List all transactions for tenant
- `GET /api/transactions/:id` - Get transaction details

### Dashboard Endpoints
- `GET /api/dashboard/stats` - Get aggregated financials (investment, revenue, profit, lot count)
- `GET /api/dashboard/recent-transactions` - Get last 10-20 transactions

### Metadata Endpoints
- `GET /api/colors` - Get tenant's color list
- `POST /api/colors` - Add new color to tenant's list
- `GET /api/sizes` - Get tenant's size list
- `POST /api/sizes` - Add new size to tenant's list

### User Management (Admin only)
- `GET /api/users` - List all users in tenant
- `POST /api/users` - Create new user (staff account)
- `DELETE /api/users/:id` - Remove user

---

## 6. Authentication & Authorization

### Signup Flow
1. User fills form: Business Name, Admin Name, Email, Password
2. Backend validates email uniqueness
3. Create tenant document
4. Hash password with bcrypt
5. Create admin user linked to tenant
6. Generate JWT token with payload: `{ userId, tenantId, role, email }`
7. Return JWT + user data to frontend
8. Frontend stores JWT in localStorage
9. Redirect to dashboard

### Login Flow
1. User enters email + password
2. Backend finds user by email
3. Verify password with bcrypt
4. Generate JWT token
5. Return JWT + user data
6. Frontend stores JWT and redirects to dashboard

### Authorization Middleware (Backend)

**authenticateToken:**
- Verify JWT from Authorization header
- Extract userId, tenantId, role
- Attach to req.user
- Block if invalid/expired

**requireRole(['admin']):**
- Check req.user.role matches allowed roles
- Block staff from admin-only endpoints

**tenantScope:**
- All DB queries automatically filtered by req.user.tenantId
- Prevents cross-tenant data access

### Frontend Route Protection
- Auth context with user state
- Protected route wrapper checks JWT existence
- Redirect to login if not authenticated
- Hide admin features from staff users in UI

---

## 7. Error Handling & Validation

### Backend Validation
- Use express-validator or Zod for request validation
- Validation rules:
  - Lot creation: lotNumber required, at least one color/size, positive numbers for costs/quantities
  - Sale transaction: quantities must be ≤ remainingQuantity, at least one item selected
  - User creation: valid email format, password min 8 characters
  - Tenant signup: unique email per tenant

### Error Response Format
```typescript
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR' | 'AUTH_ERROR' | 'NOT_FOUND' | 'INSUFFICIENT_STOCK',
    message: 'Human-readable error message',
    details?: any // validation errors, available quantities, etc.
  }
}
```

### Frontend Error Handling
- Display validation errors inline on forms
- Sonner toast notifications for success/error messages
- Specific error handling for stock validation:
  - Show which items have insufficient stock
  - Display available quantities
  - Allow user to adjust quantities

### Stock Validation Logic
```typescript
// Before processing sale
for each item in saleRequest:
  find lot.items[color].sizes[size]
  if quantity > remainingQuantity:
    return error with available quantity
```

### Database Transaction Safety
- Use MongoDB transactions for sale operations
- Ensures atomic updates to lot quantities and transaction creation
- Rollback if any step fails

---

## 8. UI Components & Styling

### shadcn/ui Components
- Dialog - for sell modal
- Button - primary actions, secondary actions
- Input - text inputs for forms
- Select - dropdowns for colors, sizes
- Table - lots list, transactions list
- Card - dashboard stats, lot details
- Form - form handling with react-hook-form
- Label - form labels
- Badge - status indicators, role badges
- Tabs - organize lot details view
- Dropdown Menu - user menu, action menus

### Sonner Toast
- Success messages: "Lot created successfully", "Sale completed"
- Error messages: "Insufficient stock", "Invalid credentials"
- Info messages: "Lot number generated"
- Position: bottom-right
- Auto-dismiss after 3-5 seconds

### Color Scheme
- Primary: Blue for main actions (Create, Sell, Save)
- Success: Green for revenue, profit positive indicators
- Destructive: Red for delete, errors
- Muted: Gray for secondary text, borders
- Background: Clean white/light gray

### Form Patterns
- Lot creation: Dynamic form with add/remove color and size rows
- Inline validation with error messages below inputs
- Disabled submit buttons until form is valid
- Loading states on buttons during API calls

### Responsive Behavior
- Desktop-first design (primary use case)
- Tables scroll horizontally on smaller screens
- Sell modal stacks vertically on mobile (selection form on top, cart below)

---

## 9. Testing Strategy

### Frontend Testing
- Unit tests with Jest + React Testing Library
- Test critical components:
  - Lot creation form (validation, dynamic add/remove)
  - Sell modal (stock validation, cart management)
  - Authentication forms
- Integration tests for user flows:
  - Complete signup → create lot → sell items flow
  - Login → view dashboard → navigate to lots

### Backend Testing
- Unit tests with Jest + Supertest
- Test cases:
  - Authentication: signup, login, JWT validation
  - Lot creation: investment calculation, data validation
  - Sale transaction: stock deduction, financial updates, oversell prevention
  - Tenant isolation: ensure users can't access other tenant's data
- Mock MongoDB with mongodb-memory-server

### Key Test Scenarios
1. Stock validation: Attempt to sell more than available, verify error
2. Financial calculations: Create lot, make sales, verify totals match
3. Tenant isolation: User A cannot access User B's lots
4. Role permissions: Staff cannot create users, admin can
5. Concurrent sales: Two sales on same lot don't cause negative stock

### Manual Testing Checklist
- Multi-tenant: Create 2 tenants, verify complete data isolation
- Full workflow: Signup → Create lot → Sell → View financials
- Edge cases: Empty lots, sell all stock, very large quantities

---

## 10. Deployment & Environment Setup

### Frontend (Vercel)
- GitHub repository connected to Vercel
- Environment variables:
  - `NEXT_PUBLIC_API_URL` - Backend API URL
- Automatic deployments on push to main branch
- Preview deployments for pull requests

### Backend (Railway/Render)
- GitHub repository connected to platform
- Environment variables:
  - `MONGODB_URI` - MongoDB connection string
  - `JWT_SECRET` - Secret key for signing tokens
  - `FRONTEND_URL` - Vercel frontend URL (for CORS)
  - `PORT` - Server port (default 5000)
  - `NODE_ENV` - production/development
- Automatic deployments on push to main branch

### MongoDB Setup
- MongoDB Atlas (free tier for development)
- Cluster with proper network access
- Database: `inventory-saas`
- Create indexes:
  - `tenantId` on all collections
  - `email` (unique) on users collection
  - `lotNumber + tenantId` (compound unique) on lots collection

### Local Development
- Frontend: `npm run dev` on port 3000
- Backend: `npm run dev` on port 5000
- MongoDB: Local instance or Atlas connection
- `.env.local` files for environment variables (add to .gitignore)

### Project Structure
```
inventory-management/
├── frontend/          # Next.js app
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── package.json
├── backend/           # Express API
│   ├── src/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── server.ts
│   └── package.json
└── README.md
```

---

## Key Features Summary

1. **Multi-tenant SaaS** - Complete data isolation between businesses
2. **Custom Authentication** - Email/password with JWT tokens
3. **User Roles** - Admin (full access) and Staff (limited permissions)
4. **Lot Management** - Manual or auto-generated lot numbers with nested color/size structure
5. **Flexible Metadata** - Hybrid color/size entry (predefined + custom)
6. **Sale Transactions** - Modal-based selling with cart, stock validation, and metadata
7. **Financial Tracking** - Real-time investment, revenue, and profit calculations
8. **Dashboard** - Aggregated tenant-wide financials plus drill-down to lots
9. **Stock Protection** - Strict validation prevents overselling
10. **Modern UI** - shadcn/ui components with Sonner toasts

---

## Next Steps

1. Set up git worktree for isolated development
2. Create detailed implementation plan
3. Initialize frontend and backend projects
4. Set up MongoDB connection
5. Build authentication system first
6. Implement core lot management
7. Add selling functionality
8. Create dashboard and reporting
9. Testing and deployment
