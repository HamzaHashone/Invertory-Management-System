'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { TransactionRowSkeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import api from '@/lib/api';
import { Transaction } from '@/types';
import { toast } from 'sonner';

function TransactionsPageContent() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize from URL params
  useEffect(() => {
    const pageParam = searchParams.get('page');
    const searchParam = searchParams.get('search');
    if (pageParam) setCurrentPage(parseInt(pageParam));
    if (searchParam) setSearch(searchParam);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      // Reset to page 1 when search changes
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchTransactions(1, search);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchTransactions(currentPage, search);
  }, [currentPage]);

  const fetchTransactions = async (page: number, searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/transactions', {
        params: {
          page,
          limit: 10,
          search: searchQuery || undefined
        }
      });
      setTransactions(response.data.data.transactions);
      setTotalPages(response.data.data.pagination.totalPages);
      setTotalCount(response.data.data.pagination.total);

      // Update URL
      const params = new URLSearchParams();
      if (page > 1) params.set('page', page.toString());
      if (searchQuery) params.set('search', searchQuery);
      const newUrl = params.toString() ? `?${params.toString()}` : '/transactions';
      router.replace(newUrl, { scroll: false });
    } catch (error: any) {
      const errorMessage = 'Failed to load transactions';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const toggleExpanded = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-8 sm:mb-12 animate-fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Sales History</h1>
            <p className="text-sm sm:text-base text-gray-600">Complete transaction history with detailed breakdowns</p>
          </div>
          <button
            onClick={() => router.push('/lots')}
            className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-all whitespace-nowrap"
          >
            View Lots
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="modern-card mb-8 border-l-4 border-red-500 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Transactions</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => fetchTransactions(currentPage, search)}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="modern-card-lg mb-8 animate-fade-in-up stagger-1">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-6">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="modern-input pl-10 sm:pl-12 text-sm"
              />
            </div>
            <div className="px-4 sm:px-6 py-3 sm:py-4 rounded-xl bg-purple-50 border border-purple-100 text-center min-w-[100px] sm:min-w-[120px]">
              <p className="text-xs text-purple-600 uppercase font-semibold mb-1">
                Total
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-700">
                {loading ? '...' : totalCount}
              </p>
            </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="modern-card-lg p-6">
                <TransactionRowSkeleton />
              </div>
            ))}
          </div>
        )}

        {/* Transactions List */}
        {!loading && transactions.length === 0 && (
          <div className="modern-card-lg text-center py-16 animate-scale-in stagger-2">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {search ? 'No transactions found' : 'No transactions yet'}
            </h3>
            <p className="text-gray-600">
              {search ? 'Try adjusting your search terms' : 'Start selling items to see transaction history'}
            </p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <>
            <div className="space-y-6">
              {transactions.map((transaction, index) => (
              <div
                key={transaction._id}
                className="modern-card-lg overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Transaction Header */}
                <div
                  className="cursor-pointer hover:bg-gray-50 transition-colors p-5 sm:p-6 lg:p-8"
                  onClick={() => toggleExpanded(transaction._id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4 sm:gap-5 mb-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0 shadow-sm">
                          {transaction.lotId?.lotNumber?.substring(0, 2) || 'LT'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 truncate">
                            {transaction.lotId?.lotNumber || 'Unknown Lot'}
                          </h3>
                          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <span className="px-3 py-1.5 sm:py-2 rounded-lg bg-purple-50 text-purple-700 text-xs sm:text-sm font-semibold border border-purple-100">
                              {transaction.soldItems.length} Item{transaction.soldItems.length !== 1 ? 's' : ''}
                            </span>
                            {transaction.customerName && (
                              <span className="px-3 py-1.5 sm:py-2 rounded-lg bg-blue-50 text-blue-700 text-xs sm:text-sm font-semibold truncate max-w-[150px] sm:max-w-none border border-blue-100">
                                {transaction.customerName}
                              </span>
                            )}
                            {transaction.invoiceNumber && (
                              <span className="px-3 py-1.5 sm:py-2 rounded-lg bg-orange-50 text-orange-700 text-xs sm:text-sm font-semibold border border-orange-100">
                                {transaction.invoiceNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm sm:text-base text-gray-600 sm:ml-[80px]">
                        <span>
                          Sold by <span className="font-semibold text-gray-900">{transaction.soldBy.name}</span>
                        </span>
                        <span className="hidden sm:inline text-gray-400">•</span>
                        <span>
                          {new Date(transaction.createdAt).toLocaleDateString()} • {new Date(transaction.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6">
                      <div className="text-left sm:text-right">
                        <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-2">
                          Total Revenue
                        </p>
                        <p className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600">
                          ${transaction.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gray-100 flex items-center justify-center transition-transform flex-shrink-0 ${
                        expandedId === transaction._id ? 'rotate-180' : ''
                      }`}>
                        <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === transaction._id && (
                  <div className="border-t-2 border-gray-100 bg-gray-50 p-5 sm:p-6 lg:p-8 animate-scale-in">
                    <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-5 sm:mb-6">
                      Sold Items Breakdown
                    </h4>
                    <div className="space-y-4 sm:space-y-5 mb-6 sm:mb-8">
                      {transaction.soldItems.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-white rounded-xl p-4 sm:p-5 lg:p-6 border-2 border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:border-orange-200 hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
                            <div className="min-w-[80px] sm:min-w-[100px] h-12 sm:h-14 text-sm sm:text-base rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                              {item.size}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-base sm:text-lg text-gray-900 mb-2">
                                {item.color} - Size {item.size}
                              </p>
                              <p className="text-sm sm:text-base text-gray-600">
                                {item.quantity} × ${item.sellPricePerPiece.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0 border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                            <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-2">
                              Subtotal
                            </p>
                            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">
                              ${item.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Transaction Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-100">
                        <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-3">
                          Transaction ID
                        </p>
                        <p className="font-mono text-xs sm:text-sm text-gray-900 break-all leading-relaxed">{transaction._id}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-gray-100">
                        <p className="text-xs sm:text-sm text-gray-500 uppercase font-semibold mb-3">
                          Seller Email
                        </p>
                        <p className="text-sm sm:text-base text-gray-900 break-all">{transaction.soldBy.email}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            </div>

            {/* Pagination */}
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          </>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="modern-card-lg p-4 sm:p-6">
                <TransactionRowSkeleton />
              </div>
            ))}
          </div>
        </div>
      </ProtectedRoute>
    }>
      <TransactionsPageContent />
    </Suspense>
  );
}
