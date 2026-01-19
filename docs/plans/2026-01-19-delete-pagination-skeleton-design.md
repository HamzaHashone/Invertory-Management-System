# Delete Lot API, Pagination, and Skeleton Loading Design

**Date:** 2026-01-19
**Status:** Approved

## Overview

This design adds three key features to the inventory management system:
1. Permanent lot deletion with transaction preservation
2. Server-side pagination for lots and transactions
3. Skeleton loading states across all major pages

## Requirements

### Delete Lot Functionality
- Permanent deletion (not soft delete)
- Preserve transaction history for audit purposes
- Admin or lot creator authorization required
- Confirmation dialog before deletion
- Graceful handling of deleted lot references in transactions

### Pagination
- Default page size: 10 items
- Server-side pagination for both lots and transactions
- UI: Page numbers with previous/next arrows
- URL state management for back button support
- Search functionality resets to page 1

### Skeleton Loading
- Replace spinners with content-aware skeletons
- Implement on: lots list, transactions list, dashboard, lot details
- Smooth pulse animation
- Separate reusable components

## Architecture

### Backend Changes

#### 1. Delete Lot Endpoint

**Route:** `DELETE /api/lots/:id`

**Controller Logic:**
```typescript
// In lot.controller.ts
export const deleteLot = async (req: Request, res: Response) => {
  const { id } = req.params;
  const tenantId = req.user.tenantId;
  const userId = req.user.id;

  // Find lot with tenant validation
  const lot = await Lot.findOne({ _id: id, tenantId });

  if (!lot) {
    return res.status(404).json({
      success: false,
      message: 'Lot not found'
    });
  }

  // Authorization check (admin or creator only)
  if (req.user.role !== 'admin' && lot.createdBy.toString() !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this lot'
    });
  }

  // Permanent delete
  await Lot.findByIdAndDelete(id);

  return res.json({
    success: true,
    message: 'Lot deleted successfully'
  });
};
```

**Route Registration:**
```typescript
// In lot.routes.ts
router.delete('/:id', auth, deleteLot);
```

**Transaction Handling:**
- Transactions keep their `lotId` ObjectId reference
- No cascade delete on transactions
- Frontend handles missing lot references gracefully

#### 2. Transaction Pagination

**Update Controller:**
```typescript
// In transaction.controller.ts
export const getTransactions = async (req: Request, res: Response) => {
  const tenantId = req.user.tenantId;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const lotId = req.query.lotId as string;
  const search = req.query.search as string;

  const skip = (page - 1) * limit;

  // Build query
  const query: any = { tenantId };
  if (lotId) {
    query.lotId = lotId;
  }

  // Search functionality (if implemented)
  if (search) {
    query.$or = [
      { customerName: { $regex: search, $options: 'i' } },
      { invoiceNumber: { $regex: search, $options: 'i' } }
    ];
  }

  // Fetch paginated data
  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('lotId', 'lotNumber')
      .populate('soldBy', 'name email'),
    Transaction.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limit);

  return res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }
  });
};
```

**API Response Format:**
```json
{
  "success": true,
  "data": {
    "transactions": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5
    }
  }
}
```

### Frontend Changes

#### 1. Reusable Components

**Pagination Component** (`/frontend/components/ui/pagination.tsx`)

```typescript
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  // Logic:
  // - Previous button (disabled if currentPage === 1)
  // - Page numbers with ellipsis
  // - Show: first page, last page, current page, 2 pages before/after current
  // - Next button (disabled if currentPage === totalPages)
  // - Click handlers call onPageChange(pageNumber)
}
```

**Features:**
- Smart page number display with ellipsis
- Responsive design (fewer numbers on mobile)
- Disabled state for boundary buttons
- Highlighted current page
- Tailwind CSS styling matching app theme

**Skeleton Components** (`/frontend/components/ui/skeleton.tsx`)

