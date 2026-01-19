'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import Navbar from '@/components/navbar';
import { StatCardSkeleton, ChartSkeleton, TransactionRowSkeleton } from '@/components/ui/skeleton';
import api from '@/lib/api';
import { DashboardStats, Transaction, ChartData } from '@/types';
import { toast } from 'sonner';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setError(null);
      const [statsRes, transactionsRes, chartRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get('/dashboard/recent-transactions?limit=10'),
        api.get('/dashboard/chart-data'),
      ]);
      setStats(statsRes.data.data);
      setRecentTransactions(transactionsRes.data.data.transactions);
      setChartData(chartRes.data.data);
    } catch (error: any) {
      const errorMessage = 'Failed to load dashboard data';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-12 animate-fade-in-up">
          <div>
            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back! Here's your inventory overview</p>
          </div>
          <button
            onClick={() => router.push('/lots/new')}
            className="modern-btn-primary px-6 py-3"
          >
            + Create New Lot
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="modern-card mb-8 border-l-4 border-red-500 animate-scale-in">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Error Loading Data</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
              <button
                onClick={fetchDashboardData}
                className="text-sm font-semibold text-red-600 hover:text-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Investment Card */}
          <div className="modern-card animate-fade-in-up stagger-1">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-badge">Investment</span>
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              ${stats?.totalInvestment?.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-sm text-gray-500">Total capital invested</p>
          </div>

          {/* Revenue Card */}
          <div className="gradient-card-success animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Revenue</span>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-3xl font-bold mb-1">
              ${stats?.totalRevenue?.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-sm text-white/80">Total sales generated</p>
          </div>

          {/* Profit Card */}
          <div className="gradient-card-primary animate-fade-in-up stagger-3">
            <div className="flex items-center justify-between mb-4">
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Profit</span>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-3xl font-bold mb-1">
              ${stats?.totalProfit?.toFixed(2) ?? '0.00'}
            </p>
            <p className="text-sm text-white/80">Net margin on sales</p>
          </div>

          {/* Active Lots Card */}
          <div className="modern-card animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-4">
              <span className="stat-badge-success">Active</span>
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">
              {stats?.activeLots ?? 0}
            </p>
            <p className="text-sm text-gray-500">Active inventory lots</p>
          </div>
        </div>
        )}

        {/* Charts Section */}
        {loading ? (
          <div className="space-y-6 mb-12">
            <ChartSkeleton />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        ) : chartData && (
          <div className="space-y-6 mb-12">
            {/* Revenue & Profit Trend */}
            <div className="modern-card-lg animate-fade-in-up stagger-5">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-1">Revenue & Profit Trend</h2>
                <p className="text-gray-600 text-sm">Last 30 days performance overview</p>
              </div>
              {chartData.revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData.revenueTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis
                      dataKey="date"
                      stroke="#718096"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                      stroke="#718096"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: any) => [`$${Number(value).toFixed(2)}`]}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#48BB78"
                      strokeWidth={3}
                      dot={{ fill: '#48BB78', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Revenue"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#667EEA"
                      strokeWidth={3}
                      dot={{ fill: '#667EEA', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Profit"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-16 bg-gray-50 rounded-xl">
                  <p className="text-gray-500">No revenue data for the last 30 days</p>
                </div>
              )}
            </div>

            {/* Sales by Lot & Inventory Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Lot */}
              <div className="modern-card-lg animate-fade-in-up stagger-6">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Top Lots by Sales</h2>
                  <p className="text-gray-600 text-sm">Best performing inventory lots</p>
                </div>
                {chartData.salesByLot.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.salesByLot}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="lotNumber"
                        stroke="#718096"
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis
                        stroke="#718096"
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any) => [`$${Number(value).toFixed(2)}`]}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="revenue"
                        fill="#48BB78"
                        radius={[8, 8, 0, 0]}
                        name="Revenue"
                      />
                      <Bar
                        dataKey="profit"
                        fill="#667EEA"
                        radius={[8, 8, 0, 0]}
                        name="Profit"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No sales data available</p>
                  </div>
                )}
              </div>

              {/* Inventory Status */}
              <div className="modern-card-lg animate-fade-in-up stagger-7">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-1">Inventory Status</h2>
                  <p className="text-gray-600 text-sm">Sold vs remaining stock by lot</p>
                </div>
                {chartData.inventoryStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData.inventoryStatus}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="lotNumber"
                        stroke="#718096"
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis
                        stroke="#718096"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        formatter={(value: any, name: any) => [
                          `${Number(value)} items`,
                          name === 'sold' ? 'Sold' : 'Remaining'
                        ]}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                      />
                      <Bar
                        dataKey="sold"
                        fill="#48BB78"
                        radius={[8, 8, 0, 0]}
                        stackId="a"
                        name="Sold"
                      />
                      <Bar
                        dataKey="remaining"
                        fill="#CBD5E0"
                        radius={[8, 8, 0, 0]}
                        stackId="a"
                        name="Remaining"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-16 bg-gray-50 rounded-xl">
                    <p className="text-gray-500">No inventory data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recent Transactions */}
        <div className="modern-card-lg animate-fade-in-up stagger-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Recent Transactions</h2>
              <p className="text-gray-600 text-sm">Latest sales activity</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/transactions')}
                className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white font-semibold text-sm hover:bg-gray-50 transition-all"
              >
                View All
              </button>
              <button
                onClick={() => router.push('/lots')}
                className="modern-btn-primary px-5 py-2.5 text-sm"
              >
                Manage Lots
              </button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-5">
                  <TransactionRowSkeleton />
                </div>
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-1">No transactions yet</p>
              <p className="text-gray-500">Start selling to see your transaction history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction, index) => (
                <div
                  key={transaction._id}
                  className="flex items-center justify-between p-5 rounded-xl hover:bg-gray-50 transition-all cursor-pointer border border-transparent hover:border-gray-100"
                  style={{
                    animation: `fadeIn 0.3s ease-out forwards`,
                    animationDelay: `${index * 0.05}s`,
                    opacity: 0
                  }}
                  onClick={() => router.push('/transactions')}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {transaction.lotId?.lotNumber?.substring(0, 2) || 'LT'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-0.5">
                        {transaction.lotId?.lotNumber || 'Unknown Lot'}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>Sold by {transaction.soldBy.name}</span>
                        {transaction.customerName && (
                          <>
                            <span>•</span>
                            <span>Customer: {transaction.customerName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600 mb-0.5">
                      ${transaction.totalRevenue.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
