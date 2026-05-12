import { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Coffee, ShoppingCart, X, Menu as MenuIcon, Bell, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import Footer from './Footer';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import Sidebar from './Sidebar';
import { io } from 'socket.io-client';
import { Order } from '../types';

const Layout: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const { cart, total, calculateItemPrice, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

  useEffect(() => {
    if (!token || !user) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      // Server automatically joins rooms based on token
    });

    socket.on('order-updated', (updatedOrder: Order) => {
      // Show toast if not on the orders page
      if (location.pathname !== '/orders') {
        const statusMessages = {
          'PREPARING': 'Your order is being brewed! ☕',
          'COMPLETED': 'Order ready! Pick it up at the counter. ✨',
          'CANCELLED': 'Order cancelled. Contact us for details. ❌',
          'PENDING': 'Your order is in the queue.'
        };

        const message = statusMessages[updatedOrder.status] || `Order status: ${updatedOrder.status}`;
        
        toast((t) => (
          <div 
            onClick={() => {
              navigate('/orders');
              toast.dismiss(t.id);
            }}
            className="flex items-center gap-4 cursor-pointer"
          >
            <div className="bg-brand-primary p-2 rounded-lg text-white">
              <Bell size={20} />
            </div>
            <div>
              <p className="font-bold text-sm text-brand-primary">Order Update</p>
              <p className="text-xs text-text-muted">{message}</p>
            </div>
          </div>
        ), {
          duration: 6000,
          position: 'top-right',
        });

        if (updatedOrder.status === 'COMPLETED') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, token, location.pathname, navigate]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsCartOpen(false);
  }, [location.pathname, location.hash]);

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/login');
      setIsCartOpen(false);
      return;
    }

    try {
      await apiClient.post('/orders', {
        items: cart.map(item => ({
          id: item.id,
          quantity: item.quantity,
          customization: item.customization,
          price: calculateItemPrice(item)
        })),
        totalAmount: total
      });
      
      clearCart();
      setIsCartOpen(false);
      toast.success('Order placed successfully! We\'re brewing it now.', {
        duration: 5000,
        icon: '☕',
      });
      navigate('/orders');
    } catch (err) {
      console.error('Checkout failed:', err);
      toast.error('Failed to place order. Please check your connection.');
    }
  };

  return (
    <div className="min-h-screen flex bg-bg-base transition-colors duration-300">
      <Sidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
        onOpenCart={() => setIsCartOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />

      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} relative`}>
        {/* Mobile Top Bar */}
        <div className={`md:hidden sticky top-0 z-[40] transition-all duration-300 flex justify-between items-center px-4 py-3 ${
          isScrolled 
            ? 'bg-bg-base/80 backdrop-blur-xl border-b border-border-subtle/50 shadow-sm' 
            : 'bg-bg-base border-b border-border-subtle/30'
        }`}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 -ml-2 text-brand-primary hover:bg-bg-sidebar rounded-xl transition-all"
            >
              <MenuIcon size={24} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center shadow-lg">
                <Coffee size={18} className="text-white" />
              </div>
              <h1 className="font-serif text-lg font-bold tracking-tight text-brand-primary uppercase">Parking</h1>
            </div>
          </div>
          
          <button 
            onClick={() => setIsCartOpen(true)} 
            className="relative p-2 text-brand-primary hover:bg-bg-sidebar rounded-xl transition-all"
          >
            <ShoppingCart size={22} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute p-0.5 top-0 right-0 bg-brand-secondary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md transform translate-x-1/4 -translate-y-1/4"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 px-4 md:px-8 lg:px-12 py-6 relative">
          <AnimatePresence mode="wait">
            <motion.div 
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-7xl mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
        
        <Footer />
      </div>

      {/* Shopping Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-bg-sidebar z-[110] p-8 flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] overflow-hidden border-l border-border-subtle"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg">
                    <ShoppingCart size={22} className="text-white" />
                  </div>
                  <h2 className="text-2xl font-serif font-bold text-brand-primary">Brewing Bag</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)} 
                  className="p-3 hover:bg-bg-base/80 rounded-full transition-all text-text-muted"
                >
                  <X size={24} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-24 h-24 bg-bg-base rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <Coffee size={40} className="text-brand-secondary opacity-30" />
                  </div>
                  <p className="text-brand-primary font-serif italic text-xl mb-2">The aroma is missing...</p>
                  <p className="text-text-muted text-sm font-medium">Your bag is empty. Explore our artisan craft today.</p>
                </div>
              ) : (
                <div className="flex-1 space-y-8 overflow-y-auto pr-2 no-scrollbar">
                  {cart.map((item, idx) => {
                    const itemPrice = calculateItemPrice(item);
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={`${item.id}-${idx}`} 
                        className="flex gap-5 items-center group"
                      >
                        <div className="w-24 h-24 rounded-[28px] bg-bg-base overflow-hidden border border-border-subtle flex-shrink-0 relative shadow-inner">
                          <img 
                            src={item.imageUrl || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=200&q=80'} 
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-serif font-bold text-brand-primary text-lg truncate">{item.name}</p>
                          <p className="text-xs text-text-muted font-bold uppercase tracking-widest">
                            {item.quantity} × ₱{itemPrice.toFixed(2)}
                          </p>
                          {item.customization && Object.keys(item.customization).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {Object.entries(item.customization).map(([k, v]) => (
                                <span key={k} className="text-[9px] bg-brand-secondary/10 px-2 py-0.5 rounded-full text-brand-secondary font-black uppercase tracking-tighter">
                                  {Array.isArray(v) ? v.join(', ') : v as string}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-brand-primary text-lg">₱{(item.quantity * itemPrice).toFixed(2)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              <div className="mt-8 pt-8 border-t border-border-subtle space-y-6">
                <div className="flex justify-between items-center">
                   <p className="text-sm font-black uppercase tracking-[0.2em] text-text-muted">Investment</p>
                   <p className="text-4xl font-serif font-bold text-brand-primary">₱{total.toFixed(2)}</p>
                </div>
                <button 
                  disabled={cart.length === 0}
                  onClick={handleCheckout}
                  className="w-full bg-brand-primary text-white py-5 rounded-[20px] font-bold disabled:opacity-50 hover:bg-brand-secondary hover:-translate-y-1 transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3"
                >
                  <ShoppingCart size={20} />
                  <span>Begin Pouring Order</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
