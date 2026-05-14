import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Coffee, Home, Info, ShoppingCart, 
  User, ClipboardList, LayoutDashboard, Shield, LogOut, 
  Sun, Moon, X, LogIn, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCart: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  onOpenCart, 
  isCollapsed = false, 
  onToggleCollapse 
}) => {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { cart } = useCart();
  const { staffQueueCount } = useOrders();
  const location = useLocation();
  const navigate = useNavigate();

  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const NavItem = ({ to, icon, label, badge, isAction, onClick }: any) => {
    const isActive = location.pathname === to && !to.startsWith('/#') && !isAction;
    const content = (
      <>
        <div className={`flex items-center justify-center ${isCollapsed ? 'w-full' : ''}`}>
          {icon}
        </div>
        {!isCollapsed && <span className="font-bold truncate">{label}</span>}
        {badge !== undefined && badge > 0 && (
          <span className={`${isCollapsed ? 'absolute top-1 right-1 w-4 h-4 text-[8px]' : 'ml-auto w-5 h-5 text-[10px]'} bg-brand-primary text-white rounded-full flex items-center justify-center font-bold shadow-md`}>
            {badge}
          </span>
        )}
      </>
    );

    const baseClass = `flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all group overflow-hidden relative`;
    
    if (isAction) {
      return (
        <button onClick={onClick} className={`${baseClass} text-text-muted hover:bg-bg-sidebar hover:text-brand-primary hover:translate-x-1 w-full text-left`}>
          {content}
        </button>
      );
    }
    
    if (to.startsWith('/#')) {
      return (
        <button 
          onClick={() => {
            onClose();
            navigate('/');
            setTimeout(() => {
              const element = document.querySelector(to.substring(1));
              element?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
          }} 
          className={`${baseClass} text-text-muted hover:bg-bg-sidebar hover:text-brand-primary hover:translate-x-1 w-full text-left`}
        >
          {content}
        </button>
      );
    }

    return (
      <Link 
        to={to} 
        onClick={onClose}
        className={`${baseClass} ${
          isActive 
            ? 'bg-brand-primary/10 dark:bg-slate-800/50 text-brand-primary dark:text-brand-secondary border-l-4 border-brand-primary dark:border-brand-secondary shadow-sm' 
            : 'text-text-muted dark:text-slate-400 hover:bg-bg-sidebar dark:hover:bg-slate-800 hover:text-brand-primary dark:hover:text-slate-100 border-l-4 border-transparent hover:translate-x-1'
        }`}
      >
        {content}
      </Link>
    );
  };

  const navContent = (
    <div className={`flex flex-col h-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/50 shadow-sm transition-all duration-300 relative ${isCollapsed ? 'items-center' : ''}`}>
      {/* Collapse Toggle (Desktop Admin Only) */}
      {isAdmin && onToggleCollapse && (
        <button 
          onClick={onToggleCollapse}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-brand-primary text-white rounded-full items-center justify-center shadow-lg hover:bg-brand-secondary transition-all z-50 ring-4 ring-white dark:ring-slate-950"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}

      {/* Header */}
      <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} z-10 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 border-b border-transparent dark:border-slate-800/20 w-full`}>
        <Link to="/" onClick={onClose} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/20 dark:shadow-black/20 flex-shrink-0">
            <Coffee size={24} className="text-white dark:text-brand-secondary" />
          </div>
          {!isCollapsed && <h1 className="font-serif text-xl font-bold tracking-tight text-brand-primary dark:text-slate-100 uppercase truncate">Parking</h1>}
        </Link>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-brand-primary dark:hover:text-slate-100 rounded-xl transition-all duration-300"
              title="Toggle theme"
            >
              {theme === 'light' ? <Moon size={20} className="transition-all duration-300" /> : <Sun size={20} className="transition-all duration-300" />}
            </button>
            <button onClick={onClose} className="md:hidden p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-primary dark:hover:text-slate-100 rounded-xl">
              <X size={20} />
            </button>
          </div>
        )}
      </div>

      {/* Nav Links */}
      <div className="flex-1 overflow-y-auto flex flex-col no-scrollbar px-4 pb-6 pt-6 w-full">
        <div className="space-y-8 flex-1">
          
          <div>
            {!isCollapsed && <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 ml-1">Main Menu</h3>}
            <div className="space-y-1">
              <NavItem to="/" icon={<Home size={20} />} label="Home" />
              <NavItem to="/#menu" icon={<Coffee size={20} />} label="Menu" />
              <NavItem to="/#about" icon={<Info size={20} />} label="About" />
              <NavItem isAction onClick={() => { onOpenCart(); onClose(); }} icon={<ShoppingCart size={20} />} label="Cart" badge={cartCount} />
            </div>
          </div>

          {(user) ? (
            <div>
              {!isCollapsed && <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 ml-1">Account</h3>}
              <div className="space-y-1">
                <NavItem to="/profile" icon={<User size={20} />} label="My Profile" />
                <NavItem to="/orders" icon={<ClipboardList size={20} />} label="My Orders" />
              </div>
            </div>
          ) : (
            <div>
              {!isCollapsed && <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 ml-1">Account</h3>}
              <div className="space-y-1">
                <NavItem to="/login" icon={<LogIn size={20} />} label="Sign In" />
              </div>
            </div>
          )}

          {(user?.role === 'STAFF' || user?.role === 'ADMIN') && (
            <div>
              {!isCollapsed && <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-4 ml-1">Management</h3>}
              <div className="space-y-1">
                <NavItem to="/staff" icon={<LayoutDashboard size={20} />} label="Staff Queue" badge={staffQueueCount} />
                {isAdmin && (
                  <NavItem to="/admin" icon={<Shield size={20} />} label="Admin Controls" />
                )}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* User Footer */}
      {user && (
        <div className={`p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 mt-auto w-full transition-all ${isCollapsed ? 'p-2' : ''}`}>
          <div className={`flex items-center p-3 rounded-2xl hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group shadow-sm hover:shadow-md border border-transparent dark:hover:border-slate-700 ${isCollapsed ? 'p-2 justify-center' : 'gap-3'}`} onClick={() => navigate('/profile')}>
            <div className={`w-10 h-10 rounded-full bg-brand-secondary/10 dark:bg-slate-800 flex items-center justify-center text-brand-primary dark:text-brand-secondary flex-shrink-0 group-hover:scale-105 transition-transform border border-slate-100 dark:border-slate-700 shadow-inner`}>
              <User size={18} />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{user.name || 'Coffee Lover'}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-medium">{user.email}</p>
                </div>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation();
                    logout(); 
                    toast.success('Signed out successfully');
                    navigate('/login');
                  }}
                  className="p-2 text-slate-400 hover:text-brand-danger hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <div className={`hidden md:block fixed inset-y-0 left-0 z-[60] transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {navContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="md:hidden fixed inset-y-0 left-0 w-[280px] max-w-[85vw] z-[90]"
            >
              {navContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
