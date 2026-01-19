'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import SellModal from '@/components/sell-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCardSkeleton, TransactionRowSkeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';
import { Lot, Transaction } from '@/types';
import { toast } from 'sonner';
import { Trash2, AlertTriangle } from 'lucide-react';

export default function LotDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLotDetails();
    fetchTransactions();

    if (searchParams.get('sell') === 'true') {
      setSellModalOpen(true);
    }
  }, [params.id]);

  const fetchLotDetails = async () => {
    try {
      const response = await api.get(`/lots/${params.id}`);
      setLot(response.data.data.lot);
    } catch (error) {
      toast.error('Failed to load lot details');
      router.push('/lots');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await api.get('/transactions', {
        params: { lotId: params.id },
      });
      setTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Failed to load transactions');
    }
  };

  const handleSellSuccess = () => {
    fetchLotDetails();
    fetchTransactions();
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await api.delete(`/lots/${params.id}`);
      toast.success('Lot deleted successfully');
      router.push('/lots');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete lot');
      setIsDeleting(false);
      setDeleteModalOpen(false);
    }
  };

  const getRemainingItems = () => {
    if (!lot) return 0;
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
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div>
            <button
              onClick={() => router.push('/lots')}
              className="text-sm text-gray-600 hover:text-gray-900 font-semibold mb-4 flex items-center gap-2"
            >
              ← Back to Lots
            </button>
            <h1 className="text-4xl font-bold mb-2">{loading ? '...' : lot?.lotNumber}</h1>
            <p className="text-gray-600">
              {loading ? 'Loading...' : `Created ${new Date(lot!.createdAt).toLocaleDateString()}`}
            </p>
          </div>
          {!loading && lot && (
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="px-5 py-2.5 rounded-xl border border-red-200 bg-white font-semibold text-sm hover:bg-red-50 text-red-600 hover:text-red-700 transition-all flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => router.push(`/lots/${params.id}/edit`)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                Edit Lot
              </button>
              <button
                onClick={() => setSellModalOpen(true)}
                disabled={getRemainingItems() === 0}
                className="modern-btn-primary px-5 py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sell Items
              </button>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : lot && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="modern-card animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-badge">Investment</span>
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${lot.totalInvestment.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Total capital invested</p>
          </div>

          <div className="gradient-card-success animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Revenue</span>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-3xl font-bold mb-1">
              ${lot.totalRevenue.toFixed(2)}
            </p>
            <p className="text-sm text-white/80">Total sales generated</p>
          </div>

          <div className="gradient-card-primary animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Profit</span>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className={`text-3xl font-bold mb-1 ${
              lot.totalProfit >= 0 ? '' : 'text-red-200'
            }`}>
              ${lot.totalProfit.toFixed(2)}
            </p>
            <p className="text-sm text-white/80">Net margin on sales</p>
          </div>

          <div className="modern-card animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-badge-success">Remaining</span>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {getRemainingItems()}
            </p>
            <p className="text-sm text-gray-500">Items in inventory</p>
          </div>
        </div>
        )}

        {/* Inventory Details */}
        {!loading && lot && (
        <div className="modern-card-lg mb-8 animate-fade-in-up stagger-5">
          <h2 className="text-2xl font-bold mb-6">Inventory Details</h2>
          <div className="space-y-8">
            {lot.items.map((colorItem) => (
              <div key={colorItem.color}>
                <h3 className="text-lg font-bold text-gray-900 mb-4">{colorItem.color}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {colorItem.sizes.map((size) => (
                    <div
                      key={size.size}
                      className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center gap-6">
                        <span className="inline-flex items-center justify-center w-20 h-10 text-xs rounded-lg bg-purple-50 text-purple-600 font-bold">
                          {size.size}
                        </span>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Quantity</p>
                          <p className="font-bold text-gray-900">
                            {size.remainingQuantity} / {size.quantity}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-8">
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Purchase</p>
                          <p className="font-bold text-gray-900">${size.purchaseCostPerPiece.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Sell</p>
                          <p className="font-bold text-green-600">${size.sellCostPerPiece.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Transaction History */}
        <div className="modern-card-lg animate-fade-in-up stagger-6">
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5">
                  <TransactionRowSkeleton />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">No transactions yet</p>
              <p className="text-gray-500">Start selling to see transaction history</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="p-5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 mb-1">
                        {new Date(transaction.createdAt).toLocaleString()}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <span>Sold by {transaction.soldBy.name}</span>
                        {transaction.customerName && (
                          <>
                            <span>•</span>
                            <span>Customer: {transaction.customerName}</span>
                          </>
                        )}
                        {transaction.invoiceNumber && (
                          <>
                            <span>•</span>
                            <span>Invoice: {transaction.invoiceNumber}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                      ${transaction.totalRevenue.toFixed(2)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transaction.soldItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg bg-purple-50 text-purple-700 text-sm font-semibold"
                      >
                        {item.color} - {item.size} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {!loading && lot && (
        <SellModal
          lot={lot}
          open={sellModalOpen}
          onClose={() => {
            setSellModalOpen(false);
            router.replace(`/lots/${params.id}`);
          }}
          onSuccess={handleSellSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <DialogTitle className="text-xl">Delete Lot</DialogTitle>
            </div>
            <DialogDescription className="text-left pt-2">
              Are you sure you want to delete this lot permanently? Transaction history will be preserved but the lot cannot be recovered.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <button
              onClick={() => setDeleteModalOpen(false)}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Lot
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
