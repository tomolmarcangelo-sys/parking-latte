import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { OrderStatus } from '../types';
import { useOrders } from '../context/OrderContext';
import { AnimatePresence } from 'framer-motion';
import { Coffee, Search, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import OrderHistoryCard from '../components/OrderHistoryCard';
import OrderCardSkeleton from '../components/OrderCardSkeleton';

const Orders: React.FC = () => {
  const { orders, pagination, loading, refreshing, fetchOrders } = useOrders();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load orders when filters or pagination changes
  useEffect(() => {
    fetchOrders({
      page,
      limit: 10,
      status: activeFilter,
      startDate: dateRange.start,
      endDate: dateRange.end,
      search: debouncedSearch
    });
  }, [page, activeFilter, dateRange, debouncedSearch, fetchOrders]);

  const handleFilterChange = (filter: OrderStatus | 'ALL') => {
    setActiveFilter(filter);
    setPage(1);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDateRange(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setPage(1);
  };

  const filters: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-12">
      <header className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-bold text-brand-primary">My orders</h1>
          <p className="text-text-muted">Track your caffeine journey here.</p>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-4 w-full xl:w-auto">
          {/* Search */}
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text"
              placeholder="Search ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl text-sm focus:border-brand-secondary outline-none transition-all font-medium"
            />
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2 bg-bg-sidebar p-1.5 rounded-2xl border border-border-subtle w-full lg:w-auto overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 px-3 text-text-muted text-xs font-bold whitespace-nowrap">
              <Calendar size={14} />
              <span>Range:</span>
            </div>
            <input 
              type="date" 
              name="start"
              value={dateRange.start}
              onChange={handleDateChange}
              className="bg-white border border-border-subtle/50 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-brand-primary"
            />
            <span className="text-text-muted text-[10px] font-bold">-</span>
            <input 
              type="date" 
              name="end"
              value={dateRange.end}
              onChange={handleDateChange}
              className="bg-white border border-border-subtle/50 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-brand-primary"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 bg-bg-sidebar p-1.5 rounded-2xl border border-border-subtle w-full lg:w-auto overflow-x-auto no-scrollbar">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === f 
                    ? 'bg-brand-primary text-white shadow-md' 
                    : 'text-text-muted hover:bg-white transition-all'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid gap-6">
        <AnimatePresence mode="popLayout" initial={false}>
          {(loading || refreshing) && orders.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => <OrderCardSkeleton key={`skeleton-${i}`} />)
          ) : (
            orders.map((order) => (
              <OrderHistoryCard key={order.id} order={order} />
            ))
          )}
        </AnimatePresence>

        {(!loading && !refreshing && orders.length === 0) && (
          <div className="text-center py-24 bg-bg-sidebar/50 rounded-[40px] border-2 border-dashed border-border-subtle/50">
            <Coffee size={48} className="mx-auto mb-6 opacity-10" />
            <p className="text-text-muted font-serif italic text-lg">
              {searchQuery 
                ? `No orders matching "${searchQuery}"`
                : activeFilter === 'ALL' 
                  ? "No orders yet. Time for a coffee?" 
                  : `No ${activeFilter.toLowerCase()} orders found.`}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8">
          <button
            onClick={() => setPage(prev => Math.max(1, prev - 1))}
            disabled={page === 1 || loading || refreshing}
            className="p-3 bg-white border border-border-subtle rounded-2xl hover:bg-bg-sidebar disabled:opacity-50 transition-all shadow-sm"
          >
            <ChevronLeft size={20} className="text-brand-primary" />
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-brand-primary">Page {page} of {pagination.pages}</span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">({pagination.total} total)</span>
          </div>

          <button
            onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
            disabled={page === pagination.pages || loading || refreshing}
            className="p-3 bg-white border border-border-subtle rounded-2xl hover:bg-bg-sidebar disabled:opacity-50 transition-all shadow-sm"
          >
            <ChevronRight size={20} className="text-brand-primary" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Orders;