```typescript
// Base skeleton with pulse animation
export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse bg-gray-200 rounded", className)} />
  );
}

// Lot card skeleton
export function LotCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <Skeleton className="h-6 w-2/3" /> {/* Title */}
      <Skeleton className="h-4 w-full" />  {/* Line 1 */}
      <Skeleton className="h-4 w-5/6" />  {/* Line 2 */}
      <Skeleton className="h-4 w-4/6" />  {/* Line 3 */}
      <div className="flex gap-2 pt-4">
        <Skeleton className="h-10 w-24" /> {/* Button */}
        <Skeleton className="h-10 w-24" /> {/* Button */}
      </div>
    </div>
  );
}

// Transaction row skeleton
export function TransactionRowSkeleton() {
  return (
    <div className="flex gap-4 py-4 border-b">
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
      <Skeleton className="h-4 w-1/6" />
    </div>
  );
}

// Stat card skeleton (for dashboard)
export function StatCardSkeleton() {
  return (
    <div className="border rounded-lg p-6 space-y-3">
      <Skeleton className="h-4 w-1/2" /> {/* Label */}
      <Skeleton className="h-8 w-3/4" /> {/* Value */}
    </div>
  );
}

// Chart skeleton
export function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />;
}
```

#### 2. Page Updates

**Lots List Page** (`/frontend/app/lots/page.tsx`)

**Changes:**
- Add pagination state: `currentPage`, `totalPages`
- Update fetch to include `page` parameter
- Add URL query param management with `useSearchParams` and `useRouter`
- Replace loading spinner with grid of `LotCardSkeleton`
- Add `<Pagination />` component at bottom
- Search resets to page 1

**State Management:**
```typescript
const [lots, setLots] = useState([]);
const [loading, setLoading] = useState(true);
const [currentPage, setCurrentPage] = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [search, setSearch] = useState('');

const fetchLots = async (page: number, searchQuery: string) => {
  setLoading(true);
  const response = await api.get(`/lots?page=${page}&limit=10&search=${searchQuery}`);
  setLots(response.data.data.lots);
  setTotalPages(response.data.data.pagination.totalPages);
  setLoading(false);
};

const handlePageChange = (page: number) => {
  setCurrentPage(page);
  // Update URL
  router.push(`/lots?page=${page}&search=${search}`);
};
```

**Transactions List Page** (`/frontend/app/transactions/page.tsx`)

**Changes:**
- Remove client-side filtering
- Add server-side pagination
- Add search input (debounced 300ms)
- Replace loading spinner with `TransactionRowSkeleton` components
- Add `<Pagination />` component
- URL state management

**Dashboard Page** (`/frontend/app/dashboard/page.tsx`)

**Changes:**
- Replace spinners with skeleton components:
  - 4x `StatCardSkeleton` for stat cards
  - 1x `ChartSkeleton` for chart area
  - 5x `TransactionRowSkeleton` for recent transactions
- Keep existing data fetching logic
- Show skeletons only during initial load

**Lot Details Page** (`/frontend/app/lots/[id]/page.tsx`)

**Changes:**
- Add delete button in header/actions area
- Delete confirmation modal
- Replace loading spinner with `LotCardSkeleton` and `TransactionRowSkeleton`
- Handle deleted lot references in transaction list gracefully
- On successful delete, redirect to `/lots`

**Delete Confirmation Modal:**
```typescript
const handleDelete = async () => {
  if (!confirm('Delete this lot permanently? Transaction history will be preserved but the lot cannot be recovered.')) {
    return;
  }

  try {
    await api.delete(`/lots/${id}`);
    toast.success('Lot deleted successfully');
    router.push('/lots');
  } catch (error) {
    toast.error('Failed to delete lot');
  }
};
```

#### 3. Transaction Display with Deleted Lots

**Safe Lot Display:**
```typescript
// In transaction row component
const lotDisplay = transaction.lotId?.lotNumber || '(Lot Deleted)';
```

## Data Flow

### Delete Lot Flow
1. User clicks delete button on lot details or lots list
2. Confirmation dialog appears
3. User confirms deletion
4. Frontend sends `DELETE /api/lots/:id`
5. Backend validates authorization and tenant
6. Lot permanently deleted from database
7. Transactions remain with `lotId` reference
8. Frontend redirects to lots list
9. Toast notification confirms deletion

