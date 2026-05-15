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
import { TransactionsTable } from '../components/TransactionsTable';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'products' | 'variations' | 'categories' | 'inventory' | 'audit-logs' | 'transactions'>('overview');
  
  const [stats, setStats] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPagination, setAuditPagination] = useState<any>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditAdminFilter, setAuditAdminFilter] = useState('');
  const [auditDistinctActions, setAuditDistinctActions] = useState<string[]>([]);
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
    }

    Promise.all(promises).then((results) => {
      const [statsData, invData, menuData, userData, categoryData, customData] = results;
      setStats(statsData);
      setInventory(invData);
      setCategories(menuData);
      setUsers(userData);
      setCategoryList(categoryData);
      if (user?.role !== 'STAFF') {
        setCustomizations(customData);
      }
      setLoading(false);
    });
  };

  const fetchAuditLogs = async (page: number = 1, append: boolean = false) => {
    if (user?.role === 'STAFF') return;
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (auditActionFilter) params.append('action', auditActionFilter);
      if (auditAdminFilter) params.append('adminId', auditAdminFilter);
      
      const response = await apiClient.get(`/admin/audit-logs?${params.toString()}`);
      if (append) {
        setAuditLogs(prev => [...prev, ...response.logs]);
      } else {
        setAuditLogs(response.logs);
      }
      setAuditPagination(response.pagination);
      setAuditDistinctActions(response.distinctActions || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'audit-logs' || activeTab === 'overview') {
      fetchAuditLogs(1, false);
    }
  }, [auditActionFilter, auditAdminFilter, activeTab]);

  const loadMoreAuditLogs = async () => {
    if (!auditPagination || auditPagination.currentPage >= auditPagination.pages || auditLoading) return;
    
    const nextPage = auditPagination.currentPage + 1;
    await fetchAuditLogs(nextPage, true);
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
    <div className="space-y-8 min-h-screen bg-bg-base">
      {lowStockItems.length > 0 && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="bg-brand-danger px-6 py-4 rounded-xl flex items-center justify-between gap-4 shadow-sm mb-8 border border-white/10"
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
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 py-6 mb-12 shadow-sm transition-colors duration-300">
        {/* Row 1: Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="space-y-2 text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#1A1F2E] tracking-tight">Management</h1>
            <p className="text-[#64748B] font-medium tracking-tight">System intelligence & resource planning.</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={handleExportOrders}
              disabled={isExporting}
              className="flex-1 md:flex-none border border-[#1A1F2E] bg-white text-[#1A1F2E] px-6 py-3.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-sm group shadow-sm"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={20} className="group-hover:-translate-y-0.5 transition-transform" />}
              <span className="font-black uppercase tracking-widest text-[10px]">Export Data</span>
            </button>
            {activeTab === 'users' ? (
               <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex-1 md:flex-none bg-[#1A1F2E] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-3 text-sm"
                >
                  <Plus size={22} />
                  <span className="font-black uppercase tracking-widest text-[10px]">New Personnel</span>
                </button>
            ) : (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-none bg-[#1A1F2E] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-3 text-sm"
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
              { id: 'transactions', label: 'Transactions', icon: <Package size={18} /> },
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
                className={`px-3 py-4 font-serif text-lg transition-all flex items-center gap-3 flex-shrink-0 border-b-2 transition-all duration-300 ${
                  activeTab === tab.id 
                    ? 'border-[#1A1F2E] text-[#1A1F2E] font-bold' 
                    : 'border-transparent text-[#64748B] font-medium hover:text-[#1A1F2E]'
                }`}
              >
                {tab.icon}
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
              icon={<TrendingUp className="text-[#1A1F2E]" />} 
              label="Total Revenue" 
              value={`₱${Number(stats?.totalRevenue || 0).toFixed(2)}`} 
            />
            <StatCard 
              icon={<Package className="text-[#1A1F2E]" />} 
              label="Total Orders" 
              value={stats?.totalOrders || 0} 
            />
            <StatCard 
              icon={<Plus className="text-[#1A1F2E]" />} 
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
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
              <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] mb-10 flex items-center gap-3">
                <BarChart3 size={24} className="text-[#1A1F2E]" />
                Product Demand
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.topProducts || []}>
                    <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                      contentStyle={{ 
                        borderRadius: '12px', 
                        border: '1px solid #e2e8f0', 
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', 
                        padding: '12px',
                        backgroundColor: 'white',
                        color: '#1A1F2E'
                      }}
                      itemStyle={{ color: '#1A1F2E' }}
                      labelStyle={{ color: '#64748B', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Bar dataKey="quantity" fill="#1A1F2E" radius={[4, 4, 0, 0]} barSize={40}>
                      {stats?.topProducts?.map((_entry:any, index:number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#1A1F2E' : '#64748B'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Inventory Table */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-serif font-bold text-[#1A1F2E] flex items-center gap-3">
                  <Package size={24} className="text-[#1A1F2E]" />
                  Stock Inventory
                </h2>
                <button 
                  onClick={() => setIsInventoryModalOpen(true)}
                  className="w-10 h-10 bg-[#1A1F2E] text-white rounded-xl flex items-center justify-center hover:bg-[#1A1F2E]/90 transition-all shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 no-scrollbar border-t border-slate-100 pt-5">
                {inventory.map((item, index) => {
                  const isLow = item.stockLevel <= item.lowStockThreshold;
                  const isCritical = item.stockLevel === 0;
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col gap-2 p-4 rounded-xl transition-all border ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      } ${
                        isCritical
                          ? 'border-red-200 bg-red-50'
                          : isLow 
                            ? 'border-orange-200 bg-orange-50' 
                            : 'border-transparent hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-[#1A1F2E]'}`}></div>
                          <span className="font-bold text-[#1A1F2E]">{item.name}</span>
                          {isLow && (
                            <span className={`text-[8px] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-tight shadow-sm ${isCritical ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`}>
                              {isCritical ? 'Depleted' : 'Low Stock'}
                            </span>
                          )}
                        </div>
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-[#64748B]'}`}>
                          {item.stockLevel} {item.unit}
                        </span>
                      </div>
                      
                      {/* Linked Products Feedback */}
                      {((item as any).products?.length > 0 || (item as any).customizations?.length > 0) && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {(item as any).products?.map((p: any, pIdx: number) => (
                            <span key={`p-${p.productId}-${pIdx}`} className="text-[10px] bg-slate-100 text-[#64748B] px-2 py-0.5 rounded font-medium border border-slate-200">
                              {p.product.name}
                            </span>
                          ))}
                          {(item as any).customizations?.map((c: any, cIdx: number) => (
                            <span key={`c-${c.choiceId}-${cIdx}`} className="text-[10px] bg-brand-primary/5 text-brand-primary px-2 py-0.5 rounded font-medium border border-brand-primary/10">
                              {c.choice.group.name}: {c.choice.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (item.stockLevel / (item.lowStockThreshold * 5)) * 100)}%` }}
                          className={`h-full ${isLow ? 'bg-red-500' : 'bg-[#1A1F2E]'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <button className="w-full mt-10 py-4 border-2 border-[#1A1F2E] text-[#1A1F2E] rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#1A1F2E] hover:text-white transition-all">
                Replenish Stock
              </button>
            </section>
          </div>
        </>
      ) : activeTab === 'users' ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Personnel</h2>
              <p className="text-[#64748B] font-medium transition-colors">Manage system access tiers and security clearances.</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest">Employee/User</th>
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest">Authority Level</th>
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest text-right">Clearance Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u, index) => (
                    <tr key={u.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-[#1A1F2E] text-white flex items-center justify-center font-bold text-sm">
                            {u.name?.[0] || u.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-[#1A1F2E]">{u.name || 'Anonymous User'}</p>
                            <p className="text-xs text-[#64748B] font-mono">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={u.role} loading={updatingUserId === u.id} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div className="flex gap-2">
                            {['CUSTOMER', 'STAFF', 'ADMIN']
                              .filter(r => r !== u.role)
                              .map(r => (
                                <button
                                  key={r}
                                  onClick={() => handleUpdateRole(u.id, r as Role)}
                                  disabled={updatingUserId === u.id}
                                  className="px-2 py-1 rounded text-[10px] font-bold text-[#64748B] hover:text-[#1A1F2E] hover:bg-slate-200 transition-colors border border-slate-200"
                                >
                                  {r[0]}{r.slice(1).toLowerCase()}
                                </button>
                              ))
                            }
                          </div>
                          <button 
                            onClick={() => setEditingUser(u)}
                            className="p-2 text-[#64748B] hover:text-[#1A1F2E] transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => setUserToDelete(u)}
                            disabled={u.id === user?.id || updatingUserId === u.id}
                            className="p-2 text-[#64748B] hover:text-red-600 disabled:opacity-0 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      ) : activeTab === 'inventory' ? (
        <section className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Resource Pipeline</h2>
              <p className="text-[#64748B] font-medium tracking-tight">System intelligence & resource planning.</p>
            </div>
            <button 
              onClick={() => setIsInventoryModalOpen(true)}
              className="bg-[#1A1F2E] text-white px-10 py-4 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-4"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-widest text-[10px]">Register Resource</span>
            </button>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Scan inventory records..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-slate-200 focus:border-[#1A1F2E] rounded-xl outline-none transition-all font-bold text-[#1A1F2E] placeholder:text-[#64748B]/50 shadow-inner"
              />
            </div>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest">Resource Name</th>
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest text-center">In Stock</th>
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest text-center">Efficiency Level</th>
                    <th className="px-6 py-4 text-xs font-bold font-serif text-[#1A1F2E] uppercase tracking-widest text-right">Pipeline Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((item, index) => {
                    const isLow = item.stockLevel <= item.lowStockThreshold;
                    const stockPercent = Math.min(100, (item.stockLevel / (item.lowStockThreshold * 3)) * 100);
                    return (
                      <tr key={item.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-slate-50 transition-colors`}>
                        <td className="px-6 py-4">
                          <div className="font-bold text-[#1A1F2E]">{item.name}</div>
                          {isLow && (
                            <span className="text-[10px] font-black text-red-600 uppercase tracking-tighter bg-red-50 px-2 py-0.5 rounded border border-red-100">Low Stock Alert</span>
                          )}
                          
                          {/* Linked Products Feedback - Requirement 4 */}
                          <div className="flex flex-wrap gap-1 mt-2">
                          {(item as any).products?.map((p: any, pIdx: number) => (
                               <span key={`tp-${p.productId}-${pIdx}`} className="text-[9px] bg-slate-100 text-[#64748B] px-1.5 py-0.5 rounded border border-slate-200">
                                 {p.product.name}
                               </span>
                             ))}
                             {(item as any).customizations?.map((c: any, cIdx: number) => (
                               <span key={`tc-${c.choiceId}-${cIdx}`} className="text-[9px] bg-brand-primary/5 text-brand-primary px-1.5 py-0.5 rounded border border-brand-primary/10">
                                 {c.choice.group.name}: {c.choice.name}
                               </span>
                             ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col">
                            <span className={`font-mono font-bold ${isLow ? 'text-red-600 font-black' : 'text-[#1A1F2E]'}`}>
                              {item.stockLevel} <span className="text-[10px] uppercase font-bold text-[#64748B]">{item.unit}</span>
                            </span>
                            {item.projectedStock !== undefined && item.projectedStock !== item.stockLevel && (
                              <span className="text-[9px] text-[#64748B] font-bold" title="Projected after active carts">
                                Projected: {item.projectedStock} {item.unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-32 mx-auto bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-1000 ${isLow ? 'bg-red-500' : 'bg-[#1A1F2E]'}`}
                              style={{ width: `${stockPercent}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3 text-[#64748B]">
                            <button 
                              onClick={() => {
                                const amount = prompt(`Enter amount to add for ${item.name}:`, '10');
                                if (amount && !isNaN(parseInt(amount))) {
                                  handleRestock(item.id, parseInt(amount));
                                }
                              }}
                              className="p-2 hover:text-[#1A1F2E] transition-colors"
                              title="Replenish"
                            >
                               <RefreshCw size={16} />
                            </button>
                             <button 
                              onClick={() => setEditingInventory(item)}
                              className="p-2 hover:text-[#1A1F2E] transition-colors"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDeleteInventory(item.id)}
                              className="p-2 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center">
                        <Package size={48} className="mx-auto mb-4 text-slate-200" />
                        <p className="font-serif text-xl italic text-slate-400">No resource records matched the query.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : activeTab === 'products' ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Gallery</h2>
              <p className="text-[#64748B] font-medium tracking-tight transition-colors">Curating your coffee masterpieces and catalog offerings.</p>
            </div>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#1A1F2E] text-white px-10 py-4 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-4"
            >
              <Plus size={20} />
              <span className="font-black uppercase tracking-widest text-[10px]">New Masterpiece</span>
            </button>
          </div>
 
          <div className="flex flex-col xl:flex-row gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input 
                type="text"
                placeholder="Search catalog..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-slate-50 border border-slate-200 focus:border-[#1A1F2E] rounded-xl outline-none transition-all font-bold text-lg text-[#1A1F2E] placeholder:text-[#64748B]/50 shadow-inner"
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
                      className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white border border-slate-200 text-[#1A1F2E] rounded-full flex items-center justify-center shadow-sm"
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
                        ? 'bg-[#1A1F2E] text-white border-[#1A1F2E] shadow-sm'
                        : 'text-[#64748B] border-slate-200 hover:border-[#1A1F2E] hover:text-[#1A1F2E] hover:bg-slate-50'
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
                          ? 'bg-[#1A1F2E] text-white border-[#1A1F2E] shadow-sm'
                          : 'text-[#64748B] border-slate-200 hover:border-[#1A1F2E] hover:text-[#1A1F2E] hover:bg-slate-50'
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
              <div className="col-span-full py-32 bg-white border-2 border-dashed border-slate-100 rounded-xl text-center">
                <Search size={64} className="mx-auto mb-6 text-slate-200" />
                <p className="font-serif text-2xl italic text-slate-400">The catalog is silent. No matches found.</p>
                {(productSearch || productCategoryFilter !== 'all') && (
                  <button 
                    onClick={() => { setProductSearch(''); setProductCategoryFilter('all'); }}
                    className="mt-6 text-[10px] font-black uppercase tracking-widest text-[#1A1F2E] hover:text-[#64748B]"
                  >
                    Clear Filter Pipeline
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      ) : activeTab === 'categories' ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Collections</h2>
              <p className="text-[#64748B] font-medium tracking-tight transition-colors">Architect your menu hierarchy and grouping logic.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="bg-[#1A1F2E] text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 shadow-sm hover:bg-[#1A1F2E]/90 transition-all"
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
        <section className="space-y-6">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Add-ons</h2>
              <p className="text-[#64748B] font-medium tracking-tight transition-colors">Manage milk types, sweetness, and other drink variations.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCustomizationGroup(null);
                setIsCustomizationModalOpen(true);
              }}
              className="bg-[#1A1F2E] text-white px-10 py-4 rounded-xl font-bold flex items-center gap-3 shadow-sm hover:bg-[#1A1F2E]/90 transition-all"
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
                className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-8 transition-all"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-[#1A1F2E] tracking-tight">{group.name}</h3>
                      {group.required && (
                        <span className="bg-[#1A1F2E]/5 text-[#1A1F2E] px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-[#64748B] font-bold flex items-center gap-2 transition-colors">
                      <LinkIcon size={14} className="text-[#1A1F2E]" />
                      Linked to {group.products.length} products
                    </p>
                  </div>
                  <div className="flex gap-2">
                   <button 
                     onClick={() => {
                       setEditingCustomizationGroup(group);
                       setIsCustomizationModalOpen(true);
                     }}
                     className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-[#1A1F2E] transition-all shadow-sm"
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
                      className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-red-500 hover:text-white hover:bg-red-500 transition-all shadow-sm"
                    >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] border-b border-slate-100 pb-3">Choices</p>
                   <div className="grid grid-cols-1 gap-3">
                      {group.choices.map((choice: any) => (
                        <ChoiceRow key={choice.id} choice={choice} onSuccess={fetchData} />
                      ))}
                      <NewChoiceButton groupId={group.id} onSuccess={fetchData} />
                   </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]">Associated Products</p>
                   <div className="flex flex-wrap gap-2">
                      {group.products.map((p: any) => (
                        <span key={p.productId} className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-[#64748B] flex items-center gap-2 hover:bg-white transition-all cursor-default shadow-sm font-sans">
                           {p.product.name}
                        </span>
                      ))}
                      {group.products.length === 0 && <span className="text-xs italic text-[#64748B] px-1">Universal across all items</span>}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : activeTab === 'transactions' ? (
        <section className="space-y-6">
           <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight mb-8">Global Transaction Feed</h2>
           <TransactionsTable />
        </section>
      ) : activeTab === 'audit-logs' ? (
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1A1F2E] tracking-tight">Security</h2>
              <p className="text-[#64748B] font-medium transition-colors">Immutable system activity logs and audit trails.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 transition-colors">
            {/* Filters */}
            <div className="mb-8 flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-2">Filter by Action</label>
                <select 
                  value={auditActionFilter}
                  onChange={(e) => setAuditActionFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[#1A1F2E] outline-none focus:border-[#1A1F2E] transition-colors"
                >
                  <option value="">All Actions</option>
                  {auditDistinctActions.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#64748B] mb-2">Filter by Personnel</label>
                <select 
                  value={auditAdminFilter}
                  onChange={(e) => setAuditAdminFilter(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-[#1A1F2E] outline-none focus:border-[#1A1F2E] transition-colors"
                >
                  <option value="">All Personnel</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 max-h-[700px] overflow-y-auto no-scrollbar pr-4">
              {auditLogs.map((log) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={log.id} 
                  className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 group hover:border-[#1A1F2E]/20 transition-all hover:bg-white duration-300"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-[#1A1F2E] group-hover:scale-110 transition-transform shadow-sm">
                      <Terminal size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="bg-[#1A1F2E]/5 text-[#1A1F2E] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                          {log.action}
                        </span>
                        <h4 className="text-lg font-bold text-[#1A1F2E] tracking-tight">{log.entityName}</h4>
                      </div>
                      <p className="text-sm text-[#64748B] font-medium max-w-xl line-clamp-2 italic">
                        {log.details ? (typeof log.details === 'string' ? log.details : JSON.stringify(log.details)) : 'System mutation recorded.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-6 md:pt-0 md:pl-8 text-right w-full md:w-auto">
                    <div className="flex-1 md:flex-none">
                       <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1A1F2E] mb-1">
                          {log.adminName || 'System'}
                       </p>
                       <p className="text-[10px] font-mono text-[#64748B] font-medium">
                          {new Date(log.createdAt).toLocaleString()}
                       </p>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {auditLogs.length === 0 && (
                <div className="py-40 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                   <Package size={48} className="mx-auto mb-6 text-slate-200" />
                   <p className="font-serif text-2xl italic text-slate-400">System archives are empty.</p>
                </div>
              )}

              {auditPagination && auditPagination.currentPage < auditPagination.pages && (
                <button
                  onClick={loadMoreAuditLogs}
                  disabled={auditLoading}
                  className="w-full py-6 bg-slate-50 text-[#64748B] hover:text-[#1A1F2E] border border-slate-200 rounded-xl font-black uppercase tracking-[0.3em] text-[10px] transition-all hover:bg-white flex items-center justify-center gap-4"
                >
                  {auditLoading ? <RefreshCw className="animate-spin" size={16} /> : <History size={16} />}
                  {auditLoading ? 'Querying Master Records...' : 'Retrieve Legacy Logs'}
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50 rounded-xl border border-dashed border-slate-200 overflow-hidden">
          <Coffee size={48} className="text-[#1A1F2E]/20 mb-4 animate-bounce" />
          <p className="font-serif text-xl text-[#1A1F2E] opacity-40">Ready to brew some data.</p>
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
      <div className="flex items-center gap-2 p-3 bg-white border border-[#1A1F2E] rounded-xl shadow-lg ring-4 ring-[#1A1F2E]/5 transition-all">
        <input 
          value={editData.name}
          onChange={e => setEditData({...editData, name: e.target.value})}
          className="flex-1 bg-transparent text-sm font-bold outline-none text-[#1A1F2E] placeholder:text-slate-300"
          placeholder="Choice Name"
        />
        <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
          <span className="text-[10px] font-black text-slate-400">₱</span>
          <input 
            type="number"
            value={editData.priceModifier}
            onChange={e => setEditData({...editData, priceModifier: Number(e.target.value)})}
            className="w-14 bg-transparent text-[12px] font-bold text-[#1A1F2E] outline-none text-center"
          />
        </div>
        <button onClick={handleUpdate} disabled={loading} className="p-2.5 bg-[#1A1F2E] text-white rounded-xl hover:bg-[#1A1F2E]/90 transition-all shadow-sm">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 group hover:border-slate-200 transition-all hover:bg-white hover:shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-[#1A1F2E] transition-colors" />
        <span className="font-bold text-sm text-[#1A1F2E] tracking-tight flex items-center gap-3 transition-colors">
          {choice.name}
          {choice.priceModifier !== 0 && (
            <span className="text-[10px] text-[#64748B] font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition-colors">
              {choice.priceModifier > 0 ? '+' : ''}₱{Number(choice.priceModifier).toFixed(2)}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">
        <button 
          onClick={() => setIsEditing(true)}
          className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-[#1A1F2E] rounded-lg transition-all shadow-sm"
        >
          <Edit3 size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-red-500 rounded-lg transition-all shadow-sm"
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
        className="w-full py-4 border border-dashed border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] text-[#64748B] hover:border-[#1A1F2E] hover:text-[#1A1F2E] hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md"
      >
        <Plus size={16} className="text-[#1A1F2E]" />
        Include Choice
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-6 bg-slate-50 border border-slate-200 rounded-xl space-y-4 shadow-inner">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] ml-1">Choice Name</label>
        <input 
          autoFocus
          placeholder="e.g. Soy Milk"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-3.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] text-[#1A1F2E] font-bold transition-all"
        />
      </div>
      <div className="space-y-1">
         <label className="text-[10px] font-black uppercase tracking-widest text-[#64748B] ml-1">Price Modifier (₱)</label>
         <input 
           type="number"
           placeholder="0.00"
           value={priceModifier}
           onChange={e => setPriceModifier(Number(e.target.value))}
           className="w-full p-3.5 text-sm bg-white border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] text-[#1A1F2E] font-black transition-all"
         />
      </div>
      <div className="flex gap-3 pt-2">
         <button type="submit" className="flex-1 py-3 bg-[#1A1F2E] text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-md hover:bg-[#1A1F2E]/90 transition-all">Establish</button>
         <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-[#64748B] hover:bg-slate-50 transition-all">Abort</button>
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[95vh]"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center transition-colors">
          <div>
            <h2 className="text-3xl font-serif font-bold text-[#1A1F2E] tracking-tight">{group ? 'Refine Group' : 'New Variation Group'}</h2>
            <p className="text-sm text-[#64748B] font-medium">Define options and link them to products.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-all text-[#64748B]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
               <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Group Title</label>
                  <input 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E]"
                    placeholder="e.g. Milk Options"
                  />
               </div>
               <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, required: !formData.required})}
                    className={`w-12 h-6 rounded-full relative transition-all ${formData.required ? 'bg-[#1A1F2E]' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.required ? 'left-7' : 'left-1'}`}></div>
                  </button>
                  <div>
                    <p className="text-sm font-bold text-[#1A1F2E]">Mandatory Choice</p>
                    <p className="text-[10px] text-[#64748B] font-medium">User must select at least one option.</p>
                  </div>
               </div>
            </div>

            <div className="space-y-4">
               <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1 flex items-center gap-2">
                 <LinkIcon size={12} />
                 Choices
               </label>
               <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                   <div className="space-y-3">
                     {formData.choices.map((choice, idx) => (
                       <div key={idx} className="flex gap-2 group/choice">
                         <input
                           placeholder="Choice"
                           value={choice.name}
                           onChange={e => updateChoice(idx, { name: e.target.value })}
                           className="flex-1 p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1A1F2E] focus:border-[#1A1F2E] outline-none transition-all shadow-sm"
                         />
                         <div className="relative w-24">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">₱</span>
                           <input
                             type="number"
                             step="0.01"
                             value={choice.priceModifier}
                             onChange={e => updateChoice(idx, { priceModifier: Number(e.target.value) })}
                             className="w-full pl-6 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-[#1A1F2E] focus:border-[#1A1F2E] outline-none transition-all shadow-sm"
                           />
                         </div>
                         <button 
                           type="button" 
                           onClick={() => removeChoice(idx)} 
                           className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]"
      >
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-5">
             <div className="w-14 h-14 bg-[#1A1F2E]/10 rounded-xl flex items-center justify-center text-[#1A1F2E] border border-slate-200">
               <Package size={28} />
             </div>
             <div>
               <h2 className="text-3xl font-serif font-bold text-[#1A1F2E] tracking-tight">{inventoryItem ? 'Tune Resource' : 'New Compound'}</h2>
               <p className="text-[#64748B] font-medium text-[10px] uppercase tracking-widest mt-1">Supply Chain Configuration</p>
             </div>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-white rounded-full transition-all text-[#64748B] hover:text-[#1A1F2E]">
            <X size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-10 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Resource Name</label>
                <input 
                  required
                  autoFocus
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E] placeholder:text-slate-300"
                  placeholder="e.g. Milk Concentrate"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Metrics (Unit)</label>
                <select 
                  value={formData.unit}
                  onChange={e => setFormData({...formData, unit: e.target.value})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E] appearance-none cursor-pointer"
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
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Total Payload (Stock)</label>
                <input 
                  required
                  type="number"
                  value={formData.stockLevel}
                  onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-serif font-black text-[#1A1F2E] text-2xl"
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Danger Threshold</label>
                <input 
                  required
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-red-500"
                />
              </div>
            </div>
          </div>

          {/* Linking Section */}
          <div className="space-y-10 pt-6 border-t border-slate-100">
             {/* Product Links */}
             <div className="space-y-6">
                <div className="flex justify-between items-center px-1">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]">Asset Deduction Links</label>
                    <p className="text-[9px] text-[#64748B]/60 mt-1 uppercase font-bold tracking-tight">Deduct from this item when these products are ordered.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addProductLink}
                    className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A1F2E] hover:text-[#64748B] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#1A1F2E]/10 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                       <Plus size={14} />
                    </div>
                    Add Link
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.productLinks.map((link, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                          className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-[#1A1F2E]"
                          placeholder="Qty"
                        />
                        <span className="text-[10px] font-black text-[#64748B] uppercase w-10">{formData.unit}</span>
                        <button type="button" onClick={() => removeProductLink(idx)} className="text-slate-400 hover:text-red-500">
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
                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B]">Variation Deduction Links</label>
                    <p className="text-[9px] text-[#64748B]/60 mt-1 uppercase font-bold tracking-tight">Deduct from this item when these specific variations are selected.</p>
                  </div>
                  <button 
                    type="button" 
                    onClick={addCustomizationLink}
                    className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#1A1F2E] hover:text-[#64748B] transition-colors"
                  >
                    <div className="w-6 h-6 rounded-lg bg-[#1A1F2E]/10 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                       <Plus size={14} />
                    </div>
                    Add Link
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.customizationLinks.map((link, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
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
                          className="w-24 bg-white border border-slate-200 rounded-xl px-4 py-3 text-center font-bold text-[#1A1F2E]"
                          placeholder="Qty"
                        />
                        <span className="text-[10px] font-black text-[#64748B] uppercase w-10">{formData.unit}</span>
                        <button type="button" onClick={() => removeCustomizationLink(idx)} className="text-slate-400 hover:text-red-500">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </form>

        <div className="p-10 bg-slate-50 border-t border-slate-100">
           <div className="flex gap-6">
              <button 
                type="button" 
                onClick={onClose}
                className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#64748B] hover:text-[#1A1F2E] transition-colors"
              >
                Discard Changes
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 bg-[#1A1F2E] text-white py-5 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-4 disabled:opacity-50"
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
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
              <div className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 group">
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
                className={`w-full h-48 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-slate-50 hover:border-[#1A1F2E] group ${uploading ? 'animate-pulse' : ''}`}
              >
                <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#1A1F2E] transition-all">
                  {uploading ? <RefreshCw size={32} className="animate-spin" /> : <Upload size={32} />}
                </div>
                <div className="text-center">
                  <p className="font-bold text-[#1A1F2E]">Upload Product Image</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">PNG, JPG or WebP (Max 5MB)</p>
                </div>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Product Name</label>
                <input 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E]"
                  placeholder="e.g. Lavender Honey Latte"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Price (₱)</label>
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E]"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Category</label>
                <select 
                  value={formData.categoryId}
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E] appearance-none"
                >
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Or Image URL</label>
                <input 
                  value={formData.imageUrl}
                  onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-medium text-[#64748B] italic"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Description</label>
            <textarea 
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-medium text-[#1A1F2E] resize-none"
              rows={3}
              placeholder="Tell a story about this drink..."
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Ingredient Blueprint</label>
              <button 
                type="button" 
                onClick={addIngredient}
                className="text-[10px] font-black uppercase tracking-widest text-[#1A1F2E] hover:text-[#64748B] flex items-center gap-1 transition-colors"
              >
                <Plus size={12} /> Add Ingredient
              </button>
            </div>
            <div className="space-y-3">
              {formData.ingredients.map((ing, idx) => (
                <div key={`new-ing-${ing.inventoryItemId}-${idx}`} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-3 overflow-visible rounded-xl border border-slate-100">
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
                         className={`w-20 bg-white border ${ing.quantityNeeded <= 0 ? 'border-red-500 bg-red-50' : 'border-slate-200'} rounded-lg px-2 py-1.5 text-center font-bold text-sm outline-none focus:border-[#1A1F2E] transition-all font-sans text-[#1A1F2E]`}
                         placeholder="Qty"
                       />
                       <span className="text-[10px] font-bold text-slate-400 uppercase">
                         {inventory.find(inv => inv.id === ing.inventoryItemId)?.unit || 'Qty'}
                       </span>
                    </div>
                    <button type="button" onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-red-500 p-1 hover:bg-white rounded-lg transition-colors ml-2">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {formData.ingredients.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl opacity-40">
                  <p className="text-xs font-medium text-[#64748B]">No ingredients assigned yet.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Customization Variations</label>
            <div className="flex flex-wrap gap-2">
               {customizationGroups.map(group => (
                 <button
                   key={group.id}
                   type="button"
                   onClick={() => toggleCustomizationGroup(group.id)}
                   className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                     formData.customizationGroupIds.includes(group.id)
                       ? 'bg-[#1A1F2E] text-white border-[#1A1F2E] shadow-sm'
                       : 'bg-white text-[#64748B] border-slate-200 hover:border-[#1A1F2E]'
                   }`}
                 >
                   {group.name}
                 </button>
               ))}
               {customizationGroups.length === 0 && (
                 <p className="text-[10px] text-[#64748B] italic">No variation groups defined yet.</p>
               )}
            </div>
          </div>
        </form>

        <div className="p-8 border-t border-slate-100 bg-slate-50 transition-colors">
          <div className="flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1F2E] transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[#1A1F2E] text-white py-4 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
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
      className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm relative overflow-hidden group hover:border-[#1A1F2E]/20 transition-all duration-300"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-full flex items-center justify-end pr-5 pt-5 text-slate-200 group-hover:text-[#1A1F2E]/10 transition-colors">
        <Package size={28} />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-[#1A1F2E] border border-slate-200 shadow-sm transition-transform duration-500">
             <Package size={32} />
           </div>
           <div className="flex-1">
             {isEditing ? (
               <input 
                 autoFocus
                 value={name}
                 onChange={e => setName(e.target.value)}
                 className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-[#1A1F2E] font-bold outline-none focus:border-[#1A1F2E] transition-colors"
               />
             ) : (
               <h3 className="text-2xl font-bold text-[#1A1F2E] tracking-tight group-hover:text-[#1A1F2E]/70 transition-colors line-clamp-1">{category.name}</h3>
             )}
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] mt-1">{category._count?.products || 0} Assets Registered</p>
           </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-slate-100">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button 
                  onClick={handleUpdate}
                  disabled={loading}
                  className="p-3 bg-[#1A1F2E] text-white rounded-xl hover:bg-[#1A1F2E]/90 transition-all shadow-sm"
                >
                  {loading ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                </button>
                <button 
                  onClick={() => { setIsEditing(false); setName(category.name); }}
                  className="p-3 bg-slate-100 text-[#64748B] rounded-xl hover:bg-slate-200 transition-all"
                >
                  <X size={20} />
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-[#1A1F2E] hover:bg-slate-50 transition-all rounded-xl border border-slate-200 shadow-sm"
                  title="Rename"
                >
                  <Edit3 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(category.id)}
                  disabled={(category._count?.products || 0) > 0}
                  className={`w-10 h-10 flex items-center justify-center transition-all rounded-xl border border-slate-200 shadow-sm ${
                    (category._count?.products || 0) > 0 
                      ? 'opacity-20 cursor-not-allowed text-slate-400' 
                      : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                  title={(category._count?.products || 0) > 0 ? "Cannot delete: Linked products exist" : "Delete Collection"}
                >
                  <Trash2 size={18} />
                </button>
              </>
            )}
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
             <span className="text-[10px] font-black uppercase tracking-widest text-[#64748B]">ID: CID-{(category.id as string).slice(0, 4).toUpperCase()}</span>
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
      className={`bg-white rounded-xl border p-6 shadow-sm relative overflow-hidden group hover:border-[#1A1F2E]/20 transition-all duration-300 flex flex-col justify-between ${!product.isVisible ? 'border-amber-200 grayscale-[0.8] opacity-80' : 'border-slate-200'}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full flex items-center justify-end pr-6 pt-6 text-slate-100 group-hover:text-[#1A1F2E]/10 transition-colors">
        <Coffee size={36} />
      </div>

      <div className="relative z-10">
        <div className="flex gap-6 mb-8">
           <div className="w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex-shrink-0">
              <img src={product.imageUrl || ''} alt={product.name} className="w-full h-full object-cover" />
           </div>
           <div className="space-y-2 flex-1">
              <div className="flex items-center gap-3">
                <h3 className={`text-2xl font-bold tracking-tight ${product.isVisible ? 'text-[#1A1F2E] group-hover:text-[#1A1F2E]/70' : 'text-slate-400 line-through'}`}>{product.name}</h3>
                {!product.isVisible && (
                  <span className="text-[10px] bg-amber-50 text-amber-600 px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-amber-200">Halted</span>
                )}
              </div>
              <p className="text-xs text-[#64748B] font-medium line-clamp-2 leading-relaxed">{product.description}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="bg-slate-50 text-[#64748B] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                  {categoryList.find(c => c.id === product.categoryId)?.name || 'Asset'}
                </span>
                {product.ingredients && product.ingredients.length > 0 && (
                  <span className="bg-slate-50 text-[#1A1F2E] px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                    {product.ingredients.length} Compounds
                  </span>
                )}
              </div>
           </div>
        </div>

        <div className="flex justify-between items-end mb-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]/60 mb-1">Standard Rate</p>
            <p className="text-3xl font-serif font-black text-[#1A1F2E]">₱{Number(product.price).toFixed(2)}</p>
          </div>
          {product.customizations && product.customizations.length > 0 && (
             <div className="text-right">
               <p className="text-[10px] font-black uppercase tracking-widest text-[#64748B]/60 mb-1">Variations</p>
               <div className="flex flex-wrap justify-end gap-1 font-mono">
                 {product.customizations.map((c: any, idx: number) => (
                   <span key={`${product.id}-cust-${c.groupId || idx}-${idx}`} className="w-2 h-2 rounded-full bg-[#1A1F2E]/20"></span>
                 ))}
               </div>
             </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
        <div className="flex gap-2">
           <button 
            onClick={handleToggleVisibility}
            className={`w-11 h-11 flex items-center justify-center transition-all rounded-xl border shadow-sm ${
              product.isVisible 
                ? 'text-slate-400 hover:text-[#1A1F2E] hover:bg-slate-50 border-slate-200' 
                : 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-600 hover:text-white'
            }`}
            title={product.isVisible ? "Halt Sales" : "Resume Sales"}
          >
            {loading ? <RefreshCw size={20} className="animate-spin" /> : product.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button 
            onClick={() => setIsEditing(true)}
            className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-[#1A1F2E] hover:bg-slate-50 transition-all rounded-xl border border-slate-200 shadow-sm"
            title="Configure"
          >
            <Edit3 size={20} />
          </button>
        </div>
        <button 
          onClick={handleDelete}
          className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded-xl border border-slate-200 shadow-sm"
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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
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
      />
      
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl max-h-[90vh] bg-white shadow-2xl rounded-xl border border-slate-100 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 transition-colors">
          <div>
             <h2 className="text-3xl font-serif font-bold text-[#1A1F2E] tracking-tight">Configure Asset</h2>
             <p className="text-sm text-[#64748B] font-medium">Updating identity of {product.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-full transition-all text-[#64748B]"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Two Column Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <form className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left: Visual Identity */}
              <div className="space-y-8">
                <div className="space-y-3">
                   <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Asset Resource</label>
                   <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
                     {formData.imageUrl ? (
                       <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                       <div className="w-full h-full flex items-center justify-center text-slate-300">No Image Resource</div>
                     )}
                     <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button 
                          type="button" 
                          onClick={() => fileInputRef.current?.click()}
                          className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/30"
                        >
                          {uploading ? 'Processing...' : 'Modify Visual'}
                        </button>
                     </div>
                   </div>
                   <input 
                      value={formData.imageUrl}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none transition-all font-medium text-xs text-[#64748B] italic"
                      placeholder="or paste direct URL..."
                    />
                 </div>
                 
                 <div className="space-y-2">
                   <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Asset Nomenclature</label>
                   <input 
                     required
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] font-bold text-[#1A1F2E] text-lg transition-all"
                   />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Economic Rate (₱)</label>
                   <input 
                     required
                     type="number"
                     step="0.01"
                     value={formData.price}
                     onChange={e => setFormData({...formData, price: e.target.value})}
                     className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] text-[#1A1F2E] text-2xl font-black transition-all"
                   />
                 </div>
              </div>

              {/* Right: Technical Configuration */}
              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Deployment Segment</label>
                    <select 
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] font-bold text-[#1A1F2E] cursor-pointer appearance-none transition-all"
                    >
                      {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Extended Information</label>
                   <textarea 
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                     className="w-full p-5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-[#1A1F2E] font-medium text-[#1A1F2E] text-sm resize-none transition-all"
                     rows={3}
                     placeholder="Technical specifications and details..."
                   />
                 </div>

                 {/* Variations */}
                 <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-black text-[#64748B] ml-1">Activation Variations</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                       {customizationGroups.map(group => (
                         <button
                           key={group.id}
                           type="button"
                           onClick={() => toggleCustomizationGroup(group.id)}
                           className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                             formData.customizationGroupIds.includes(group.id)
                               ? 'bg-[#1A1F2E] border-[#1A1F2E] text-white shadow-sm'
                               : 'bg-white text-[#64748B] border-slate-200 hover:border-[#1A1F2E]'
                           }`}
                         >
                           {group.name}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
            
            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Material Composition</label>
                <button 
                  type="button" 
                  onClick={addIngredient}
                  className="text-[10px] font-black uppercase tracking-widest text-[#1A1F2E] hover:text-[#64748B] flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Add Ingredient
                </button>
              </div>
              <div className="space-y-3">
                {formData.ingredients.map((ing, idx) => (
                  <div key={`edit-ing-${ing.inventoryItemId}-${idx}`} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50 p-4 rounded-xl border border-slate-100 overflow-visible">
                    <SearchableSelect
                      options={inventory.map(item => ({ value: item.id, label: `${item.name} (${item.unit})` }))}
                      value={ing.inventoryItemId}
                      onChange={(val) => updateIngredient(idx, 'inventoryItemId', val)}
                      className="flex-1 w-full sm:w-auto font-bold text-sm"
                    />
                    <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-start">
                      <div className="flex items-center gap-2">
                         <input 
                           type="number"
                           step="0.01"
                           value={ing.quantityNeeded || ''}
                           onChange={e => updateIngredient(idx, 'quantityNeeded', parseFloat(e.target.value) || 0)}
                           className="w-24 bg-white border border-slate-200 rounded-lg px-3 py-2 text-center font-bold text-[#1A1F2E] outline-none focus:border-[#1A1F2E] transition-all"
                           placeholder="Qty"
                         />
                         <span className="text-[10px] font-bold text-slate-400 uppercase">
                           {inventory.find(inv => inv.id === ing.inventoryItemId)?.unit || 'Qty'}
                         </span>
                      </div>
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-white rounded-xl transition-all">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        {/* Sticky Footer */}
        <div className="p-8 border-t border-slate-100 bg-slate-50 sticky bottom-0 z-10 shadow-sm transition-colors">
           <div className="flex justify-between items-center gap-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#64748B] opacity-60 hidden md:block">ESC to discard • Ctrl+S to save</p>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 md:flex-none px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1F2E] transition-all font-sans"
                >
                  Discard
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={submitting || uploading}
                  className="flex-1 md:flex-none bg-[#1A1F2E] text-white px-12 py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50 min-w-[200px]"
                >
                  {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
                  <span className="text-xs font-black uppercase tracking-widest">{submitting ? 'Updating...' : 'Commit Changes'}</span>
                </button>
              </div>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center text-center transition-all hover:border-slate-300 group relative overflow-hidden">
    <div className="absolute top-0 right-0 w-24 h-24 bg-[#1A1F2E]/5 rounded-bl-full opacity-50 group-hover:scale-110 transition-transform duration-700" />
    <div className="p-6 bg-slate-50 rounded-xl mb-6 shadow-sm group-hover:scale-110 transition-transform border border-slate-100">
      <div className="text-[#1A1F2E]">
        {icon}
      </div>
    </div>
    <p className="text-[10px] font-black text-[#64748B] uppercase tracking-[0.3em] mb-4 transition-colors group-hover:text-[#1A1F2E]">{label}</p>
    <p className="text-5xl font-serif font-black text-[#1A1F2E] transition-colors tracking-tighter">{value}</p>
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col transition-colors"
      >
        <div className="p-8 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-serif font-bold text-[#1A1F2E] tracking-tight">{category ? 'Refine Category' : 'New Collection'}</h2>
            <p className="text-sm text-[#64748B] font-medium">Define a new segment for your menu.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-all text-[#64748B]">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] ml-1">Category Name</label>
            <input 
              required
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#1A1F2E] outline-none transition-all font-bold text-[#1A1F2E]"
              placeholder="e.g. Signature Lattes"
            />
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#64748B] hover:text-[#1A1F2E] transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#1A1F2E] text-white py-4 rounded-xl font-bold hover:bg-[#1A1F2E]/90 transition-all shadow-sm flex items-center justify-center gap-3 disabled:opacity-50"
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
