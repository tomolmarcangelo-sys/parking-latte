import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { Order, OrderStatus } from '../types';
import { apiClient } from '../lib/api';
import toast from 'react-hot-toast';

interface OrderContextType {
  orders: Order[];
  staffQueueCount: number;
  loading: boolean;
  refreshing: boolean;
  socketConnected: boolean;
  pagination: {
    total: number;
    pages: number;
    currentPage: number;
    limit: number;
  } | null;
  fetchOrders: (options?: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string; search?: string }) => Promise<void>;
  updateStatus: (orderId: string, status: OrderStatus, staffNotes?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [pagination, setPagination] = useState<OrderContextType['pagination']>(null);
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // Use a ref to track the current state of orders for the socket listeners
  // This allows us to compare old state without making the useEffect depend on 'orders'
  const ordersRef = React.useRef<Order[]>([]);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const fetchOrders = useCallback(async (options: { page?: number; limit?: number; status?: string; startDate?: string; endDate?: string; search?: string } = {}) => {
    if (!token) return;
    setRefreshing(true);
    try {
      const { page = 1, limit = 10, status, startDate, endDate, search } = options;
      
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (status && status !== 'ALL') params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (search) params.append('search', search);

      const isStaff = user?.role === 'ADMIN' || user?.role === 'STAFF';
      const baseUrl = isStaff ? '/orders' : '/orders/me';
      const endpoint = `${baseUrl}?${params.toString()}`;
      
      const data = await apiClient.get(endpoint);
      
      if (data && typeof data === 'object' && 'orders' in data && Array.isArray(data.orders)) {
        // If it's page 1, replace. If it's page > 1, append (for infinite scroll support if needed)
        // But for standard pagination, we might just replace. 
        // Let's replace for now, and handle infinite scroll logic in the component if needed.
        setOrders(data.orders);
        setPagination(data.pagination);
      } else if (Array.isArray(data)) {
        setOrders(data);
        setPagination(null);
      } else {
        setOrders([]);
        setPagination(null);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
      setPagination(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user?.role]); // Use user.role instead of user object for stability

  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setOrders([]);
      setLoading(false);
      setSocketConnected(false);
      return;
    }

    const newSocket = io(window.location.origin, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to server');
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected from server');
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
      setSocketConnected(false);
    });

    setSocket(newSocket);
    fetchOrders();

    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      newSocket.on('new-order', (order: Order) => {
        // Notification side-effect (outside of state updater)
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-[24px] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-brand-primary/20 p-4`}>
            <div className="flex-1 w-0 p-2">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 rounded-full bg-brand-primary flex items-center justify-center text-white text-xl">🛎️</div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">New Order Received!</p>
                  <p className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">Order #{order.id.slice(0, 8)} from {order.user.name}</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-200 dark:border-slate-800">
              <button
                onClick={() => toast.dismiss(t.id)}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-black text-brand-primary hover:text-brand-secondary focus:outline-none uppercase tracking-widest"
              >
                View
              </button>
            </div>
          </div>
        ), { duration: 5000 });

        setOrders(prev => {
          const exists = prev.some(o => o.id === order.id);
          if (exists) return prev;
          return [order, ...prev];
        });
      });

      newSocket.on('order-deleted', (orderId: string) => {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      });
    }

    newSocket.on('order-updated', (updatedOrder: Order) => {
      const oldOrder = ordersRef.current.find(o => o.id === updatedOrder.id);
      
      // Handle User-Specific Notifications (if the order belongs to the current user)
      if (updatedOrder.userId === user.id && oldOrder && oldOrder.status !== updatedOrder.status) {
         // Generic status messages for users not on the orders page
         if (window.location.pathname !== '/orders') {
            const statusMessages = {
              'PREPARING': 'Your order is being brewed! ☕',
              'READY': 'Order ready! Pick it up at the counter. ✨',
              'COMPLETED': 'Enjoy your drink! ✨',
              'CANCELLED': 'Order cancelled. Contact us for details. ❌',
              'PENDING': 'Your order is in the queue.'
            };
            const message = statusMessages[updatedOrder.status] || `Order status: ${updatedOrder.status}`;
            toast.success(message, { duration: 5000, position: 'top-right' });
         }

         if (updatedOrder.status === 'READY') {
            // Audio Feedback
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.play().catch(e => console.log('Audio play blocked'));

            const itemsSummary = updatedOrder.items?.map((i: any) => i.product?.name).join(', ') || 'your brew';
            
            toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-[#f0fdf4] shadow-2xl rounded-[32px] pointer-events-auto flex border-2 border-green-500 p-6`}>
                 <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">☕</div>
                       <h3 className="font-serif text-xl font-bold text-green-900">Your brew is ready!</h3>
                    </div>
                    <p className="text-sm font-bold text-green-800 opacity-80 pl-13">Head to the counter to pick up your {itemsSummary}.</p>
                 </div>
              </div>
            ), { duration: 8000 });
         } else if (updatedOrder.status === 'COMPLETED') {
            toast.success(
              "✨ Thank you for choosing Parking Latte! Enjoy your drink and have a wonderful day!",
              { duration: 6000, icon: '✨', style: { background: '#1a1f2e', color: '#fff', borderRadius: '24px', fontWeight: 'bold' } }
            );
         }
      }

      setOrders(prev => {
        const orderExists = prev.some(o => o.id === updatedOrder.id);
        if (orderExists) {
          // Replace existing order while maintaining order
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        }
        // Only add if it doesn't exist and user role is appropriate
        if (user.role === 'ADMIN' || user.role === 'STAFF') {
           return [updatedOrder, ...prev];
        }
        return prev;
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?.id, user?.role, fetchOrders]);

  const updateStatus = useCallback(async (id: string, status: OrderStatus, staffNotes?: string) => {
    try {
      const updatedOrder = await apiClient.patch(`/orders/${id}/status`, { status, staffNotes });
      setOrders(prev => {
        const exists = prev.some(o => o.id === updatedOrder.id);
        if (exists) {
          return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
        }
        return prev;
      });
    } catch (error) {
      toast.error('Failed to update status');
      throw error;
    }
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/orders/${id}`);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success('Order deleted');
    } catch (error) {
      toast.error('Failed to delete order');
      throw error;
    }
  }, []);

  const staffQueueCount = useMemo(() => 
    orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length,
    [orders]
  );

  const value = useMemo(() => ({ 
    orders, 
    staffQueueCount, 
    loading, 
    refreshing, 
    socketConnected,
    pagination,
    fetchOrders, 
    updateStatus, 
    deleteOrder 
  }), [orders, staffQueueCount, loading, refreshing, socketConnected, pagination, fetchOrders, updateStatus, deleteOrder]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
};
