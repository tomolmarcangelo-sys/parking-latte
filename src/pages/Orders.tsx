import React, { useState } from 'react';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../context/OrderContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Clock, CheckCircle, XCircle, Coffee, Search } from 'lucide-react';

const Orders: React.FC = () => {
  const { orders } = useOrders();
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  const filteredOrders = orders.filter(o => {
    const matchesStatus = activeFilter === 'ALL' || o.status === activeFilter;
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return <Clock size={20} className="text-amber-500" />;
      case 'PREPARING': return <Package size={20} className="text-blue-500 animate-pulse" />;
      case 'READY': return <CheckCircle size={20} className="text-green-500" />;
      case 'COMPLETED': return <CheckCircle size={20} className="text-slate-500" />;
      case 'CANCELLED': return <XCircle size={20} className="text-red-500" />;
    }
  };

  const getStatusColorClass = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-100 text-amber-700';
      case 'PREPARING': return 'bg-blue-100 text-blue-700';
      case 'READY': return 'bg-green-100 text-green-700';
      case 'COMPLETED': return 'bg-slate-100 text-slate-700';
      case 'CANCELLED': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filters: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-bold text-brand-primary">My orders</h1>
          <p className="text-text-muted">Track your caffeine journey here.</p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
            <input 
              type="text"
              placeholder="Search by Order ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-bg-sidebar border border-border-subtle rounded-2xl text-sm focus:border-brand-secondary outline-none transition-all font-medium"
            />
          </div>

          <div className="flex flex-wrap gap-2 bg-bg-sidebar p-1.5 rounded-2xl border border-border-subtle">
          {filters.map((f) => (
            <button
               key={f}
               onClick={() => setActiveFilter(f)}
               className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
        <AnimatePresence mode="popLayout">
          {filteredOrders.map((order) => (
            <motion.div 
              key={order.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`rounded-[32px] p-6 sm:p-8 coffee-shadow border flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 sm:gap-8 relative overflow-hidden group transition-all duration-500 ${order.status === 'READY' ? 'bg-green-50 border-green-400 shadow-green-500/20' : 'bg-white border-border-subtle'}`}
            >
              {/* Header Section: Image, ID, Date, and Status Badge (pinned right on mobile) */}
              <div className="w-full lg:w-auto flex justify-between items-start lg:items-center gap-6">
                <div className="flex gap-4 sm:gap-6 items-center">
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border group-hover:scale-110 transition-transform duration-500 flex-shrink-0 ${order.status === 'READY' ? 'bg-green-100 border-green-300' : 'bg-bg-sidebar border-border-subtle/50'}`}>
                    {getStatusIcon(order.status)}
                  </div>
                  <div>
                    <span className="font-serif text-lg sm:text-xl font-bold text-brand-primary block mb-0.5 sm:mb-1">#{order.id.slice(0, 8)}</span>
                    <p className="text-[11px] sm:text-sm text-text-muted font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Status Badge for mobile - visible only on smaller screens */}
                <div className="lg:hidden">
                  <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap ${getStatusColorClass(order.status)}`}>
                    {order.status === 'READY' ? 'Ready for Pick Up' : order.status}
                  </span>
                </div>
              </div>

              {/* Items Summary Section */}
              <div className="flex-1 lg:px-8 w-full">
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="bg-bg-sidebar text-brand-primary px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold border border-border-subtle/30 shadow-sm whitespace-nowrap">
                        {item.quantity}x {item.product.name}
                      </span>
                      {item.customization && Object.keys(item.customization as object).length > 0 && (
                        <div className="flex flex-wrap gap-x-2 px-1">
                          {Object.entries(item.customization as Record<string, string | string[]>).map(([k, v]) => (
                            <span key={k} className="text-[8px] sm:text-[9px] uppercase tracking-tighter text-brand-secondary font-bold whitespace-nowrap">
                              {Array.isArray(v) ? v.join(', ') : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {order.staffNotes && (
                   <div className="mt-4 bg-brand-secondary/5 border border-brand-secondary/20 p-3 rounded-xl flex items-start gap-2">
                     <span className="bg-brand-secondary/20 text-brand-primary px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest mt-0.5">Note</span>
                     <p className="text-sm text-brand-primary italic font-serif flex-1">{order.staffNotes}</p>
                   </div>
                )}
              </div>

              {/* Desktop Status Badge + Total Amount Section (pinned right on all views) */}
              <div className="flex flex-col items-end gap-2 lg:gap-4 self-end lg:self-center w-full lg:w-auto">
                <div className="hidden lg:block">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${getStatusColorClass(order.status)}`}>
                    {order.status === 'READY' ? 'Ready for Pick Up' : order.status}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-text-muted mb-0.5 sm:mb-1">Total Amount</p>
                  <p className="text-2xl sm:text-3xl font-bold text-brand-primary font-sans">₱{Number(order.totalAmount).toFixed(2)}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredOrders.length === 0 && (
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
    </div>
  );
};

export default Orders;
