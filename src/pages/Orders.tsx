import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Clock, CheckCircle, XCircle, Coffee, Search } from 'lucide-react';
import { io } from 'socket.io-client';

const Orders: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeFilter, setActiveFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, token } = useAuth();

  useEffect(() => {
    if (!token || !user) return;
    
    fetchOrders();

    console.log('[Socket] Connecting for user orders...');
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected for user orders');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] User socket error:', err);
    });

    socket.on('order-updated', (updatedOrder: Order) => {
      console.log('[Socket] Order updated for user:', updatedOrder.id, updatedOrder.status);
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    return () => { 
      socket.off('order-updated');
      socket.disconnect(); 
    };
  }, [user?.id, token]);

  const fetchOrders = async () => {
    const data = await apiClient.get('/orders');
    setOrders(data);
  };

  const filteredOrders = orders.filter(o => {
    const matchesStatus = activeFilter === 'ALL' || o.status === activeFilter;
    const matchesSearch = 
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      o.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesStatus && matchesSearch;
  });

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return <Clock size={20} className="text-brand-secondary" />;
      case 'PREPARING': return <Package size={20} className="text-brand-accent animate-pulse" />;
      case 'COMPLETED': return <CheckCircle size={20} className="text-brand-accent" />;
      case 'CANCELLED': return <XCircle size={20} className="text-brand-danger" />;
    }
  };

  const filters: (OrderStatus | 'ALL')[] = ['ALL', 'PENDING', 'PREPARING', 'COMPLETED', 'CANCELLED'];

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
              placeholder="Search ID or Customer..."
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
                  : 'text-text-muted hover:bg-white dark:hover:bg-bg-base transition-all'
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
              className="bg-white rounded-[32px] p-8 coffee-shadow border border-border-subtle flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative overflow-hidden group"
            >
              <div className="flex gap-6 items-center">
                <div className="w-16 h-16 bg-bg-sidebar rounded-2xl flex items-center justify-center border border-border-subtle/50 group-hover:scale-110 transition-transform duration-500">
                  {getStatusIcon(order.status)}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-serif text-xl font-bold text-brand-primary">#{order.id.slice(0, 8)}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full
                      ${order.status === 'PENDING' ? 'bg-brand-secondary/10 text-brand-secondary' : ''}
                      ${order.status === 'PREPARING' ? 'bg-brand-accent/10 text-brand-accent' : ''}
                      ${order.status === 'COMPLETED' ? 'bg-brand-accent/10 text-brand-accent' : ''}
                      ${order.status === 'CANCELLED' ? 'bg-brand-danger/10 text-brand-danger' : ''}
                    `}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted font-medium">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex-1 lg:px-8">
                <div className="flex flex-wrap gap-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="bg-bg-sidebar text-brand-primary px-4 py-1.5 rounded-xl text-xs font-bold border border-border-subtle/30 shadow-sm whitespace-nowrap">
                        {item.quantity}x {item.product.name}
                      </span>
                      {item.customization && Object.keys(item.customization as object).length > 0 && (
                        <div className="flex flex-wrap gap-x-2 px-1">
                          {Object.entries(item.customization as Record<string, string | string[]>).map(([k, v]) => (
                            <span key={k} className="text-[9px] uppercase tracking-tighter text-brand-secondary font-bold whitespace-nowrap">
                              {Array.isArray(v) ? v.join(', ') : v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-12 self-end lg:self-center">
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-1">Total Amount</p>
                  <p className="text-3xl font-bold text-brand-primary font-sans">₱{Number(order.totalAmount).toFixed(2)}</p>
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
