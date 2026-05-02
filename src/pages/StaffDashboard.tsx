import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, X, User, Clock, Coffee, Bell, Volume2, VolumeX } from 'lucide-react';
import { io } from 'socket.io-client';

const StaffDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notification, setNotification] = useState<Order | null>(null);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const { token } = useAuth();

  const playNotificationSound = () => {
    if (!soundsEnabled) return;
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(err => console.error('Audio playback failed:', err));
  };

  useEffect(() => {
    if (!token) return;

    fetchOrders();

    const socket = io('/', {
      auth: { token }
    });

    socket.emit('join-staff');

    socket.on('new-order', (newOrder: Order) => {
      setOrders(prev => [newOrder, ...prev]);
      setNotification(newOrder);
      playNotificationSound();
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(prev => prev?.id === newOrder.id ? null : prev);
      }, 5000);
    });

    socket.on('order-updated', (updatedOrder: Order) => {
      setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    });

    return () => { 
      socket.off('new-order');
      socket.off('order-updated');
      socket.disconnect(); 
    };
  }, [token]);

  const fetchOrders = async () => {
    const data = await apiClient.get('/orders');
    setOrders(data);
  };

  const updateStatus = async (id: string, status: OrderStatus) => {
    const updated = await apiClient.patch(`/orders/${id}/status`, { status });
    setOrders(prev => prev.map(o => o.id === id ? updated : o));
  };

  const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');
  const completedOrders = orders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end mb-10">
        <div className="space-y-1">
          <h1 className="text-4xl font-serif font-bold text-brand-primary">Order Queue</h1>
          <p className="text-text-muted">Managing {activeOrders.length} active orders safely.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all border shadow-sm ${soundsEnabled ? 'bg-white text-brand-primary border-border-subtle hover:bg-bg-sidebar' : 'bg-brand-danger/10 text-brand-danger border-brand-danger/20'}`}
            title={soundsEnabled ? "Mute Notifications" : "Unmute Notifications"}
          >
            {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <div className="bg-white dark:bg-bg-sidebar border border-border-subtle rounded-2xl px-6 py-3 flex flex-col items-center shadow-sm">
            <span className="text-[10px] text-text-muted uppercase font-bold tracking-widest text-center">Active Orders</span>
            <span className="text-xl font-bold text-brand-primary">{activeOrders.length}</span>
          </div>
          <div className="bg-brand-secondary text-white rounded-2xl px-6 py-3 flex flex-col items-center shadow-md">
            <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">Store Status</span>
            <span className="text-xl font-bold">Open</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-serif font-bold text-brand-primary flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-accent animate-pulse"></div>
            Process List
          </h2>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((order) => (
                <motion.div 
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white dark:bg-bg-sidebar rounded-[32px] border border-border-subtle p-6 shadow-sm relative overflow-hidden transition-colors duration-300"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand-accent/10 rounded-bl-full flex items-center justify-end pr-4 pt-4 text-brand-accent">
                    <Clock size={24} />
                  </div>
                  
                  <div className="flex justify-between mb-4">
                    <div className="flex items-center gap-2">
                       <span className="bg-bg-sidebar text-brand-primary px-3 py-1 rounded-full text-xs font-bold uppercase">#{(order.id as string).slice(0, 8)}</span>
                       <span className={`text-[10px] font-bold uppercase tracking-widest ${order.status === 'PREPARING' ? 'text-brand-accent' : 'text-brand-secondary'}`}>
                         {order.status}
                       </span>
                    </div>
                  </div>

                  <h3 className="text-2xl font-serif font-bold text-brand-primary mb-2">
                    {order.items.map(i => i.product.name).join(' + ')}
                  </h3>
                  
                  <div className="space-y-3 mb-6">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex flex-col">
                        <p className="text-text-muted text-base">
                          <span className="font-bold text-brand-primary">{item.quantity}x</span> {item.product.name}
                        </p>
                        {item.customization && Object.keys(item.customization as object).length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-1 px-1">
                            {Object.entries(item.customization as Record<string, string>).map(([k, v]) => (
                              <span key={k} className="text-[10px] bg-brand-secondary/10 text-brand-secondary px-2 py-0.5 rounded-lg font-bold uppercase tracking-wider">
                                {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-border-subtle/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-bg-sidebar flex items-center justify-center text-[10px] font-bold border border-border-subtle">
                        {order.user.name?.slice(0, 2).toUpperCase() || 'GU'}
                      </div>
                      <span className="text-xs font-medium text-text-muted">{order.user.name}</span>
                    </div>

                    <div className="flex gap-2">
                      {order.status === 'PENDING' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'PREPARING')}
                          className="bg-brand-secondary text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-brand-primary transition-all"
                        >
                          Start Brewing
                        </button>
                      )}
                      {order.status === 'PREPARING' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'COMPLETED')}
                          className="bg-brand-accent text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-md hover:bg-brand-primary transition-all"
                        >
                          Mark Done
                        </button>
                      )}
                      <button 
                        onClick={() => updateStatus(order.id, 'CANCELLED')}
                        className="text-brand-danger font-bold text-xs uppercase hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {activeOrders.length === 0 && (
              <div className="bg-bg-sidebar/50 border-2 border-dashed border-border-subtle rounded-[32px] p-20 text-center text-text-muted italic">
                <Coffee size={48} className="mx-auto mb-4 opacity-10" />
                No orders in the oven. Relax!
              </div>
            )}
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white dark:bg-bg-sidebar border border-border-subtle rounded-[32px] p-6 shadow-sm">
            <h4 className="text-brand-primary font-serif font-bold text-lg mb-6">Recent Completion</h4>
            <div className="space-y-4">
              {completedOrders.slice(0, 8).map((order) => (
                <div key={order.id} className="flex justify-between items-center border-b border-border-subtle/30 pb-3 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-brand-primary">{order.user.name}</p>
                    <p className="text-[10px] text-text-muted">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className={`px-2 py-0.5 rounded-full font-bold text-[8px] uppercase
                    ${order.status === 'COMPLETED' ? 'bg-brand-accent/10 text-brand-accent' : 'bg-brand-danger/10 text-brand-danger'}
                  `}>
                    {order.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            className="fixed bottom-8 right-8 z-[100] w-96 bg-brand-primary text-white p-6 rounded-[32px] shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full flex items-center justify-end pr-4 pt-4">
              <Bell size={24} className="animate-bounce" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">New Incoming Order</span>
                <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-ping"></div>
              </div>
              
              <div className="space-y-1">
                <h4 className="text-xl font-serif font-bold leading-tight">
                  {notification.items.map(i => i.product.name).join(' + ')}
                </h4>
                <p className="text-sm opacity-80 italic">Customer: {notification.user.name}</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setNotification(null);
                    updateStatus(notification.id, 'PREPARING');
                  }}
                  className="flex-1 bg-white text-brand-primary py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-brand-secondary hover:text-white transition-all"
                >
                  Start Brewing
                </button>
                <button 
                  onClick={() => setNotification(null)}
                  className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffDashboard;
