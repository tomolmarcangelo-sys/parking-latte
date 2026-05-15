import { useEffect, useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { Coffee, ShoppingCart, X, Menu as MenuIcon, Bell, Loader2, Trash2, Edit2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import Footer from './Footer';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';
import Sidebar from './Sidebar';
import { Order, CartItem } from '../types';
import { CartItemSkeleton } from './SkeletonLoader';
import { ProductModal } from './ProductModal';

const Layout: React.FC = () => {
  const { user, token, isAdmin } = useAuth();
  const { cart, total, calculateItemPrice, clearCart, isLoading, removeFromCart, updateCartItem, updateQuantity } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

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

    setIsSubmitting(true);
    try {
      await apiClient.post('/orders', {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customization: item.customization,
          priceAtOrder: calculateItemPrice(item)
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
    } catch (err: any) {
      console.error('Checkout failed:', err);
      
      // Handle structured error responses from the refined server logic
      const errorMessage = err.response?.data?.error || err.message || 'Failed to place order';
      const errorDetails = err.response?.data?.details;
      
      if (err.response?.status === 400 || err.response?.status === 409) {
          toast.error(errorMessage, { duration: 6000, icon: '⚠️' });
      } else if (err.response?.status === 503) {
          toast.error('Database is warming up. Please wait 10 seconds and try again.', { duration: 7000 });
      } else {
          toast.error(errorDetails || errorMessage || 'Connection busy. Brewing failed.', { duration: 5000 });
      }
    } finally {
        setIsSubmitting(false);
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

              {isLoading ? (
                <div className="flex-1 space-y-4">
                  {[...Array(3)].map((_, i) => <CartItemSkeleton key={i} />)}
                </div>
              ) : cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-24 h-24 bg-bg-base rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <Coffee size={40} className="text-brand-secondary opacity-30" />
                  </div>
                  <p className="text-brand-primary font-serif italic text-xl mb-2">The aroma is missing...</p>
                  <p className="text-text-muted text-sm font-medium mb-8">Your bag is empty. Explore our artisan craft today.</p>
                  <button
                    onClick={() => {
                        setIsCartOpen(false);
                        navigate('/');
                    }}
                    className="bg-brand-primary text-white py-3 px-8 rounded-xl font-bold hover:bg-brand-secondary transition-all"
                  >
                    View Menu
                  </button>
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
                            src={item.product.imageUrl || 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=200&q=80'} 
                            alt={item.product.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="font-serif font-bold text-brand-primary text-lg truncate">{item.product.name}</p>
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
                        <div className="flex flex-col gap-1 items-center">
                           <button 
                             onClick={() => removeFromCart(item.id)} 
                             className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                             title="Remove item"
                           >
                              <Trash2 size={16} />
                           </button>
                           <button 
                             onClick={() => setEditingCartItem(item)}
                             className="p-2 text-slate-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                             title="Edit item"
                           >
                              <Edit2 size={16} />
                           </button>
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
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handleCheckout}
                  className="w-full bg-brand-primary text-white py-5 rounded-[20px] font-bold disabled:opacity-50 hover:bg-brand-secondary hover:-translate-y-1 transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <ShoppingCart size={20} />}
                  <span>{isSubmitting ? 'Brewing your order...' : 'Begin Pouring Order'}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingCartItem && (
          <ProductModal 
            product={editingCartItem.product}
            initialCustomization={editingCartItem.customization as Record<string, string | string[]>}
            isEditing={true}
            onClose={() => setEditingCartItem(null)}
            onAdd={async (customization) => {
              await updateCartItem(editingCartItem.id, customization);
              setEditingCartItem(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Layout;
