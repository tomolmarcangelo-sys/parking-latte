import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { InventoryItem, Category, User, Role, CustomizationGroup, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, BarChart3, TrendingUp, AlertTriangle, X, Coffee, Download, Users, Shield, Check, Settings2, Trash2, Edit3, Link as LinkIcon, Info, ImagePlus, Upload, History, ArrowRight, Search, KeyRound, RefreshCw, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Eye, EyeOff, Terminal, Save, User as UserIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { SearchableSelect } from '../components/SearchableSelect';
import { CreateUserModal } from '../components/CreateUserModal';
import { UserEditModal } from '../components/UserEditModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { toast } from 'react-hot-toast';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'variations' | 'categories' | 'inventory' | 'audit-logs'>('overview');
  
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPagination, setAuditPagination] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [customizations, setCustomizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<InventoryItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingCustomizationGroup, setEditingCustomizationGroup] = useState<CustomizationGroup | null>(null);
  
  // New user management states
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  const [categoryList, setCategoryList] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');
  const [inventorySearch, setInventorySearch] = useState('');

  const tabScrollRef = React.useRef<HTMLDivElement>(null);
  const [showTabLeftArrow, setShowTabLeftArrow] = useState(false);
  const [showTabRightArrow, setShowTabRightArrow] = useState(false);

  const checkTabScroll = () => {
    if (tabScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = tabScrollRef.current;
      setShowTabLeftArrow(scrollLeft > 5);
      setShowTabRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabScrollRef.current) {
      const scrollAmount = 200;
      tabScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const categoryScrollRef = React.useRef<HTMLDivElement>(null);
  const [showCategoryLeftArrow, setShowCategoryLeftArrow] = useState(false);
  const [showCategoryRightArrow, setShowCategoryRightArrow] = useState(false);

  const checkCategoryScroll = () => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setShowCategoryLeftArrow(scrollLeft > 5);
      setShowCategoryRightArrow(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = 200;
      categoryScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    checkTabScroll();
    checkCategoryScroll();
    const currentTabRef = tabScrollRef.current;
    const currentCatRef = categoryScrollRef.current;

    const handleScroll = () => {
      checkTabScroll();
      checkCategoryScroll();
    };

    if (currentTabRef) currentTabRef.addEventListener('scroll', checkTabScroll);
    if (currentCatRef) currentCatRef.addEventListener('scroll', checkCategoryScroll);
    window.addEventListener('resize', handleScroll);

    return () => {
      if (currentTabRef) currentTabRef.removeEventListener('scroll', checkTabScroll);
      if (currentCatRef) currentCatRef.removeEventListener('scroll', checkCategoryScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [categories, user, activeTab]);
  
  // Restrict access
  useEffect(() => {
    if (user?.role !== 'ADMIN' && (activeTab === 'users' || activeTab === 'variations' || activeTab === 'audit-logs')) {
      setActiveTab('overview');
    }
  }, [activeTab, user]);

  useEffect(() => {
    fetchData();
  }, []);

  const allProducts = useMemo(() => categories.flatMap(c => c.products), [categories]);
  
  const filteredProducts = useMemo(() => {
    return allProducts.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase()) || 
                            (product.description || '').toLowerCase().includes(productSearch.toLowerCase());
      const matchesCategory = productCategoryFilter === 'all' || product.categoryId === productCategoryFilter;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => {
      const catA = categoryList.find(c => c.id === a.categoryId)?.name || '';
      const catB = categoryList.find(c => c.id === b.categoryId)?.name || '';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.name.localeCompare(b.name);
    });
  }, [allProducts, productSearch, productCategoryFilter, categoryList]);

  const filteredInventory = useMemo(() => {
    if (!inventorySearch) return inventory;
    return inventory.filter(item => 
      item.name.toLowerCase().includes(inventorySearch.toLowerCase())
    );
  }, [inventory, inventorySearch]);

  const fetchData = () => {
    setLoading(true);
    const promises: Promise<any>[] = [
      apiClient.get('/admin/stats'),
      apiClient.get('/inventory'),
      apiClient.get('/menu?admin=true'),
      apiClient.get('/users'),
      apiClient.get('/menu/categories'),
    ];

    if (user?.role !== 'STAFF') {
      promises.push(apiClient.get('/admin/customizations'));
      promises.push(apiClient.get('/admin/audit-logs?page=1&limit=20'));
    }

    Promise.all(promises).then((results) => {
      const [statsData, invData, menuData, userData, categoryData, customData, auditResponse] = results;
      setStats(statsData);
      setInventory(invData);
      setCategories(menuData);
      setUsers(userData);
      setCategoryList(categoryData);
      if (user?.role !== 'STAFF') {
        setCustomizations(customData);
        setAuditLogs(auditResponse.logs);
        setAuditPagination(auditResponse.pagination);
      }
      setLoading(false);
    });
  };

  const loadMoreAuditLogs = async () => {
    if (!auditPagination || auditPagination.currentPage >= auditPagination.pages || auditLoading) return;
    
    setAuditLoading(true);
    try {
      const nextPage = auditPagination.currentPage + 1;
      const response = await apiClient.get(`/admin/audit-logs?page=${nextPage}&limit=20`);
      setAuditLogs(prev => [...prev, ...response.logs]);
      setAuditPagination(response.pagination);
    } catch (err) {
      console.error('Failed to load more audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await apiClient.delete(`/menu/categories/${id}`);
      fetchData();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete category';
      alert(message);
    }
  };

  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const handleUpdateRole = async (userId: string, role: Role) => {
    setUpdatingUserId(userId);
    const userToUpdate = users.find(u => u.id === userId);
    if (!userToUpdate) return;
    try {
      await apiClient.put(`/users/${userId}`, { 
        name: userToUpdate.name || '',
        email: userToUpdate.email,
        role,
        emailVerified: userToUpdate.emailVerified 
      });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      toast.success('User role updated');
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toast.error(err.message || 'Failed to update role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRestock = async (itemId: string, amount: number) => {
    try {
      await apiClient.post(`/inventory/${itemId}/restock`, { amount });
      fetchData();
      alert('Stock updated successfully.');
    } catch (err) {
      console.error('Restock failed:', err);
      alert('Failed to restock.');
    }
  };

  const handleDeleteInventory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;
    try {
      await apiClient.delete(`/inventory/${id}`);
      setInventory(prev => prev.filter(i => i.id !== id));
      toast.success('Resource deleted');
    } catch (err: any) {
      toast.error('Failed to delete resource');
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      await apiClient.delete(`/users/${userToDelete.id}`);
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      toast.success('User deleted successfully');
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleExportOrders = async () => {
    setIsExporting(true);
    try {
      const orders = await apiClient.get('/orders');
      
      const headers = ['Order ID', 'Customer', 'Email', 'Status', 'Total (₱)', 'Date', 'Items'];
      const rows = orders.map((order: any) => [
        order.id,
        order.user.name || 'N/A',
        order.user.email,
        order.status,
        Number(order.totalAmount).toFixed(2),
        new Date(order.createdAt).toLocaleString(),
        order.items.map((i: any) => {
          let itemStr = `${i.quantity}x ${i.product.name}`;
          if (i.customization && Object.keys(i.customization).length > 0) {
            const custStr = Object.entries(i.customization).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
            itemStr += ` (${custStr})`;
          }
          return itemStr;
        }).join('; ')
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `parking_latte_orders_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export orders.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div>Loading Intelligence...</div>;

  const lowStockItems = inventory.filter(i => i.stockLevel <= i.lowStockThreshold);

  return (
    <div className="space-y-8 min-h-screen">
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-brand-danger px-6 py-4 rounded-[24px] flex items-center justify-between gap-4 shadow-xl shadow-brand-danger/20 mb-8 border border-white/10"
        >
          <div className="flex items-center gap-4 text-white">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <AlertTriangle size={24} />
            </div>
            <div>
              <p className="text-sm font-black uppercase tracking-widest opacity-80">Critical System Alert</p>
              <h3 className="text-lg font-bold text-white">
                {lowStockItems.length} inventory item{lowStockItems.length > 1 ? 's' : ''} critically low
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('inventory')}
              className="bg-white text-brand-danger px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
            >
              Restock Now
            </button>
          </div>
        </motion.div>
      )}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 py-6 mb-12 shadow-sm transition-colors duration-300">
        {/* Row 1: Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Management</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">System intelligence & resource planning.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportOrders}
              disabled={isExporting}
              className="flex-1 md:flex-none border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/50 text-slate-700 dark:text-slate-100 px-6 py-3.5 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm group shadow-sm"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={20} className="group-hover:-translate-y-0.5 transition-transform text-brand-secondary" />}
              <span className="font-black uppercase tracking-widest text-[10px]">Export Data</span>
            </button>
            {activeTab === 'users' ? (
               <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex-1 md:flex-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-xl flex items-center justify-center gap-3 text-sm"
                >
                  <Plus size={22} />
                  <span className="font-black uppercase tracking-widest text-[10px]">New Personnel</span>
                </button>
            ) : (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-8 py-3.5 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-all shadow-xl flex items-center justify-center gap-3 text-sm"
              >
                <Plus size={22} />
                <span className="font-black uppercase tracking-widest text-[10px]">New Asset</span>
              </button>
            )}
          </div>
        </div>


        {/* Row 2: Scrollable Tab Navigation */}
        <div className="relative group/tabs">
          <AnimatePresence>
            {showTabLeftArrow && (
              <motion.button 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onClick={() => scrollTabs('left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-100 rounded-full flex items-center justify-center shadow-xl hover:bg-slate-800 transition-all"
              >
                <ChevronLeft size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          <div 
            ref={tabScrollRef}
            className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 pr-12 transition-all"
          >
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
              ...(user?.role === 'ADMIN' ? [{ id: 'users', label: 'Personnel', icon: <Users size={18} /> }] : []),
              { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
              { id: 'categories', label: 'Collections', icon: <Settings2 size={18} /> },
              { id: 'products', label: 'Catalog', icon: <Coffee size={18} /> },
              ...(user?.role !== 'STAFF' ? [
                { id: 'variations', label: 'Add-ons', icon: <Settings2 size={18} /> },
                { id: 'audit-logs', label: 'Security', icon: <History size={18} /> }
              ] : [])
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 flex-shrink-0 border transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-md' 
                    : 'text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900/50'
                }`}
              >
                <span className={activeTab === tab.id ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {showTabRightArrow && (
              <motion.button 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onClick={() => scrollTabs('right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-100 rounded-full flex items-center justify-center shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
              >
                <ChevronRight size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Fading Mask */}
          <div className="absolute right-0 top-0 bottom-2 w-16 bg-gradient-to-l from-white dark:from-slate-950 via-transparent to-transparent pointer-events-none" />
        </div>
      </header>


      {activeTab === 'overview' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard 
              icon={<TrendingUp className="text-brand-accent" />} 
              label="Total Revenue" 
              value={`₱${Number(stats?.totalRevenue || 0).toFixed(2)}`} 
            />
            <StatCard 
              icon={<Package className="text-brand-secondary" />} 
              label="Total Orders" 
              value={stats?.totalOrders || 0} 
            />
            <StatCard 
              icon={<Plus className="text-brand-primary" />} 
              label="Orders Today" 
              value={stats?.todayOrders || 0} 
            />
          </div>

          {lowStockItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="text-brand-danger" size={20} />
                <h2 className="text-xl font-serif font-bold text-brand-primary dark:text-red-400">Low Stock Alerts</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {lowStockItems.map(item => {
                  const isCritical = item.stockLevel === 0;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`border rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden group shadow-sm transition-all ${
                        isCritical 
                          ? 'bg-red-50 dark:bg-red-900/20 border-brand-danger dark:border-brand-danger/50 shadow-brand-danger/10' 
                          : 'bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-2 bg-brand-danger/10 group-hover:bg-brand-danger/20 transition-colors">
                        <AlertTriangle size={14} className={isCritical ? 'text-brand-danger animate-pulse' : 'text-brand-danger'} />
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-brand-danger' : 'text-brand-danger/60'}`}>
                        {isCritical ? 'Critical Alert' : 'Reorder Level'}
                      </p>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate transition-colors">{item.name}</h3>
                      <div className="flex items-baseline gap-1 transition-colors">
                        <span className={`text-2xl font-black ${isCritical ? 'text-brand-danger animate-pulse' : 'text-brand-danger'}`}>
                          {item.stockLevel}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold transition-colors">{item.unit} left</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const amount = prompt(`Enter amount to add for ${item.name}:`, '10');
                          if (amount && !isNaN(parseInt(amount))) {
                            handleRestock(item.id, parseInt(amount));
                          }
                        }}
                        className={`mt-2 text-[10px] text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full shadow-sm hover:scale-105 ${
                          isCritical ? 'bg-brand-primary dark:bg-brand-secondary hover:bg-brand-danger transition-all' : 'bg-slate-900 dark:bg-brand-primary'
                        }`}
                      >
                        Restock {item.name}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Sales Chart */}
            <section className="bg-white/70 dark:bg-slate-900/50 p-10 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 transition-all backdrop-blur-md">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 mb-10 flex items-center gap-3">
                <BarChart3 size={24} className="text-brand-secondary dark:text-brand-primary" />
                Product Demand
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.topProducts || []}>
                    <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: 'rgba(0,0,0,0.05)', opacity: 0.1 }}
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: '1px solid rgba(0,0,0,0.05)', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)', 
                        padding: '15px',
                        backgroundColor: 'white',
                        color: '#0f172a'
                      }}
                      itemStyle={{ color: '#0f172a' }}
                      labelStyle={{ color: '#64748b', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Bar dataKey="quantity" fill="#C8A97E" radius={[12, 12, 0, 0]} barSize={40}>
                      {stats?.topProducts?.map((_entry:any, index:number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4A3728' : '#C8A97E'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Inventory Table */}
            <section className="bg-white/70 dark:bg-slate-900/50 p-10 rounded-[32px] shadow-sm border border-slate-200 dark:border-slate-800 transition-all backdrop-blur-md">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
                  <Package size={24} className="text-brand-secondary dark:text-brand-primary" />
                  Stock Inventory
                </h2>
                <button 
                  onClick={() => setIsInventoryModalOpen(true)}
                  className="w-10 h-10 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl flex items-center justify-center hover:bg-slate-800 dark:hover:bg-white transition-all shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 no-scrollbar border-t border-slate-100 dark:border-slate-800 pt-5">
                {inventory.map((item) => {
                  const isLow = item.stockLevel <= item.lowStockThreshold;
                  const isCritical = item.stockLevel === 0;
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col gap-2 p-4 rounded-2xl transition-all border ${
                        isCritical
                          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50'
                          : isLow 
                            ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-900/30' 
                            : 'bg-slate-50/50 dark:bg-slate-800/30 border-transparent dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-brand-secondary'}`}></div>
                          <span className="font-bold text-slate-900 dark:text-slate-200">{item.name}</span>
                          {isLow && (
                            <span className={`text-[8px] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-tight shadow-sm ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
                              {isCritical ? 'Depleted' : 'Low Stock'}
                            </span>
                          )}
                        </div>
                        <span className={`font-bold ${isLow ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>
                          {item.stockLevel} {item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (item.stockLevel / (item.lowStockThreshold * 5)) * 100)}%` }}
                          className={`h-full ${isLow ? 'bg-brand-danger' : 'bg-brand-secondary active:glow'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-10 py-4 border-2 border-brand-primary dark:border-slate-700 text-brand-primary dark:text-slate-200 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-brand-primary dark:hover:bg-slate-800 hover:text-white transition-all">
                Replenish Stock
              </button>
            </section>
          </div>
        </>
      ) : activeTab === 'users' ? (
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Personnel</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Manage system access tiers and security clearances.</p>
            </div>
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm transition-colors">
               <div className="w-10 h-10 bg-brand-secondary/10 dark:bg-brand-secondary/5 rounded-xl flex items-center justify-center text-brand-secondary border border-brand-secondary/20 transition-colors">
                 <Shield size={20} />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">Active Directory</span>
                 <span className="text-lg font-black text-slate-900 dark:text-slate-200 transition-colors">{users.length} Users</span>
               </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {users.map((u) => (
                <motion.div 
                  key={u.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-500 flex flex-col justify-between"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800/20 rounded-bl-full flex items-center justify-end pr-5 pt-5 text-slate-200 dark:text-slate-700 group-hover:text-brand-secondary/40 transition-colors">
                    {u.role === 'ADMIN' ? <Shield size={28} /> : <UserIcon size={28} />}
                  </div>

                  <div className="relative z-10">
                    <div className="flex items-center gap-5 mb-8">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center text-slate-900 dark:text-slate-200 font-serif font-bold text-2xl border border-slate-200 dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform duration-500">
                          {u.name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        {u.role === 'ADMIN' && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-secondary rounded-full flex items-center justify-center text-white border-2 border-white dark:border-slate-900 shadow-md">
                            <Shield size={10} />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-brand-secondary transition-colors line-clamp-1">{u.name || 'Personnel'}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium font-mono opacity-80 line-clamp-1">{u.email}</p>
                      </div>
                    </div>

                    <div className="mb-8">
                       <RoleBadge role={u.role} loading={updatingUserId === u.id} />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800/50 transition-colors">
                    <div className="flex gap-1">
                      {['CUSTOMER', 'STAFF', 'ADMIN']
                        .filter(r => r !== u.role)
                        .map(r => (
                          <button
                            key={r}
                            onClick={() => handleUpdateRole(u.id, r as Role)}
                            disabled={updatingUserId === u.id}
                            className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 hover:text-brand-secondary dark:hover:text-brand-secondary hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                          >
                            Set {r}
                          </button>
                        ))
                      }
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setEditingUser(u)}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                        title="Edit Profile"
                      >
                        <Edit3 size={18} />
                      </button>
                      <button 
                        onClick={() => setUserToDelete(u)}
                        disabled={u.id === user?.id || updatingUserId === u.id}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm disabled:opacity-0 pointer-events-none md:pointer-events-auto"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </section>

      ) : activeTab === 'inventory' ? (
        <section className="space-y-12">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Resource Pipeline</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight transition-colors">Calibrate and maintain the essential compounds of production.</p>
            </div>
            <button 
              onClick={() => setIsInventoryModalOpen(true)}
              className="bg-slate-900 dark:bg-brand-primary text-white px-10 py-5 rounded-[24px] font-bold hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all shadow-md flex items-center justify-center gap-4 border border-transparent dark:border-brand-primary/20"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-widest text-xs">Register Resource</span>
            </button>
          </div>
 
          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-secondary/5 rounded-full blur-[100px] opacity-20 pointer-events-none" />
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-secondary transition-colors" size={24} />
              <input 
                type="text"
                placeholder="Scan inventory records..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-16 pr-6 py-5 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-brand-secondary focus:ring-4 ring-brand-secondary/5 rounded-2xl outline-none transition-all font-bold text-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
              />
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredInventory.map((item) => {
              const isLow = item.stockLevel <= item.lowStockThreshold;
              const isCritical = item.stockLevel === 0;
              return (
                <motion.div 
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[28px] border p-8 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-500 flex flex-col justify-between ${
                    isLow ? 'border-red-200 dark:border-red-900/40' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800/10 rounded-bl-[40px] flex items-center justify-end pr-5 pt-5 text-slate-200 dark:text-slate-800 group-hover:text-brand-secondary/20 transition-colors">
                     <Package size={28} />
                  </div>

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex items-center gap-5 mb-8">
                       <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-105 shadow-sm ${isLow ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-500 border border-red-100 dark:border-red-900/30' : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800'}`}>
                         <Package size={32} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <h3 className={`text-xl font-bold tracking-tight truncate transition-colors ${isLow ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100 group-hover:text-brand-secondary'}`}>{item.name}</h3>
                         <div className="flex items-center gap-2 mt-1">
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500">Asset Ref #{(item.id as string).slice(0, 4).toUpperCase()}</span>
                           {isLow && (
                             <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-red-500 dark:text-red-500 animate-pulse">
                               <AlertTriangle size={10} /> {isCritical ? 'Depleted' : 'Critical'}
                             </span>
                           )}
                         </div>
                       </div>
                    </div>
 
                    <div className="flex-1 mb-8">
                       <div className="flex items-baseline gap-2 mb-3">
                         <span className={`text-5xl font-serif font-black tracking-tighter ${isLow ? 'text-red-500 dark:text-red-500' : 'text-slate-900 dark:text-slate-100'}`}>
                            {item.stockLevel}
                         </span>
                         <span className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 font-sans">{item.unit}</span>
                       </div>
                       
                       <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((item.stockLevel / (item.lowStockThreshold * 3)) * 100, 100)}%` }}
                            className={`h-full rounded-full transition-all duration-1000 ${isLow ? 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-brand-primary'}`}
                          />
                       </div>
                       <div className="flex justify-between items-center mt-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 transition-colors">Threshold: {item.lowStockThreshold} {item.unit}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-700 italic font-mono transition-colors">Sync: {new Date(item.updatedAt).toLocaleTimeString()}</p>
                       </div>
                    </div>

                    {/* Usage Stats (New) */}
                    {((item.products && item.products.length > 0) || (item.customizations && item.customizations.length > 0)) && (
                      <div className="mb-6 p-4 bg-slate-50/50 dark:bg-slate-950/50 rounded-2xl border border-slate-100 dark:border-slate-800/50 transition-colors">
                         <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-1 rounded-full bg-brand-secondary"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">Asset Usage</span>
                         </div>
                         <div className="flex flex-wrap gap-1.5">
                            {item.products?.slice(0, 2).map((p: any) => (
                              <span key={p.id} className="text-[8px] bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 font-bold uppercase tracking-tight transition-colors">
                                {p.product?.name}
                              </span>
                            ))}
                            {item.customizations?.slice(0, 2).map((c: any) => (
                              <span key={c.id} className="text-[8px] bg-white dark:bg-slate-950 text-brand-secondary/70 dark:text-brand-secondary/70 px-2 py-1 rounded-lg border border-brand-secondary/20 dark:border-brand-secondary/10 font-bold uppercase tracking-tight transition-colors">
                                {c.choice?.name}
                              </span>
                            ))}
                         </div>
                      </div>
                    )}
 
                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => {
                          const amount = prompt(`Enter amount to add for ${item.name}:`, '10');
                          if (amount && !isNaN(parseInt(amount))) {
                            handleRestock(item.id, parseInt(amount));
                          }
                        }}
                        className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-3 border shadow-sm ${
                          isLow 
                            ? 'bg-brand-primary text-white border-brand-primary/20 hover:bg-brand-secondary shadow-brand-primary/20' 
                            : 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <RefreshCw size={14} className={isLow ? 'animate-spin' : ''} />
                        Replenish
                      </button>
                    </div>
                    <div className="mt-4 flex gap-2 pt-6 border-t border-slate-100 dark:border-slate-800/50 transition-colors">
                      <button 
                        onClick={() => setEditingInventory(item)}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-transparent text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all flex items-center justify-center gap-2"
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteInventory(item.id)}
                        className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 dark:bg-red-950/10 text-red-500/50 dark:text-red-500/50 border border-red-100 dark:border-red-900/10 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
 
            {filteredInventory.length === 0 && (
              <div className="col-span-full py-32 text-center bg-white/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] transition-colors">
                <Package size={64} className="mx-auto mb-6 opacity-10 text-slate-400 dark:text-slate-500 transition-colors" />
                <p className="font-serif text-2xl italic text-slate-500 dark:text-slate-500 opacity-40 transition-colors">No resource records matched the query.</p>
                {inventorySearch && (
                  <button 
                    onClick={() => setInventorySearch('')}
                    className="mt-6 text-xs font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary"
                  >
                    Clear Filter Pipeline
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      ) : activeTab === 'products' ? (
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Gallery</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight transition-colors">Curating your coffee masterpieces and catalog offerings.</p>
            </div>
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-3 flex items-center gap-4 shadow-sm transition-colors">
               <div className="w-10 h-10 bg-brand-primary/10 dark:bg-brand-primary/5 rounded-xl flex items-center justify-center text-brand-primary border border-brand-primary/20 transition-colors">
                 <Coffee size={20} />
               </div>
               <div className="flex flex-col">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">Live Catalog</span>
                 <span className="text-lg font-black text-slate-900 dark:text-slate-200 transition-colors">{filteredProducts.length} Items</span>
               </div>
            </div>
          </div>
 
          <div className="flex flex-col xl:flex-row gap-6 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-6 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex-1 relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-brand-secondary transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Search catalog..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 focus:border-brand-secondary focus:ring-4 ring-brand-secondary/5 rounded-2xl outline-none transition-all font-bold text-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-inner"
              />
            </div>
            
            <div className="relative xl:w-2/3 min-w-0">
               <div className="relative group/categories">
                <AnimatePresence>
                  {showCategoryLeftArrow && (
                    <motion.button 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onClick={() => scrollCategories('left')}
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center shadow-lg transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </motion.button>
                  )}
                </AnimatePresence>

                <div 
                  ref={categoryScrollRef}
                  className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pr-10"
                >
                  <button
                    onClick={() => setProductCategoryFilter('all')}
                    className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 border ${
                      productCategoryFilter === 'all'
                        ? 'bg-slate-900 dark:bg-brand-primary text-white border-slate-900 dark:border-brand-primary shadow-md'
                        : 'text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                    }`}
                  >
                    All Categories
                  </button>
                  {categoryList.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setProductCategoryFilter(cat.id)}
                      className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex-shrink-0 border ${
                        productCategoryFilter === cat.id
                          ? 'bg-slate-900 dark:bg-brand-primary text-white border-slate-900 dark:border-brand-primary shadow-md'
                          : 'text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <AnimatePresence>
                  {showCategoryRightArrow && (
                    <motion.button 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      onClick={() => scrollCategories('right')}
                      className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-full flex items-center justify-center shadow-lg transition-colors"
                    >
                      <ChevronRight size={16} />
                    </motion.button>
                  )}
                </AnimatePresence>
                
                <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-slate-900 via-white/20 dark:via-slate-900/20 to-transparent pointer-events-none rounded-r-[32px] transition-colors" />
              </div>
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  categoryList={categoryList} 
                  customizationGroups={customizations}
                  inventory={inventory}
                  onSuccess={fetchData} 
                />
              ))}
            </AnimatePresence>
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-32 bg-white/50 dark:bg-slate-900/30 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[40px] text-center transition-colors">
                <Search size={64} className="mx-auto mb-6 opacity-10 text-slate-400 dark:text-slate-500 transition-colors" />
                <p className="font-serif text-2xl italic text-slate-500 dark:text-slate-500 opacity-40 transition-colors">The catalog is silent. No matches found.</p>
                {(productSearch || productCategoryFilter !== 'all') && (
                  <button 
                    onClick={() => { setProductSearch(''); setProductCategoryFilter('all'); }}
                    className="mt-6 text-xs font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary"
                  >
                    Clear Filter Pipeline
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      ) : activeTab === 'categories' ? (
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Collections</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Architect your menu hierarchy and grouping logic.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="bg-slate-900 dark:bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-md hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all border border-transparent dark:border-brand-primary/20"
            >
              <Plus size={22} />
              <span className="font-black uppercase tracking-widest text-[10px]">New Collection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence mode="popLayout">
              {categoryList.map((cat) => (
                <CategoryCard 
                  key={cat.id} 
                  category={cat} 
                  onSuccess={fetchData} 
                  onDelete={handleDeleteCategory}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>

      ) : activeTab === 'variations' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">Customization Groups</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium transition-colors">Manage milk types, sweetness, and other drink variations.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCustomizationGroup(null);
                setIsCustomizationModalOpen(true);
              }}
              className="bg-slate-900 dark:bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-md hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all border border-transparent dark:border-brand-primary/20"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-widest text-[10px]">New Group</span>
            </button>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {customizations.map((group) => (
              <motion.div 
                key={group.id}
                layout
                className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 shadow-sm space-y-8 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{group.name}</h3>
                      {group.required && (
                        <span className="bg-brand-secondary/10 dark:bg-brand-secondary/5 text-brand-secondary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-secondary/20">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2 transition-colors">
                      <LinkIcon size={14} className="text-brand-primary dark:text-brand-secondary" />
                      Linked to {group.products.length} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                   <button 
                     onClick={() => {
                       setEditingCustomizationGroup(group);
                       setIsCustomizationModalOpen(true);
                     }}
                     className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all shadow-sm"
                   >
                       <Edit3 size={18} />
                     </button>
                     <button 
                      onClick={async () => {
                        if(confirm('Delete this group and all its choices?')) {
                          await apiClient.delete(`/admin/customizations/group/${group.id}`);
                          fetchData();
                        }
                      }}
                      className="p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/20 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm"
                    >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3 transition-colors">Choices</p>
                   <div className="grid grid-cols-1 gap-3">
                      {group.choices.map((choice: any) => (
                        <ChoiceRow key={choice.id} choice={choice} onSuccess={fetchData} />
                      ))}
                      <NewChoiceButton groupId={group.id} onSuccess={fetchData} />
                   </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400 transition-colors">Associated Products</p>
                   <div className="flex flex-wrap gap-2">
                      {group.products.map((p: any) => (
                        <span key={p.productId} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default shadow-sm transition-colors">
                           {p.product.name}
                        </span>
                      ))}
                      {group.products.length === 0 && <span className="text-xs italic text-slate-400 dark:text-slate-500 px-1 transition-colors">Universal across all items</span>}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : activeTab === 'audit-logs' ? (
        <section className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">System Records</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight transition-colors">Monitoring administrative activities and protocol executions.</p>
            </div>
            <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-3xl px-8 py-4 shadow-sm flex items-center gap-4 transition-colors">
               <div className="w-12 h-12 bg-brand-secondary/10 dark:bg-brand-secondary/5 rounded-2xl flex items-center justify-center text-brand-secondary border border-brand-secondary/20 transition-colors">
                 <Shield size={24} />
               </div>
               <div>
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-500 transition-colors">Audit Volume</p>
                 <p className="text-xl font-black text-slate-900 dark:text-slate-100 transition-colors">{auditLogs.length} Events</p>
               </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8 transition-colors">
            <div className="space-y-4 max-h-[700px] overflow-y-auto no-scrollbar pr-4">
              {auditLogs.map((log) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id} 
                  className="bg-slate-50/50 dark:bg-slate-950/50 border border-slate-200/50 dark:border-slate-800/30 rounded-[28px] p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group hover:border-brand-secondary/30 transition-all hover:bg-white dark:hover:bg-slate-900 duration-500"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-brand-secondary group-hover:scale-110 transition-transform shadow-sm">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-brand-secondary/10 text-brand-secondary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-brand-secondary/20">
                          {log.action}
                        </span>
                        <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">{log.entityName}</h4>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium max-w-xl line-clamp-2 italic transition-colors">
                        {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : 'System mutation recorded.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8 text-right w-full md:w-auto transition-colors">
                    <div className="flex-1 md:flex-none">
                       <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-secondary mb-1">
                          {log.adminName || 'System'}
                       </p>
                       <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-medium transition-colors">
                          {new Date(log.createdAt).toLocaleString()}
                       </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {auditLogs.length === 0 && (
                <div className="py-40 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800/50 transition-colors">
                   <Package size={48} className="mx-auto mb-6 opacity-5 text-slate-400 transition-colors" />
                   <p className="font-serif text-2xl italic text-slate-500 dark:text-slate-500 opacity-40 transition-colors">System archives are empty.</p>
                </div>
              )}

              {auditPagination && auditPagination.currentPage < auditPagination.pages && (
                <button
                  onClick={loadMoreAuditLogs}
                  disabled={auditLoading}
                  className="w-full py-6 bg-slate-50/50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 hover:text-brand-secondary dark:hover:text-brand-secondary border border-slate-200 dark:border-slate-800 rounded-[28px] font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:bg-white dark:hover:bg-slate-900 flex items-center justify-center gap-4"
                >
                  {auditLoading ? <RefreshCw className="animate-spin" size={16} /> : <History size={16} />}
                  {auditLoading ? 'Querying Master Records...' : 'Retrieve Legacy Logs'}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-bg-sidebar/30 rounded-[40px] border border-dashed border-border-subtle overflow-hidden">
          <Coffee size={48} className="text-brand-primary/20 mb-4 animate-bounce" />
          <p className="font-serif text-xl text-brand-primary opacity-40">Ready to brew some data.</p>
        </div>
      )}

      {/* Create Product Modal */}
      <AnimatePresence>
        {isUserModalOpen && (
          <CreateUserModal
            onClose={() => setIsUserModalOpen(false)}
            onSuccess={fetchData}
          />
        )}
        
        {editingUser && (
          <UserEditModal 
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSuccess={fetchData}
          />
        )}

        {userToDelete && (
          <DeleteConfirmationModal
            title="Remove Personnel?"
            message={`Are you sure you want to delete ${userToDelete.name || userToDelete.email}? This action will permanently revoke their access.`}
            onConfirm={handleConfirmDeleteUser}
            onCancel={() => setUserToDelete(null)}
            isLoading={isDeletingUser}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateProductModal 
            onClose={() => setIsCreateModalOpen(false)} 
            categories={categories}
            inventory={inventory}
            customizationGroups={customizations}
            onSuccess={() => {
              setIsCreateModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isInventoryModalOpen || editingInventory) && (
          <CreateInventoryModal 
            inventoryItem={editingInventory || undefined}
            onClose={() => {
              setIsInventoryModalOpen(false);
              setEditingInventory(null);
            }} 
            onSuccess={() => {
              setIsInventoryModalOpen(false);
              setEditingInventory(null);
              fetchData();
            }}
            products={allProducts}
            customizations={customizations}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCategoryModalOpen && (
          <CreateCategoryModal 
            category={editingCategory}
            onClose={() => setIsCategoryModalOpen(false)} 
            onSuccess={() => {
              setIsCategoryModalOpen(false);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isCustomizationModalOpen && (
          <CreateCustomizationModal 
            products={allProducts}
            group={editingCustomizationGroup || undefined}
            onClose={() => setIsCustomizationModalOpen(false)} 
            onSuccess={() => {
              setIsCustomizationModalOpen(false);
              setEditingCustomizationGroup(null);
              fetchData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ChoiceRow: React.FC<{ choice: any; onSuccess: () => void }> = ({ choice, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: choice.name, priceModifier: choice.priceModifier });
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await apiClient.put(`/admin/customizations/choice/${choice.id}`, editData);
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${choice.name}?`)) return;
    setLoading(true);
    try {
      await apiClient.delete(`/admin/customizations/choice/${choice.id}`);
      onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-brand-primary dark:border-brand-secondary rounded-2xl shadow-lg ring-4 ring-brand-primary/5 transition-all">
        <input 
          value={editData.name}
          onChange={e => setEditData({...editData, name: e.target.value})}
          className="flex-1 bg-transparent text-sm font-bold font-sans outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600"
          placeholder="Choice Name"
        />
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
          <span className="text-[10px] font-black text-slate-400">₱</span>
          <input 
            type="number"
            value={editData.priceModifier}
            onChange={e => setEditData({...editData, priceModifier: Number(e.target.value)})}
            className="w-14 bg-transparent text-[12px] font-bold text-slate-900 dark:text-brand-secondary outline-none text-center"
          />
        </div>
        <button onClick={handleUpdate} disabled={loading} className="p-2.5 bg-slate-900 dark:bg-brand-primary text-white rounded-xl hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all shadow-md">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800/50 group hover:border-slate-300 dark:hover:border-brand-secondary/30 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-secondary shadow-sm transition-colors" />
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3 transition-colors">
          {choice.name}
          {choice.priceModifier !== 0 && (
            <span className="text-[10px] text-slate-500 dark:text-brand-secondary font-black bg-slate-100 dark:bg-brand-secondary/5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-brand-secondary/10 transition-colors">
              {choice.priceModifier > 0 ? '+' : ''}₱{Number(choice.priceModifier).toFixed(2)}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
        <button 
          onClick={() => setIsEditing(true)}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl transition-all shadow-sm"
        >
          <Edit3 size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all shadow-sm"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

const NewChoiceButton: React.FC<{ groupId: string; onSuccess: () => void }> = ({ groupId, onSuccess }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [priceModifier, setPriceModifier] = useState(0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    try {
      await apiClient.post('/admin/customizations/choice', { groupId, name, priceModifier });
      setName('');
      setPriceModifier(0);
      setIsAdding(false);
      onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdding) {
    return (
      <button 
        onClick={() => setIsAdding(true)}
        className="w-full py-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 hover:border-slate-900 dark:hover:border-brand-secondary hover:text-slate-900 dark:hover:text-brand-secondary hover:bg-white dark:hover:bg-slate-900/50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
      >
        <Plus size={16} className="text-brand-primary dark:text-brand-secondary" />
        Include Choice
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] space-y-4 shadow-inner transition-colors">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Choice Name</label>
        <input 
          autoFocus
          placeholder="e.g. Soy Milk"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-slate-900/10 dark:ring-brand-primary/20 focus:border-slate-900 dark:focus:border-brand-primary text-slate-900 dark:text-slate-100 font-bold transition-all"
        />
      </div>
      <div className="space-y-1">
         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price Modifier (₱)</label>
         <input 
           type="number"
           placeholder="0.00"
           value={priceModifier}
           onChange={e => setPriceModifier(Number(e.target.value))}
           className="w-full p-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-slate-900/10 dark:ring-brand-primary/20 focus:border-slate-900 dark:focus:border-brand-primary text-slate-900 dark:text-brand-secondary font-black transition-all"
         />
      </div>
      <div className="flex gap-3 pt-2">
         <button type="submit" className="flex-1 py-3 bg-slate-900 dark:bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all">Establish</button>
         <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">Abort</button>
      </div>
    </form>
  );
};

const CreateCustomizationModal: React.FC<{ 
  products: Product[];
  group?: CustomizationGroup;
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ products, group, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: group?.name || '',
    required: group?.required || false,
    productIds: group?.products.map((p: any) => p.productId) || [] as string[],
    choices: group?.choices.map((c: any) => ({ id: c.id, name: c.name, priceModifier: c.priceModifier })) || [] as { id?: string, name: string; priceModifier: number }[]
  });
  const [newChoice, setNewChoice] = useState({ name: '', priceModifier: 0 });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (group) {
        await apiClient.put(`/admin/customizations/group/${group.id}`, {
          name: formData.name,
          required: formData.required,
          productIds: formData.productIds,
          choices: formData.choices
        });
      } else {
        await apiClient.post('/admin/customizations/group', {
          name: formData.name,
          required: formData.required,
          productIds: formData.productIds,
          choices: formData.choices
        });
      }
      toast.success(group ? 'Variation group updated' : 'Variation group created');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  const updateChoice = (idx: number, updates: Partial<{ name: string; priceModifier: number }>) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices.map((c, i) => i === idx ? { ...c, ...updates } : c)
    }));
  };

  const addChoice = () => {
    if (!newChoice.name) return;
    setFormData(prev => ({
      ...prev,
      choices: [...prev.choices, newChoice]
    }));
    setNewChoice({ name: '', priceModifier: 0 });
  };

  const removeChoice = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      choices: prev.choices.filter((_, i) => i !== idx)
    }));
  };

  const toggleProduct = (pid: string) => {
    setFormData(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid) 
        ? prev.productIds.filter(id => id !== pid)
        : [...prev.productIds, pid]
    }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/10 dark:bg-slate-950/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]"
      >
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">{group ? 'Refine Group' : 'New Variation Group'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Define options and link them to products.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Group Title</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                    placeholder="e.g. Milk Options"
                  />
               </div>
               <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, required: !formData.required})}
                    className={`w-12 h-6 rounded-full relative transition-all ${formData.required ? 'bg-brand-primary' : 'bg-slate-200 dark:bg-slate-800'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.required ? 'left-7' : 'left-1'}`}></div>
                  </button>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Mandatory Choice</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">User must select at least one option.</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                 <LinkIcon size={12} />
                 Choices
               </label>
               <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                   <div className="space-y-3">
                     {formData.choices.map((choice, idx) => (
                       <div key={idx} className="flex gap-2 group/choice">
                         <input
                           placeholder="Choice"
                           value={choice.name}
                           onChange={e => updateChoice(idx, { name: e.target.value })}
                           className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 ring-brand-primary/20 outline-none transition-all shadow-sm"
                         />
                         <div className="relative w-24">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₱</span>
                           <input
                             type="number"
                             step="0.01"
                             value={choice.priceModifier}
                             onChange={e => updateChoice(idx, { priceModifier: Number(e.target.value) })}
                             className="w-full pl-6 pr-3 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-brand-primary dark:text-brand-secondary focus:ring-2 ring-brand-primary/20 outline-none transition-all shadow-sm"
                           />
                         </div>
                         <button 
                           type="button" 
                           onClick={() => removeChoice(idx)} 
                           className="p-3 text-slate-400 hover:text-brand-danger hover:bg-red-50 dark:hover:bg-brand-danger/10 rounded-xl transition-all border border-transparent hover:border-brand-danger/20"
                         >
                           <Trash2 size={16} />
                         </button>
                       </div>
                     ))}
                   </div>

                   <div className="pt-4 border-t border-dashed border-slate-200 dark:border-slate-800">
                     <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 ml-1">New Choice Addition</p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 bg-white dark:bg-slate-900 rounded-[24px] border border-slate-200 dark:border-slate-800 shadow-sm">
                       <input
                         placeholder="e.g. Soy Milk"
                         value={newChoice.name}
                         onChange={e => setNewChoice({...newChoice, name: e.target.value})}
                         className="flex-1 p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-brand-primary/20 transition-all font-sans"
                       />
                       <div className="flex gap-2">
                         <div className="relative flex-1">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 font-sans">₱</span>
                           <input
                             placeholder="0.00"
                             type="number"
                             step="0.01"
                             value={newChoice.priceModifier}
                             onChange={e => setNewChoice({...newChoice, priceModifier: Number(e.target.value)})}
                             className="w-full pl-6 pr-3 py-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-brand-primary dark:text-brand-secondary outline-none focus:ring-2 ring-brand-primary/20 transition-all font-sans"
                           />
                         </div>
                         <button 
                           type="button" 
                           onClick={addChoice} 
                           className="bg-brand-primary text-white rounded-xl px-5 hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
                         >
                           <Plus size={20}/>
                         </button>
                       </div>
                     </div>
                   </div>
                </div>
             </div>

            <div className="space-y-4">
               <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2 ml-1 flex items-center gap-2">
                 <LinkIcon size={12} />
                 Impacted Products
               </label>
               <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 h-56 overflow-y-auto space-y-2 custom-scrollbar">
                  {products.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => toggleProduct(p.id)}
                      className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${formData.productIds.includes(p.id) ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/10' : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-800 hover:border-brand-primary'}`}
                    >
                       <div className="flex items-center gap-3">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${formData.productIds.includes(p.id) ? 'bg-white text-brand-primary border-white' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'}`}>
                            {formData.productIds.includes(p.id) && <Check size={10} />}
                         </div>
                         <span className="text-xs font-bold leading-none">{p.name}</span>
                       </div>
                       <span className={`text-[10px] font-black ${formData.productIds.includes(p.id) ? 'text-white/60' : 'text-slate-400'}`}>₱{Number(p.price).toFixed(2)}</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="bg-brand-primary/5 dark:bg-brand-secondary/5 p-6 rounded-[32px] border border-brand-primary/10 dark:border-brand-secondary/10 flex items-start gap-4">
             <div className="p-2 bg-brand-primary dark:bg-brand-secondary text-white rounded-xl shadow-lg">
                <Info size={20} />
             </div>
             <p className="text-xs text-brand-primary dark:text-brand-secondary font-bold leading-relaxed">
               Manage variation options and their price modifiers here. Updates are saved collectively for the group. Linked products will immediately reflect these customization choices.
             </p>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all font-sans"
            >
              Back to Menu
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Settings2 size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{submitting ? 'Architecting...' : 'Establish Group'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const CreateInventoryModal: React.FC<{ 
  onClose: () => void; 
  onSuccess: () => void;
  inventoryItem?: InventoryItem & { products?: any[], customizations?: any[] };
  products: Product[];
  customizations: CustomizationGroup[];
}> = ({ onClose, onSuccess, inventoryItem, products, customizations }) => {
  const [formData, setFormData] = useState({
    name: inventoryItem?.name || '',
    unit: inventoryItem?.unit || 'pcs',
    stockLevel: inventoryItem?.stockLevel || 0,
    lowStockThreshold: inventoryItem?.lowStockThreshold || 5,
    productLinks: inventoryItem?.products?.map(p => ({ productId: p.productId, quantityNeeded: p.quantityNeeded })) || [] as { productId: string; quantityNeeded: number }[],
    customizationLinks: inventoryItem?.customizations?.map(c => ({ choiceId: c.choiceId, quantityNeeded: c.quantityNeeded })) || [] as { choiceId: string; quantityNeeded: number }[]
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/inventory', {
        ...formData,
        id: inventoryItem?.id,
        stockLevel: Number(formData.stockLevel),
        lowStockThreshold: Number(formData.lowStockThreshold)
      });
      onSuccess();
    } catch (err: any) {
      console.error('Failed to save inventory item:', err);
      alert(err.message || 'Failed to save inventory item.');
    } finally {
      setSubmitting(false);
    }
  };

  const addProductLink = () => {
    if (products.length === 0) return;
    setFormData(prev => ({
      ...prev,
      productLinks: [...prev.productLinks, { productId: products[0].id, quantityNeeded: 1 }]
    }));
  };

  const addCustomizationLink = () => {
    const allChoices = customizations.flatMap(g => g.choices.map(c => ({ ...c, groupName: g.name })));
    if (allChoices.length === 0) return;
    setFormData(prev => ({
      ...prev,
      customizationLinks: [...prev.customizationLinks, { choiceId: allChoices[0].id, quantityNeeded: 1 }]
    }));
  };

  const updateProductLink = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      productLinks: prev.productLinks.map((link, i) => i === idx ? { ...link, [field]: value } : link)
    }));
  };

  const updateCustomizationLink = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      customizationLinks: prev.customizationLinks.map((link, i) => i === idx ? { ...link, [field]: value } : link)
    }));
  };

  const removeProductLink = (idx: number) => {
    setFormData(prev => ({ ...prev, productLinks: prev.productLinks.filter((_, i) => i !== idx) }));
  };

  const removeCustomizationLink = (idx: number) => {
    setFormData(prev => ({ ...prev, customizationLinks: prev.customizationLinks.filter((_, i) => i !== idx) }));
  };

  const allChoices = customizations.flatMap(g => g.choices.map(c => ({ value: c.id, label: `${g.name}: ${c.name}` })));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 rounded-[40px] w-full max-w-3xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border border-slate-800 flex flex-col max-h-[90vh]"
      >
        <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary border border-brand-primary/20">
               <Package size={28} />
             </div>
             <div>
               <h2 className="text-3xl font-serif font-bold text-slate-100 tracking-tight">{inventoryItem ? 'Tune Resource' : 'New Compound'}</h2>
               <p className="text-slate-400 font-medium font-mono text-[10px] uppercase tracking-widest mt-1">Supply Chain Configuration</p>
             </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-slate-800 rounded-full transition-all text-slate-500 hover:text-slate-200">
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar bg-slate-900/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Resource Name</label>
                <input 
                  required
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-brand-secondary outline-none transition-all font-bold text-slate-100 placeholder:text-slate-700"
                  placeholder="e.g. Milk Concentrate"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Metrics (Unit)</label>
                <select 
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-brand-secondary outline-none transition-all font-bold text-slate-100 appearance-none cursor-pointer"
                >
                  <option value="kg">kg (kilograms)</option>
                  <option value="L">L (liters)</option>
                  <option value="pcs">pcs (pieces)</option>
                  <option value="g">g (grams)</option>
                  <option value="ml">ml (milliliters)</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Total Payload (Stock)</label>
                <input 
                  required
                  type="number"
                  value={formData.stockLevel}
                  onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})}
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-brand-secondary outline-none transition-all font-serif font-black text-brand-secondary text-2xl"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Danger Threshold</label>
                <input 
                  required
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
                  className="w-full px-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:border-brand-secondary outline-none transition-all font-bold text-red-500"
                />
              </div>
            </div>
          </div>

          {/* Linking Section */}
          <div className="space-y-10 pt-6 border-t border-slate-800">
             {/* Product Links */}
             <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Asset Deduction Links</label>
                    <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tight">Deduct from this item when these products are ordered.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addProductLink}
                    className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-brand-secondary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                       <Plus size={14} />
                    </div>
                    Add Link
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.productLinks.map((link, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex-1 w-full">
                        <SearchableSelect
                          options={products.map(p => ({ value: p.id, label: p.name }))}
                          value={link.productId}
                          onChange={(val) => updateProductLink(idx, 'productId', val)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <input 
                          type="number"
                          step="0.01"
                          value={link.quantityNeeded}
                          onChange={e => updateProductLink(idx, 'quantityNeeded', parseFloat(e.target.value))}
                          className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center font-bold text-slate-100"
                          placeholder="Qty"
                        />
                        <span className="text-[10px] font-black text-slate-500 uppercase w-10">{formData.unit}</span>
                        <button type="button" onClick={() => removeProductLink(idx)} className="text-slate-500 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>

             {/* Customization Links */}
             <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Variation Deduction Links</label>
                    <p className="text-[9px] text-slate-600 mt-1 uppercase font-bold tracking-tight">Deduct from this item when these specific variations are selected.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addCustomizationLink}
                    className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-brand-secondary/10 flex items-center justify-center group-hover:bg-brand-primary/20 transition-colors">
                       <Plus size={14} />
                    </div>
                    Add Link
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.customizationLinks.map((link, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
                      <div className="flex-1 w-full">
                        <SearchableSelect
                          options={allChoices}
                          value={link.choiceId}
                          onChange={(val) => updateCustomizationLink(idx, 'choiceId', val)}
                          className="w-full"
                        />
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <input 
                          type="number"
                          step="0.01"
                          value={link.quantityNeeded}
                          onChange={e => updateCustomizationLink(idx, 'quantityNeeded', parseFloat(e.target.value))}
                          className="w-24 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center font-bold text-slate-100"
                          placeholder="Qty"
                        />
                        <span className="text-[10px] font-black text-slate-500 uppercase w-10">{formData.unit}</span>
                        <button type="button" onClick={() => removeCustomizationLink(idx)} className="text-slate-500 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </form>

        <div className="p-10 bg-slate-950/50 border-t border-slate-800">
           <div className="flex gap-6">
              <button 
                type="button" 
                onClick={onClose}
                className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-100 transition-colors"
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-brand-primary text-white py-5 rounded-[20px] font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-4 disabled:opacity-50"
              >
                {submitting ? <RefreshCw size={24} className="animate-spin" /> : <Save size={24} />}
                <span className="font-black uppercase tracking-widest text-xs">{submitting ? 'Optimizing...' : 'Sync Pipeline'}</span>
              </button>
           </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CreateProductModal: React.FC<{ 
  onClose: () => void; 
  categories: Category[]; 
  inventory: InventoryItem[];
  customizationGroups: any[];
  onSuccess: () => void;
}> = ({ onClose, categories, inventory, customizationGroups, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    categoryId: categories[0]?.id || '',
    ingredients: [] as { inventoryItemId: string; quantityNeeded: number }[],
    customizationGroupIds: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const toggleCustomizationGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      customizationGroupIds: prev.customizationGroupIds.includes(groupId)
        ? prev.customizationGroupIds.filter(id => id !== groupId)
        : [...prev.customizationGroupIds, groupId]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      // Use raw fetch for FormData because apiClient might be configured for JSON
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
    } catch (err) {
      console.error('Image upload failed:', err);
      alert('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const addIngredient = () => {
    if (inventory.length === 0) return;
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventoryItemId: inventory[0].id, quantityNeeded: 1 }]
    }));
  };

  const removeIngredient = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageUrl) {
      alert('Please upload an image or provide a URL.');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.post('/menu', {
        ...formData,
        price: Number(formData.price)
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to create product:', err);
      alert('Failed to create product. Check if fields are valid.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/10 dark:bg-slate-950/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]"
      >
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">New Masterpiece</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Introduce a new item to the Parking Latte menu.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar transition-colors">
          {/* Image Upload Area */}
          <div className="relative group">
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
              accept="image/*"
            />
            {formData.imageUrl ? (
              <div className="relative w-full h-48 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 group">
                <img 
                  src={formData.imageUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                   <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/30 transition-all"
                   >
                     <ImagePlus size={16} />
                     Change Image
                   </button>
                </div>
              </div>
            ) : (
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-48 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-slate-50 dark:hover:bg-slate-950/50 hover:border-brand-primary group ${uploading ? 'animate-pulse' : ''}`}
              >
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-brand-primary transition-all">
                  {uploading ? <RefreshCw size={32} className="animate-spin" /> : <Upload size={32} />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-brand-primary">Upload Product Image</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">PNG, JPG or WebP (Max 5MB)</p>
                </div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Product Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
                  placeholder="e.g. Lavender Honey Latte"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Price (₱)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-brand-primary dark:text-brand-secondary"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Category</label>
                <select 
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100 appearance-none"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Or Image URL</label>
                <input 
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-medium text-slate-500 dark:text-slate-400 italic"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-medium text-slate-700 dark:text-slate-300 resize-none"
              rows={3}
              placeholder="Tell a story about this drink..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Ingredient Blueprint</label>
              <button 
                type="button" 
                onClick={addIngredient}
                className="text-[10px] font-black uppercase tracking-widest text-brand-secondary hover:text-brand-primary flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add Ingredient
              </button>
            </div>
            <div className="space-y-3">
              {formData.ingredients.map((ing, idx) => (
                <div key={`new-ing-${ing.inventoryItemId}-${idx}`} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 dark:bg-slate-950/50 p-3 overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800/40">
                  <SearchableSelect
                    options={inventory.map(item => ({ value: item.id, label: `${item.name} (${item.unit})` }))}
                    value={ing.inventoryItemId}
                    onChange={(val) => updateIngredient(idx, 'inventoryItemId', val)}
                    className="flex-1 w-full sm:w-auto font-bold text-sm"
                  />
                  <div className="flex items-center gap-2 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                    <div className="flex items-center gap-2">
                       <input 
                         type="number"
                         step="0.01"
                         min="0.01"
                         value={ing.quantityNeeded || ''}
                         onChange={e => {
                           const val = isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value);
                           updateIngredient(idx, 'quantityNeeded', val);
                         }}
                         className={`w-20 bg-white dark:bg-slate-900 border ${ing.quantityNeeded <= 0 ? 'border-brand-danger bg-red-50 dark:bg-red-950/20' : 'border-slate-200 dark:border-slate-800'} rounded-lg px-2 py-1.5 text-center font-bold text-sm outline-none focus:ring-2 ring-brand-primary/20 transition-all font-sans text-slate-900 dark:text-slate-100`}
                         placeholder="Qty"
                       />
                       <span className="text-[10px] font-bold text-slate-400 uppercase">
                         {inventory.find(inv => inv.id === ing.inventoryItemId)?.unit || 'Qty'}
                       </span>
                    </div>
                    <button type="button" onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-brand-danger p-1 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors ml-2">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {formData.ingredients.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl opacity-40">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400">No ingredients assigned yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Customization Variations</label>
            <div className="flex flex-wrap gap-2">
               {customizationGroups.map(group => (
                 <button
                   key={group.id}
                   type="button"
                   onClick={() => toggleCustomizationGroup(group.id)}
                   className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                     formData.customizationGroupIds.includes(group.id)
                       ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/10'
                       : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-brand-primary'
                   }`}
                 >
                   {group.name}
                 </button>
               ))}
               {customizationGroups.length === 0 && (
                 <p className="text-[10px] text-slate-400 italic">No variation groups defined yet.</p>
               )}
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 transition-colors">
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Plus size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{submitting ? 'Brewing...' : 'Create Product'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CategoryCard: React.FC<{ 
  category: any; 
  onSuccess: () => void;
  onDelete: (id: string) => void;
}> = ({ category, onSuccess, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!name || name === category.name) {
      setIsEditing(false);
      return;
    }
    setLoading(true);
    try {
      await apiClient.put(`/menu/categories/${category.id}`, { name });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('Update category failed:', err);
      alert('Failed to update category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border border-slate-200 dark:border-slate-800 p-8 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-500"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-slate-800/20 rounded-bl-full flex items-center justify-end pr-5 pt-5 text-slate-200 dark:text-slate-700 group-hover:text-brand-secondary/30 transition-colors">
        <Package size={28} />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center text-brand-secondary border border-slate-200 dark:border-slate-800 shadow-sm group-hover:scale-105 transition-transform duration-500">
             <Package size={32} />
           </div>
           <div className="flex-1">
             {isEditing ? (
               <input 
                 autoFocus
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-slate-900 dark:text-slate-100 font-bold outline-none focus:ring-2 ring-brand-secondary/20 transition-colors"
               />
             ) : (
               <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight group-hover:text-brand-secondary transition-colors line-clamp-1 transition-colors">{category.name}</h3>
             )}
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 mt-1 transition-colors">{category._count?.products || 0} Assets Registered</p>
           </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800/50 transition-colors">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleUpdate}
                  disabled={loading}
                  className="p-3 bg-slate-900 dark:bg-brand-primary text-white rounded-xl hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all shadow-md"
                >
                  {loading ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setName(category.name); }}
                  className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-sm"
                  title="Rename"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(category.id)}
                  disabled={(category._count?.products || 0) > 0}
                  className={`w-10 h-10 flex items-center justify-center transition-all rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-sm ${
                    (category._count?.products || 0) > 0 
                      ? 'opacity-20 cursor-not-allowed text-slate-400' 
                      : 'text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20'
                  }`}
                  title={(category._count?.products || 0) > 0 ? "Cannot delete: Linked products exist" : "Delete Collection"}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 transition-colors">ID: CID-{(category.id as string).slice(0, 4).toUpperCase()}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const ProductCard: React.FC<{ 
  product: Product & { customizations?: any[]; ingredients?: any[] }; 
  categoryList: any[]; 
  customizationGroups: any[];
  inventory: InventoryItem[];
  onSuccess: () => void 
}> = ({ product, categoryList, customizationGroups, inventory, onSuccess }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price.toString(),
    categoryId: product.categoryId,
    imageUrl: product.imageUrl || '',
    customizationGroupIds: product.customizations?.map(c => c.groupId) || [] as string[],
    ingredients: product.ingredients?.map(i => ({
      inventoryItemId: i.inventoryItemId,
      quantityNeeded: i.quantityNeeded
    })) || [] as { inventoryItemId: string; quantityNeeded: number }[]
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await apiClient.put(`/menu/${product.id}`, {
        ...editData,
        price: Number(editData.price)
      });
      setIsEditing(false);
      onSuccess();
    } catch (err) {
      console.error('Update failed:', err);
      alert('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async () => {
    setLoading(true);
    try {
      await apiClient.put(`/menu/${product.id}`, {
        ...editData,
        price: Number(editData.price),
        isVisible: !product.isVisible
      });
      onSuccess();
    } catch (err) {
      console.error('Toggle visibility failed:', err);
      alert('Failed to update product visibility');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${product.name}?`)) return;
    setLoading(true);
    try {
      await apiClient.delete(`/menu/${product.id}`);
      onSuccess();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`bg-white/70 dark:bg-slate-900/50 backdrop-blur-md rounded-[24px] border p-8 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-500 flex flex-col justify-between ${!product.isVisible ? 'border-amber-200 dark:border-amber-900/30 grayscale-[0.8] opacity-80' : 'border-slate-200 dark:border-slate-800'}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 dark:bg-slate-800/20 rounded-bl-full flex items-center justify-end pr-6 pt-6 text-slate-200 dark:text-slate-700 group-hover:text-brand-secondary/30 transition-colors">
        <Coffee size={36} />
      </div>

      <div className="relative z-10">
        <div className="flex gap-6 mb-8">
           <div className="w-24 h-24 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
              <img src={product.imageUrl || ''} alt={product.name} className="w-full h-full object-cover" />
           </div>
           <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h3 className={`text-2xl font-bold tracking-tight transition-colors ${product.isVisible ? 'text-slate-900 dark:text-slate-100 group-hover:text-brand-secondary' : 'text-slate-400 dark:text-slate-500 line-through'}`}>{product.name}</h3>
                {!product.isVisible && (
                  <span className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-amber-200 dark:border-amber-900/50">Halted</span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-2 leading-relaxed opacity-80 transition-colors">{product.description}</p>
              <div className="flex flex-wrap gap-2 pt-1 transition-colors">
                <span className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 transition-colors">
                  {categoryList.find(c => c.id === product.categoryId)?.name || 'Asset'}
                </span>
                {product.ingredients && product.ingredients.length > 0 && (
                  <span className="bg-slate-50 dark:bg-slate-950 text-brand-secondary px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-800 transition-colors">
                    {product.ingredients.length} Compounds
                  </span>
                )}
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 transition-colors">Standard Rate</p>
            <p className="text-3xl font-serif font-black text-slate-900 dark:text-brand-secondary transition-colors">₱{Number(product.price).toFixed(2)}</p>
          </div>
          {product.customizations && product.customizations.length > 0 && (
             <div className="text-right">
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1 transition-colors">Variations</p>
               <div className="flex flex-wrap justify-end gap-1 font-mono">
                 {product.customizations.map((c: any, idx: number) => (
                   <span key={`${product.id}-cust-${c.groupId || idx}-${idx}`} className="w-2 h-2 rounded-full bg-brand-secondary/30 transition-colors"></span>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800/50 transition-colors">
        <div className="flex gap-2">
           <button 
            onClick={handleToggleVisibility}
            className={`w-11 h-11 flex items-center justify-center transition-all rounded-xl border shadow-sm ${
              product.isVisible 
                ? 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800/50' 
                : 'text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30 hover:bg-amber-600 hover:text-white dark:hover:bg-amber-500'
            }`}
            title={product.isVisible ? "Halt Sales" : "Resume Sales"}
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : product.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="w-11 h-11 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-sm"
            title="Configure"
          >
            <Edit3 size={20} />
          </button>
        </div>
        <button 
          onClick={handleDelete}
          className="w-11 h-11 flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all rounded-xl border border-slate-200 dark:border-slate-800/50 shadow-sm"
          title="Decommission"
        >
          <Trash2 size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isEditing && (
          <EditProductModal 
            product={product} 
            categoryList={categoryList} 
            customizationGroups={customizationGroups}
            inventory={inventory}
            onClose={() => setIsEditing(false)}
            onSuccess={() => { setIsEditing(false); onSuccess(); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};


const EditProductModal: React.FC<{ 
  product: any; 
  categoryList: any[]; 
  customizationGroups: any[];
  inventory: InventoryItem[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ product, categoryList, customizationGroups, inventory, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: product.name,
    description: product.description || '',
    price: product.price.toString(),
    imageUrl: product.imageUrl || '',
    categoryId: product.categoryId,
    ingredients: product.ingredients?.map((i: any) => ({
      inventoryItemId: i.inventoryItemId,
      quantityNeeded: i.quantityNeeded
    })) || [] as { inventoryItemId: string; quantityNeeded: number }[],
    customizationGroupIds: product.customizations?.map((c: any) => c.groupId) || [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSubmit = React.useCallback(async (e?: React.FormEvent | Event) => {
    if (e && 'preventDefault' in e) e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.put(`/menu/${product.id}`, {
        ...formData,
        price: Number(formData.price)
      });
      toast.success('Asset configuration finalized.');
      onSuccess();
    } catch (err: any) {
      console.error('Update failed:', err);
      toast.error(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, product.id, onSuccess]);

  // Esc key listener with confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const hasChanges = formData.name !== product.name || 
                          formData.price !== product.price.toString() ||
                          formData.description !== (product.description || '');
        if (hasChanges) {
          if (confirm('Discard unsaved changes?')) {
            onClose();
          }
        } else {
          onClose();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSubmit(new Event('submit'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, formData, product, handleSubmit]);

  const toggleCustomizationGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      customizationGroupIds: prev.customizationGroupIds.includes(groupId)
        ? prev.customizationGroupIds.filter(id => id !== groupId)
        : [...prev.customizationGroupIds, groupId]
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('image', file);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: uploadData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      setFormData(prev => ({ ...prev, imageUrl: data.imageUrl }));
      toast.success('Visual resource updated.');
    } catch (err) {
      console.error('Image upload failed:', err);
      toast.error('Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const addIngredient = () => {
    if (inventory.length === 0) return;
    setFormData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventoryItemId: inventory[0].id, quantityNeeded: 1 }]
    }));
  };

  const removeIngredient = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing)
    }));
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 md:p-6 lg:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => {
            const hasChanges = formData.name !== product.name || 
                              formData.price !== product.price.toString() ||
                              formData.description !== (product.description || '');
            if (hasChanges) {
              if (confirm('Discard unsaved changes?')) {
                onClose();
              }
            } else {
              onClose();
            }
        }}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-2xl transition-all"
      />
      
      <motion.div 
        initial={{ y: 50, opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-[95vw] h-[95vh] bg-slate-50 dark:bg-[#1a1f2e] shadow-2xl rounded-[24px] border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden transition-colors"
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white/70 dark:bg-[#1a1f2e]/50 backdrop-blur-md sticky top-0 z-10 transition-colors">
          <div>
             <div className="flex items-center gap-3 mb-1">
               <span className="bg-teal-500/10 text-teal-500 border border-teal-500/20 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">Edit Mode</span>
               <h2 className="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 transition-colors">EDIT ASSET: {product.name}</h2>
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 transition-colors">Configuring Asset Details</p>
          </div>
          <button 
            onClick={() => {
              const hasChanges = formData.name !== product.name || 
                                formData.price !== product.price.toString() ||
                                formData.description !== (product.description || '');
              if (hasChanges) {
                if (confirm('Discard unsaved changes?')) {
                  onClose();
                }
              } else {
                onClose();
              }
            }}
            className="p-3 bg-slate-200/50 dark:bg-slate-800/50 hover:bg-slate-300 dark:hover:bg-slate-700/50 rounded-full transition-all text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-8">
          <form className="space-y-12 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left Column: Visuals & Identity */}
              <div className="space-y-8">
                <div>
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-teal-600 dark:text-teal-400 mb-6 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-teal-600 dark:bg-teal-400"></div>
                     Visuals & Identity
                   </h3>
                   
                   {/* Image Area */}
                   <div className="space-y-3 mb-8">
                     <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Visual Resource</label>
                     <div className="relative group/image">
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleImageUpload}
                          className="hidden"
                          accept="image/*"
                        />
                        {formData.imageUrl ? (
                          <div className="relative aspect-video rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm group">
                            <img 
                              src={formData.imageUrl} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 backdrop-blur-[2px]">
                               <div className="flex gap-3">
                                 <button 
                                  type="button"
                                  onClick={() => fileInputRef.current?.click()}
                                  className="bg-teal-400 text-slate-950 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-teal-500 hover:text-white transition-all shadow-2xl font-black uppercase tracking-widest text-[9px]"
                                 >
                                   <RefreshCw size={14} className={uploading ? 'animate-spin' : ''} />
                                   Replace
                                 </button>
                                 <button 
                                  type="button"
                                  onClick={() => setFormData({...formData, imageUrl: ''})}
                                  className="bg-red-500/20 text-red-400 border border-red-500/30 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-red-500 hover:text-white transition-all shadow-2xl font-black uppercase tracking-widest text-[9px]"
                                 >
                                   <Trash2 size={14} />
                                   Remove
                                 </button>
                               </div>
                            </div>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-white dark:hover:bg-slate-900/50 hover:border-teal-500/50 dark:hover:border-teal-500/50 group ${uploading ? 'animate-pulse' : ''}`}
                          >
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-teal-400 transition-all border border-slate-200 dark:border-slate-800">
                              {uploading ? <RefreshCw size={24} className="animate-spin" /> : <Upload size={24} />}
                            </div>
                            <div className="text-center">
                              <p className="font-black uppercase tracking-widest text-[10px] text-slate-500 group-hover:text-teal-400 transition-colors">{uploading ? 'Processing...' : 'Initialize Resource'}</p>
                            </div>
                          </button>
                        )}
                        <input 
                          value={formData.imageUrl}
                          onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                          className="mt-3 w-full px-5 py-3.5 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 rounded-xl outline-none transition-all font-mono text-[10px] text-slate-400 dark:text-slate-400"
                          placeholder="or paste URL here..."
                        />
                     </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Asset Nomenclature</label>
                        <input 
                          required
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:border-teal-500/50 ring-teal-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100 text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Economic Rate (₱)</label>
                        <input 
                          required
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: e.target.value})}
                          className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:border-teal-500/50 ring-teal-500/50 rounded-2xl outline-none transition-all font-serif font-black text-slate-900 dark:text-teal-400 text-2xl"
                        />
                      </div>
                   </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Asset Narrative</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:border-teal-500/50 ring-teal-500/50 rounded-2xl outline-none transition-all font-medium text-slate-700 dark:text-slate-300 resize-none h-32"
                    placeholder="Describe the asset..."
                  />
                </div>
              </div>

              {/* Right Column: Configuration */}
              <div className="space-y-12">
                 <div>
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-teal-400 mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-teal-400"></div>
                      Configuration
                    </h3>

                    <div className="space-y-8">
                       <div className="space-y-2">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Deployment Segment</label>
                          <select 
                            value={formData.categoryId}
                            onChange={e => setFormData({...formData, categoryId: e.target.value})}
                            className="w-full px-5 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 focus:ring-1 focus:border-teal-500/50 ring-teal-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-slate-100 appearance-none cursor-pointer"
                          >
                            {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       </div>

                       {/* Variations */}
                       <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Activation Variations</label>
                          <div className="grid grid-cols-2 gap-3">
                             {customizationGroups.map(group => (
                               <button
                                 key={group.id}
                                 type="button"
                                 onClick={() => toggleCustomizationGroup(group.id)}
                                 className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all duration-300 ${
                                   formData.customizationGroupIds.includes(group.id)
                                     ? 'bg-slate-900 dark:bg-teal-500 border-slate-900 dark:border-teal-500 text-white shadow-md dark:shadow-teal-500/20'
                                     : 'bg-white dark:bg-slate-900/30 text-slate-500 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                                 }`}
                               >
                                 {group.name}
                               </button>
                             ))}
                          </div>
                       </div>

                       {/* Ingredients */}
                       <div className="space-y-6">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-500 ml-1">Resource Composition</label>
                            <button 
                              type="button" 
                              onClick={addIngredient}
                              className="group flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                            >
                               <Plus size={14} />
                               Add Compound
                            </button>
                          </div>
                          
                          <div className="space-y-3">
                            {formData.ingredients.map((ing, idx) => (
                              <div 
                                key={`edit-ing-${ing.inventoryItemId}-${idx}`}
                                className="flex gap-3 bg-white dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/50 group/item transition-colors hover:border-slate-300 dark:hover:border-slate-700 focus-within:ring-1 focus-within:border-teal-500/50 focus-within:ring-teal-500/50"
                              >
                                <div className="flex-1">
                                  <SearchableSelect
                                    options={inventory.map(item => ({ value: item.id, label: `${item.name} (${item.unit})` }))}
                                    value={ing.inventoryItemId}
                                    onChange={(val) => updateIngredient(idx, 'inventoryItemId', val)}
                                    className="bg-transparent"
                                  />
                                </div>
                                <div className="flex items-center gap-3">
                                   <input 
                                     type="number"
                                     step="0.01"
                                     value={ing.quantityNeeded || ''}
                                     onChange={e => updateIngredient(idx, 'quantityNeeded', parseFloat(e.target.value) || 0)}
                                     className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-center font-bold text-slate-900 dark:text-slate-100 focus:border-teal-500 outline-none transition-all text-sm"
                                     placeholder="Qty"
                                   />
                                   <button 
                                     type="button" 
                                     onClick={() => removeIngredient(idx)} 
                                     className="text-slate-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                                   >
                                     <Trash2 size={16} />
                                   </button>
                                </div>
                              </div>
                            ))}
                            {formData.ingredients.length === 0 && (
                              <div className="py-10 border-2 border-dashed border-slate-200 dark:border-slate-800/50 rounded-3xl text-center transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-700 transition-colors">No composition defined</p>
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a1f2e] sticky bottom-0 z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.5)] transition-colors">
           <div className="flex gap-6 items-center flex-row-reverse sm:flex-row">
              <div className="flex-1 hidden sm:block">
                 <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cmd/Ctrl + S to Save, Esc to Cancel</p>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  const hasChanges = formData.name !== product.name || 
                                    formData.price !== product.price.toString() ||
                                    formData.description !== (product.description || '');
                  if (hasChanges) {
                    if (confirm('Discard unsaved changes?')) {
                      onClose();
                    }
                  } else {
                    onClose();
                  }
                }}
                className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting || uploading}
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-950/90 px-10 py-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 dark:hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.2)] flex items-center justify-center gap-4 disabled:opacity-50 min-w-[200px]"
              >
                {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="bg-white/70 dark:bg-slate-900/50 backdrop-blur-md p-10 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center transition-all hover:border-slate-300 dark:hover:border-slate-700 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-brand-secondary/5 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-700 transition-colors" />
    <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-3xl mb-6 shadow-sm group-hover:scale-110 transition-transform border border-slate-100 dark:border-slate-800 transition-colors">
      <div className="text-brand-secondary drop-shadow-[0_0_10px_rgba(200,169,126,0.1)] transition-colors">
        {icon}
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-4 transition-colors group-hover:text-brand-secondary">{label}</p>
    <p className="text-5xl font-serif font-black text-slate-900 dark:text-slate-100 transition-colors tracking-tighter">{value}</p>
  </div>
);

const RoleBadge = ({ role, loading }: { role: Role, loading?: boolean }) => {
  const styles = {
    ADMIN: 'bg-slate-900 dark:bg-slate-800 text-white dark:text-brand-secondary border-slate-900 dark:border-brand-secondary/20 shadow-slate-900/10',
    STAFF: 'bg-brand-primary/10 dark:bg-slate-800/80 text-brand-primary dark:text-brand-secondary/80 border-brand-primary/20 dark:border-brand-secondary/10 shadow-sm',
    CUSTOMER: 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 shadow-sm'
  };
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] shadow-sm border transition-all ${styles[role]}`}>
      {loading ? <RefreshCw size={10} className="animate-spin" /> : (
        role === 'ADMIN' ? <Shield size={10} /> : role === 'STAFF' ? <Plus size={10} /> : null
      )}
      {role}
    </span>
  );
};

const CreateCategoryModal: React.FC<{ 
  category?: Category | null;
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ category, onClose, onSuccess }) => {
  const [name, setName] = useState(category?.name || '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (category) {
        await apiClient.put(`/menu/categories/${category.id}`, { name });
      } else {
        await apiClient.post('/menu/categories', { name });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-colors"
      >
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight transition-colors">{category ? 'Refine Category' : 'New Collection'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium transition-colors">Define a new segment for your menu.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 transition-colors">
          <div className="space-y-2 transition-colors">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Category Name</label>
            <input 
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-slate-900/10 dark:ring-brand-secondary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
              placeholder="e.g. Signature Lattes"
            />
          </div>

          <div className="pt-4 flex gap-4 transition-colors">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-slate-900 dark:bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-brand-secondary transition-all shadow-xl shadow-slate-900/5 dark:shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Package size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{submitting ? 'Setting up...' : (category ? 'Update Category' : 'Establish Category')}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AdminDashboard;
