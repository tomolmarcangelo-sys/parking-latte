import React, { useEffect, useState } from 'react';
import { apiClient } from '../lib/api';
import { Order, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Check, X, User, Clock, Coffee, Bell, Volume2, VolumeX, History } from 'lucide-react';
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

    console.log('[Socket] Connecting to server...');
    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to server');
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
    });

    socket.on('new-order', (newOrder: Order) => {
      console.log('[Socket] Received new-order:', newOrder.id);
      setOrders(prev => [newOrder, ...prev]);
      setNotification(newOrder);
      playNotificationSound();
      
      // Auto-hide notification after 5 seconds
      setTimeout(() => {
        setNotification(prev => prev?.id === newOrder.id ? null : prev);
      }, 5000);
    });

    socket.on('order-updated', (updatedOrder: Order) => {
      console.log('[Socket] Received order-updated:', updatedOrder.id, updatedOrder.status);
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
    <div className="space-y-10 min-h-screen bg-transparent -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 py-10 transition-colors duration-300">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Order Queue</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Managing {activeOrders.length} active orders safely.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button 
            onClick={() => setSoundsEnabled(!soundsEnabled)}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border shadow-sm ${soundsEnabled ? 'bg-white dark:bg-slate-900/50 text-brand-secondary border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/50'}`}
            title={soundsEnabled ? "Mute Notifications" : "Unmute Notifications"}
          >
            {soundsEnabled ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>
          <div className="flex-1 md:flex-none bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-8 py-3 flex flex-col items-center shadow-sm">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest text-center mb-1">Active</span>
            <span className="text-2xl font-black text-slate-900 dark:text-brand-secondary">{activeOrders.length}</span>
          </div>
          <div className="flex-1 md:flex-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-2xl px-8 py-3 flex flex-col items-center shadow-md">
            <span className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Status</span>
            <span className="text-2xl font-black">OPEN</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <section className="lg:col-span-3 space-y-8">
          <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-4">
            <div className="w-3 h-3 rounded-full bg-brand-accent animate-pulse shadow-[0_0_12px_rgba(148,168,129,0.6)]"></div>
            Process List
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {activeOrders.map((order) => (
                <motion.div 
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-500"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 dark:bg-slate-800/20 rounded-bl-full flex items-center justify-end pr-6 pt-6 text-slate-200 dark:text-slate-700 group-hover:text-brand-secondary/40 transition-colors">
                    <Clock size={32} />
                  </div>
                  
                  <div className="relative z-10">
                    <div className="flex justify-between mb-6">
                      <div className="flex items-center gap-3">
                         <span className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-tighter">
                           #{(order.id as string).slice(0, 8).toUpperCase()}
                         </span>
                         <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-lg border ${
                           order.status === 'PREPARING' 
                             ? 'bg-brand-accent/10 text-brand-accent border-brand-accent/20' 
                             : 'bg-brand-secondary/10 text-brand-secondary border-brand-secondary/20'
                         }`}>
                           {order.status}
                         </span>
                      </div>
                    </div>

                    <div className="space-y-4 mb-8">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-black text-slate-900 dark:text-brand-secondary">
                              {item.quantity}x
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                              {item.product.name}
                            </h3>
                          </div>
                          {item.customization && Object.keys(item.customization as object).length > 0 && (
                            <div className="flex flex-wrap gap-2 ml-11">
                              {Object.entries(item.customization as Record<string, string | string[]>).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700/50">
                                  {Array.isArray(v) ? v.join(', ') : v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-black border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-brand-secondary font-sans leading-none">
                          {order.user.name?.slice(0, 2).toUpperCase() || 'GU'}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest leading-none mb-1">{order.user.name}</p>
                          <p className="text-[10px] text-slate-500 font-bold font-mono leading-none">{new Date(order.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {order.status === 'PENDING' && (
                          <button 
                            onClick={() => updateStatus(order.id, 'PREPARING')}
                            className="bg-brand-secondary text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-brand-primary transition-all active:scale-95"
                          >
                            Brew
                          </button>
                        )}
                        {order.status === 'PREPARING' && (
                          <button 
                            onClick={() => updateStatus(order.id, 'COMPLETED')}
                            className="bg-brand-accent text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-brand-primary transition-all active:scale-95"
                          >
                            Done
                          </button>
                        )}
                        <button 
                          onClick={() => updateStatus(order.id, 'CANCELLED')}
                          className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors rounded-xl border border-slate-200 dark:border-transparent hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20"
                          title="Cancel Order"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {activeOrders.length === 0 && (
              <div className="col-span-full py-24 bg-white/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] text-center text-slate-400">
                <Coffee size={64} className="mx-auto mb-6 opacity-10 animate-pulse text-brand-secondary" />
                <p className="font-serif text-2xl italic opacity-40">Orders have been silenced. For now.</p>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-8">
          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm">
            <h4 className="text-slate-900 dark:text-slate-100 font-serif font-bold text-2xl mb-8 flex items-center gap-3">
              <History size={24} className="text-brand-secondary" />
              History
            </h4>
            <div className="space-y-6">
              {completedOrders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex justify-between items-center group">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest group-hover:text-brand-secondary transition-colors">{order.user.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold font-mono">{new Date(order.createdAt).toLocaleTimeString()}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-[0.15em] border transition-all
                    ${order.status === 'COMPLETED' 
                      ? 'bg-brand-accent/5 text-brand-accent border-brand-accent/20 group-hover:bg-brand-accent/10' 
                      : 'bg-red-50 dark:bg-red-950/10 text-red-500 dark:text-red-400 border-red-200 dark:border-red-900/20 group-hover:bg-red-100 dark:hover:bg-red-950/20'}
                  `}>
                    {order.status}
                  </div>
                </div>
              ))}
              {completedOrders.length === 0 && (
                <p className="text-center text-xs text-slate-400 italic py-4">No recent history</p>
              )}
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
