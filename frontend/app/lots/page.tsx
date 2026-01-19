'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LotCardSkeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import api from '@/lib/api';
import { Lot } from '@/types';
import { toast } from 'sonner';

function LotsPageContent() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
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
        fetchLots(1, search);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLots(currentPage, search);
  }, [currentPage]);

  const fetchLots = async (page: number, searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/lots', {
        params: {
          page,
          limit: 10,
          search: searchQuery || undefined
        },
      });
      setLots(response.data.data.lots);
      setTotalPages(response.data.data.pagination.totalPages);

      // Update URL
      const params = new URLSearchParams();
      if (page > 1) params.set('page', page.toString());
      if (searchQuery) params.set('search', searchQuery);
      const newUrl = params.toString() ? `?${params.toString()}` : '/lots';
      router.replace(newUrl, { scroll: false });
    } catch (error) {
      const errorMessage = 'Failed to load lots';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getRemainingItems = (lot: Lot) => {
    return lot.items.reduce(
      (total, color) =>
        total +
        color.sizes.reduce((sum, size) => sum + size.remainingQuantity, 0),
      0
    );
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-8 sm:mb-12 animate-fade-in-up">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2">Inventory Lots</h1>
            <p className="text-sm sm:text-base text-gray-600">Manage and track your product inventory</p>
          </div>
          <button
            onClick={() => router.push('/lots/new')}
            className="modern-btn-primary px-4 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm whitespace-nowrap"
          >
            + Create New Lot
          </button>
        </div>

        {/* Search */}
        <div className="mb-8 animate-fade-in-up stagger-1">
          <div className="relative max-w-md">
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <Input
              placeholder="Search by lot number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="modern-input pl-12"
            />
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="modern-card mb-8 border-l-4 border-red-500 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Lots</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={() => fetchLots(currentPage, search)}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 gap-6 animate-fade-in-up">
            {Array.from({ length: 5 }).map((_, i) => (
              <LotCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Lots Grid */}
        {!loading && lots.length === 0 && (
          <div className="modern-card-lg text-center py-16 animate-scale-in">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No lots found</h3>
            <p className="text-gray-600 mb-6">
              {search ? 'Try adjusting your search' : 'Create your first lot to get started'}
            </p>
            {!search && (
              <button
                onClick={() => router.push('/lots/new')}
                className="modern-btn-primary px-6 py-3"
              >
                + Create Your First Lot
              </button>
            )}
          </div>
        )}

        {!loading && lots.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-6 animate-fade-in-up stagger-2">
              {lots.map((lot, index) => {
                const remainingItems = getRemainingItems(lot);
                return (
                  <div
                    key={lot._id}
                    className="modern-card hover:shadow-lg transition-all cursor-pointer"
                    style={{
                      animation: `fadeIn 0.3s ease-out forwards`,
                      animationDelay: `${index * 0.05}s`,
                      opacity: 0
                    }}
                    onClick={() => router.push(`/lots/${lot._id}`)}
                  >
                    {/* Mobile Layout */}
                    <div className="flex flex-col space-y-4 lg:hidden">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg sm:text-xl flex-shrink-0">
                          {lot.lotNumber?.substring(0, 2) || 'LT'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1 truncate">
                            {lot.lotNumber}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">
                            Created {new Date(lot.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Investment</p>
                          <p className="text-sm sm:text-base font-bold text-gray-900">
                            ${lot.totalInvestment?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Revenue</p>
                          <p className="text-sm sm:text-base font-bold text-green-600">
                            ${lot.totalRevenue?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Profit</p>
                          <p className={`text-sm sm:text-base font-bold ${
                            (lot.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${lot.totalProfit?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Remaining</p>
                          <p className="text-sm sm:text-base font-bold text-gray-900">
                            {remainingItems}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:gap-3 pt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/lots/${lot._id}`);
                          }}
                          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-xs sm:text-sm hover:bg-gray-50 transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/lots/${lot._id}?sell=true`);
                          }}
                          disabled={remainingItems === 0}
                          className="flex-1 modern-btn-primary px-4 py-2.5 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sell Items
                        </button>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden lg:flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                          {lot.lotNumber?.substring(0, 2) || 'LT'}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900 mb-1">
                            {lot.lotNumber}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Created {new Date(lot.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-8">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Investment</p>
                          <p className="text-lg font-bold text-gray-900">
                            ${lot.totalInvestment?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Revenue</p>
                          <p className="text-lg font-bold text-green-600">
                            ${lot.totalRevenue?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Profit</p>
                          <p className={`text-lg font-bold ${
                            (lot.totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${lot.totalProfit?.toFixed(2) ?? '0.00'}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Remaining</p>
                          <p className="text-lg font-bold text-gray-900">
                            {remainingItems}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-3 ml-8">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/lots/${lot._id}`);
                          }}
                          className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/lots/${lot._id}?sell=true`);
                          }}
                          disabled={remainingItems === 0}
                          className="modern-btn-primary px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Sell Items
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
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

export default function LotsPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
          <div className="grid grid-cols-1 gap-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <LotCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </ProtectedRoute>
    }>
      <LotsPageContent />
    </Suspense>
  );
}
