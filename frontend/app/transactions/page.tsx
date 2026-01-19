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
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold mb-2">Sales History</h1>
            <p className="text-gray-600">Complete transaction history with detailed breakdowns</p>
          </div>
          <button
            onClick={() => router.push('/lots')}
            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all"
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
          <div className="flex items-center gap-6">
            <div className="flex-1 relative">
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <Input
                type="text"
                placeholder="Search by lot number, customer, invoice, or seller..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="modern-input pl-12"
              />
            </div>
            <div className="px-6 py-4 rounded-xl bg-purple-50 border border-purple-100 text-center min-w-[120px]">
              <p className="text-xs text-purple-600 uppercase font-semibold mb-1">
                Total
              </p>
              <p className="text-3xl font-bold text-purple-700">
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
                  className="cursor-pointer hover:bg-gray-50 transition-colors p-6"
                  onClick={() => toggleExpanded(transaction._id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {transaction.lotId?.lotNumber?.substring(0, 2) || 'LT'}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {transaction.lotId?.lotNumber || 'Unknown Lot'}
                          </h3>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold">
                              {transaction.soldItems.length} Item{transaction.soldItems.length !== 1 ? 's' : ''}
                            </span>
                            {transaction.customerName && (
                              <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold">
                                {transaction.customerName}
                              </span>
                            )}
                            {transaction.invoiceNumber && (
                              <span className="px-2 py-1 rounded-lg bg-orange-50 text-orange-700 text-xs font-semibold">
                                {transaction.invoiceNumber}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600 ml-[72px]">
                        <span>
                          Sold by <span className="font-semibold">{transaction.soldBy.name}</span>
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(transaction.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                          Total Revenue
                        </p>
                        <p className="text-3xl font-bold text-green-600">
                          ${transaction.totalRevenue.toFixed(2)}
                        </p>
                      </div>
                      <div className={`w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center transition-transform ${
                        expandedId === transaction._id ? 'rotate-180' : ''
                      }`}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === transaction._id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6 animate-scale-in">
                    <h4 className="text-lg font-bold text-gray-900 mb-4">
                      Sold Items Breakdown
                    </h4>
                    <div className="space-y-3 mb-6">
                      {transaction.soldItems.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-10 text-xs rounded-lg bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold">
                              {item.size}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {item.color} - Size {item.size}
                              </p>
                              <p className="text-sm text-gray-600">
                                {item.quantity} × ${item.sellPricePerPiece.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">
                              Subtotal
                            </p>
                            <p className="text-xl font-bold text-orange-600">
                              ${item.totalAmount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Transaction Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                          Transaction ID
                        </p>
                        <p className="font-mono text-sm text-gray-900 break-all">{transaction._id}</p>
                      </div>
                      <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">
                          Seller Email
                        </p>
                        <p className="text-sm text-gray-900">{transaction.soldBy.email}</p>
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
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="modern-card-lg p-6">
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
