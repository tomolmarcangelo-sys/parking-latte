import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet, Link, useLocation } from 'react-router-dom';
import { Coffee, ShoppingCart, User, LogOut, LayoutDashboard, ClipboardList, Sun, Moon, Menu as MenuIcon, X, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import Footer from './Footer';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/api';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cart, total, calculateItemPrice, clearCart } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="min-h-screen flex flex-col bg-bg-base transition-colors duration-300">
      {/* Sticky Top Navbar */}
      <nav 
        className={`sticky top-0 w-full z-[80] transition-all duration-500 px-6 md:px-12 py-4 flex justify-between items-center ${
          isScrolled 
            ? 'bg-bg-base/80 backdrop-blur-xl border-b border-border-subtle/50 py-3 shadow-xl shadow-brand-primary/5' 
            : 'bg-bg-base border-b border-border-subtle/30'
        }`}
      >
        <div className="flex items-center gap-12">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:rotate-12 transition-transform">
              <Coffee size={24} className="text-white" />
            </div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-brand-primary uppercase hidden sm:block">Parking Latte</h1>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-8">
            <NavLink to="/" label="Home" />
            <a href="/#menu" className="text-sm font-bold text-text-muted hover:text-brand-primary transition-all">Menu</a>
            <a href="/#about" className="text-sm font-bold text-text-muted hover:text-brand-primary transition-all">About</a>
            {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
              <NavLink to="/staff" label="Queue" />
            )}
            {user?.role === 'ADMIN' && (
              <NavLink to="/admin" label="Admin" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2.5 bg-bg-sidebar/50 rounded-xl text-brand-primary border border-border-subtle hover:bg-white transition-all shadow-sm"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Cart Toggle */}
          <button 
            onClick={() => setIsCartOpen(true)} 
            className="relative p-2.5 bg-bg-sidebar/50 rounded-xl text-brand-primary border border-border-subtle hover:bg-white transition-all shadow-sm group"
          >
            <ShoppingCart size={20} />
            <AnimatePresence>
              {cartCount > 0 && (
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute -top-2 -right-2 bg-brand-primary text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-lg"
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* User Profile / Login trigger */}
          <div className="hidden md:block h-8 w-[1px] bg-border-subtle"></div>

          {user ? (
            <div className="hidden md:flex items-center gap-4">
               <button 
                onClick={() => navigate('/profile')}
                className="flex items-center gap-3 px-4 py-2 hover:bg-bg-sidebar rounded-xl transition-all group"
               >
                 <div className="w-8 h-8 rounded-full bg-brand-secondary/20 flex items-center justify-center text-brand-primary overflow-hidden">
                    <User size={16} />
                 </div>
                 <span className="text-sm font-bold text-brand-primary truncate max-w-[120px]">{user.name || user.email}</span>
               </button>
               <button 
                onClick={() => { 
                  logout(); 
                  navigate('/login'); 
                  toast.success('Signed out successfully');
                }}
                className="p-2.5 text-text-muted hover:text-brand-danger hover:bg-red-50 rounded-xl transition-all"
                title="Logout"
               >
                 <LogOut size={20} />
               </button>
            </div>
          ) : (
            <button 
              onClick={() => navigate('/login')}
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/10"
            >
              Sign In
            </button>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2.5 bg-brand-primary text-white rounded-xl shadow-lg shadow-brand-primary/20"
          >
            {isMobileMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[70] bg-bg-base/95 backdrop-blur-xl pt-24 px-8"
          >
            <div className="space-y-6">
              <MobileNavLink to="/" label="Home" icon={<Coffee size={22} />} />
              <MobileNavLink to="/profile" label="My Profile" icon={<User size={22} />} />
              <MobileNavLink to="/orders" label="My Orders" icon={<ClipboardList size={22} />} />
              
              {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
                <MobileNavLink to="/staff" label="Staff Queue" icon={<LayoutDashboard size={22} />} />
              )}
              {user?.role === 'ADMIN' && (
                <MobileNavLink to="/admin" label="Admin Controls" icon={<Shield size={22} />} />
              )}
              
              <div className="pt-6 border-t border-border-subtle mt-12 flex flex-col gap-4">
                {user ? (
                   <button 
                    onClick={() => { 
                      logout(); 
                      navigate('/login'); 
                      toast.success('Signed out successfully');
                    }}
                    className="w-full flex items-center gap-4 p-5 bg-red-50 text-brand-danger rounded-[24px] font-bold"
                   >
                     <LogOut size={22} />
                     <span>Sign Out Account</span>
                   </button>
                ) : (
                   <button 
                    onClick={() => navigate('/login')}
                    className="w-full p-5 bg-brand-primary text-white rounded-[24px] font-bold shadow-xl"
                   >
                     Sign In to Parking Latte
                   </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen px-4 md:px-12 lg:px-20 transition-all duration-500">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
        <Footer />
      </main>

      {/* Shopping Cart Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-brand-primary/20 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-bg-sidebar z-[110] p-8 flex flex-col shadow-[0_0_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden border-l border-border-subtle"
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
                  className="p-3 hover:bg-bg-sidebar rounded-full transition-all text-text-muted"
                >
                  <X size={24} />
                </button>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-10">
                  <div className="w-24 h-24 bg-bg-sidebar rounded-full flex items-center justify-center mb-8 shadow-inner">
                    <Coffee size={40} className="text-brand-secondary opacity-30" />
                  </div>
                  <p className="text-brand-primary font-serif italic text-xl mb-2">The aroma is missing...</p>
                  <p className="text-text-muted text-sm font-medium">Your bag is empty. Explore our artisan craft today.</p>
                </div>
              ) : (
                <div className="flex-1 space-y-8 overflow-y-auto pr-2 custom-scrollbar">
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
                        <div className="w-24 h-24 rounded-[28px] bg-bg-sidebar overflow-hidden border border-border-subtle flex-shrink-0 relative shadow-inner">
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

          <div className="mt-8 pt-8 border-t-2 border-dashed border-border-subtle space-y-6">
            <div className="flex justify-between items-center">
               <p className="text-sm font-black uppercase tracking-[0.2em] text-text-muted">Investment</p>
               <p className="text-4xl font-serif font-bold text-brand-primary">₱{total.toFixed(2)}</p>
            </div>
            <button 
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="w-full bg-brand-primary text-white py-6 rounded-[24px] font-bold disabled:opacity-50 hover:bg-brand-secondary transition-all shadow-2xl shadow-brand-primary/20 flex items-center justify-center gap-3"
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

const NavLink = ({ to, label }: { to: string, label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`
        text-sm font-bold tracking-tight transition-all relative group
        ${isActive ? 'text-brand-primary' : 'text-text-muted hover:text-brand-primary'}
      `}
    >
      {label}
      <span className={`absolute -bottom-1 left-0 h-[2px] bg-brand-secondary transition-all ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`}></span>
    </Link>
  );
};

const MobileNavLink = ({ to, label, icon }: { to: string, label: string, icon: React.ReactNode }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-5 p-5 rounded-[24px] transition-all
        ${isActive ? 'bg-brand-primary text-white shadow-xl' : 'bg-bg-sidebar text-brand-primary'}
      `}
    >
      {icon}
      <span className="text-lg font-bold">{label}</span>
    </Link>
  );
};

export default Layout;