### Pagination Flow
1. User lands on lots/transactions page
2. Frontend sends request with `page=1&limit=10`
3. Backend returns paginated data + pagination metadata
4. Frontend displays data and pagination controls
5. User clicks page number
6. URL updates with new page number
7. New data fetched and displayed
8. Search query resets pagination to page 1

### Skeleton Loading Flow
1. User navigates to page
2. Page component mounts, sets `loading = true`
3. Skeleton components render immediately
4. Data fetch initiated
5. On response, `loading = false`
6. Real data fades in, skeletons fade out

## Security Considerations

### Delete Authorization
- Only admins or lot creators can delete
- Tenant isolation enforced at query level
- User ID verification before deletion
- 403 Forbidden if unauthorized
- 404 Not Found if lot doesn't exist or wrong tenant

### Pagination Security
- Tenant isolation on all queries
- No raw MongoDB queries exposed
- Input validation on page/limit parameters
- Maximum limit cap to prevent resource exhaustion

## Error Handling

### Delete Errors
- 404: Lot not found or wrong tenant
- 403: Not authorized to delete
- 500: Database error (logged, generic message to user)

### Pagination Errors
- Invalid page number: default to page 1
- Invalid limit: default to 10
- Out of bounds page: return empty array

### Frontend Error States
- Network errors: Show retry button
- Toast notifications for user feedback
- Graceful degradation for missing data

## Testing Checklist

### Backend
- [ ] Delete lot endpoint validates tenant isolation
- [ ] Delete lot endpoint checks authorization
- [ ] Transactions remain after lot deletion
- [ ] Transaction pagination returns correct page
- [ ] Transaction pagination respects limit
- [ ] Search functionality works with pagination

### Frontend
- [ ] Delete button shows confirmation dialog
- [ ] Successful delete redirects to lots list
- [ ] Failed delete shows error toast
- [ ] Pagination controls navigate correctly
- [ ] URL state updates on page change
- [ ] Back button works with pagination
- [ ] Search resets to page 1
- [ ] Skeletons match real content structure
- [ ] Deleted lot references show "(Lot Deleted)"
- [ ] Skeleton animations are smooth

## Implementation Order

1. **Backend - Delete Endpoint** (30 min)
   - Add delete controller function
   - Add route registration
   - Test with Postman/curl

2. **Backend - Transaction Pagination** (20 min)
   - Update getTransactions controller
   - Test pagination response format

3. **Frontend - Skeleton Components** (40 min)
   - Create base Skeleton component
   - Create all variant skeletons
   - Test animations and styling

4. **Frontend - Pagination Component** (45 min)
   - Build reusable Pagination component
   - Handle ellipsis logic
   - Style to match design system

5. **Frontend - Lots Page Update** (30 min)
   - Integrate pagination
   - Add skeleton loading
   - URL state management

6. **Frontend - Transactions Page Update** (30 min)
   - Remove client-side filtering
   - Integrate pagination
   - Add skeleton loading

7. **Frontend - Dashboard Skeletons** (20 min)
   - Replace spinners with skeletons
   - Test all loading states

8. **Frontend - Lot Details & Delete** (40 min)
   - Add delete button
   - Add confirmation modal
   - Handle deletion flow
   - Add skeleton loading

9. **Testing & Polish** (30 min)
   - Test all features end-to-end
   - Fix any UI issues
   - Verify error handling

**Total Estimated Time:** ~4-5 hours

## Future Enhancements

- Bulk lot deletion
- Restore deleted lots (would require soft delete)
- Export transactions for deleted lots
- Advanced search filters
- Configurable page sizes
- Infinite scroll option
- Skeleton loading for modals

## Success Metrics

- Delete functionality works without orphaning data
- Page load times remain under 1 second
- Skeleton loading improves perceived performance
- No pagination bugs with search/filter combinations
- All authorization checks pass security review
