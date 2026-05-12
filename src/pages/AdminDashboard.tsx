import React, { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../lib/api';
import { InventoryItem, Category, User, Role, CustomizationGroup, Product } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, BarChart3, TrendingUp, AlertTriangle, X, Coffee, Download, Users, Shield, Check, Settings2, Trash2, Edit3, Link as LinkIcon, Info, ImagePlus, Upload, History, ArrowRight, Search, KeyRound, RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
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
  
  // Restrict access
  useEffect(() => {
    if (user?.role !== 'ADMIN' && (activeTab === 'users' || activeTab === 'variations' || activeTab === 'audit-logs')) {
      setActiveTab('overview');
    }
  }, [activeTab, user]);
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
    <div className="space-y-8">
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
              <h3 className="text-lg font-bold">
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
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 -mx-4 md:-mx-8 lg:-mx-12 px-4 md:px-8 lg:px-12 py-5 mb-8">
        {/* Row 1: Title and Actions */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6">
          <div className="space-y-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Management Suite</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Business analytics and resource planning.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button 
              onClick={handleExportOrders}
              disabled={isExporting}
              className="flex-1 md:flex-none border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm group"
            >
              {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} className="group-hover:-translate-y-0.5 transition-transform" />}
              <span>Export CSV</span>
            </button>
            {activeTab === 'users' ? (
               <button 
                  onClick={() => setIsUserModalOpen(true)}
                  className="flex-1 md:flex-none bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 text-sm"
                >
                  <Plus size={20} />
                  <span>New User</span>
                </button>
            ) : (
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-none bg-brand-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={20} />
                <span>New Product</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Scrollable Tab Navigation */}
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pr-12">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
              ...(user?.role === 'ADMIN' ? [{ id: 'users', label: 'User Roles', icon: <Users size={18} /> }] : []),
              { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
              { id: 'categories', label: 'Categories', icon: <Settings2 size={18} /> },
              { id: 'products', label: 'Products', icon: <Coffee size={18} /> },
              ...(user?.role !== 'STAFF' ? [
                { id: 'variations', label: 'Variations', icon: <Settings2 size={18} /> },
                { id: 'audit-logs', label: 'Audit Logs', icon: <History size={18} /> }
              ] : [])
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 flex-shrink-0 border-b-2 ${
                  activeTab === tab.id 
                    ? 'bg-brand-primary/10 dark:bg-slate-800/50 text-brand-primary dark:text-brand-secondary border-brand-primary dark:border-brand-secondary' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
          {/* Fading Mask */}
          <div className="absolute right-0 top-0 bottom-1 w-16 bg-gradient-to-l from-slate-50 dark:from-slate-950 via-slate-50/80 dark:via-slate-950/80 to-transparent pointer-events-none" />
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
                <h2 className="text-xl font-serif font-bold text-brand-primary">Low Stock Alerts</h2>
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
                        isCritical ? 'bg-red-100 border-brand-danger shadow-brand-danger/10' : 'bg-red-50 border-brand-danger/20'
                      }`}
                    >
                      <div className="absolute top-0 right-0 p-2 bg-brand-danger/10 group-hover:bg-brand-danger/20 transition-colors">
                        <AlertTriangle size={14} className={isCritical ? 'text-brand-danger animate-pulse' : 'text-brand-danger'} />
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? 'text-brand-danger' : 'text-brand-danger/60'}`}>
                        {isCritical ? 'Critical Alert' : 'Reorder Level'}
                      </p>
                      <h3 className="font-bold text-brand-primary truncate">{item.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-2xl font-black ${isCritical ? 'text-brand-danger animate-pulse' : 'text-brand-danger'}`}>
                          {item.stockLevel}
                        </span>
                        <span className="text-xs text-text-muted font-bold">{item.unit} left</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const amount = prompt(`Enter amount to add for ${item.name}:`, '10');
                          if (amount && !isNaN(parseInt(amount))) {
                            handleRestock(item.id, parseInt(amount));
                          }
                        }}
                        className={`mt-2 text-[10px] text-white px-3 py-1.5 rounded-lg font-bold transition-colors w-full ${
                          isCritical ? 'bg-brand-primary hover:bg-brand-danger shadow-lg shadow-brand-danger/20' : 'bg-brand-danger hover:bg-brand-primary'
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
            <section className="bg-white dark:bg-slate-900/50 p-10 rounded-[32px] coffee-shadow border border-border-subtle dark:border-slate-800 transition-colors backdrop-blur-sm">
              <h2 className="text-2xl font-serif font-bold text-brand-primary dark:text-slate-100 mb-10 flex items-center gap-3">
                <BarChart3 size={24} className="text-brand-secondary dark:text-brand-primary drop-shadow-[0_0_8px_rgba(200,169,126,0.3)]" />
                Product Demand
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.topProducts || []}>
                    <XAxis dataKey="name" fontSize={12} axisLine={false} tickLine={false} tick={{ fill: '#8A7A6E' }} />
                    <YAxis hide />
                    <Tooltip 
                      cursor={{ fill: '#F7F1E9', opacity: 0.1 }}
                      contentStyle={{ 
                        borderRadius: '20px', 
                        border: 'none', 
                        boxShadow: '0 10px 30px rgba(0,0,0,0.2)', 
                        padding: '15px',
                        backgroundColor: '#0f172a',
                        color: '#f8fafc'
                      }}
                      itemStyle={{ color: '#f8fafc' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Bar dataKey="quantity" fill="#C8A97E" radius={[12, 12, 0, 0]} barSize={40}>
                      {stats?.topProducts?.map((_entry:any, index:number) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#4A3728' : '#C8A97E'} className="dark:fill-brand-secondary" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Inventory Table */}
            <section className="bg-white dark:bg-slate-900/50 p-10 rounded-[32px] coffee-shadow border border-border-subtle dark:border-slate-800 transition-colors backdrop-blur-sm">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-2xl font-serif font-bold text-brand-primary dark:text-slate-100 flex items-center gap-3">
                  <Package size={24} className="text-brand-secondary dark:text-brand-primary drop-shadow-[0_0_8px_rgba(200,169,126,0.3)]" />
                  Stock Inventory
                </h2>
                <button 
                  onClick={() => setIsInventoryModalOpen(true)}
                  className="w-10 h-10 bg-brand-primary/10 dark:bg-slate-800 text-brand-primary dark:text-brand-secondary rounded-xl flex items-center justify-center hover:bg-brand-primary hover:text-white transition-all shadow-sm"
                >
                  <Plus size={20} />
                </button>
              </div>
              <div className="space-y-5 max-h-[400px] overflow-y-auto pr-4 no-scrollbar border-t dark:border-slate-800 pt-5">
                {inventory.map((item) => {
                  const isLow = item.stockLevel <= item.lowStockThreshold;
                  const isCritical = item.stockLevel === 0;
                  return (
                    <div 
                      key={item.id} 
                      className={`flex flex-col gap-2 p-4 rounded-2xl transition-all border ${
                        isCritical
                          ? 'bg-red-100 dark:bg-red-900/20 border-brand-danger shadow-md ring-2 ring-brand-danger/20'
                          : isLow 
                            ? 'bg-red-50 dark:bg-red-900/10 border-brand-danger/30 shadow-sm ring-1 ring-brand-danger/10' 
                            : 'bg-bg-sidebar/30 dark:bg-slate-800/30 border-transparent dark:border-slate-800/50 hover:bg-bg-sidebar/50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex justify-between items-center text-sm">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-brand-danger animate-pulse' : 'bg-brand-secondary'}`}></div>
                          <span className="font-bold text-brand-primary dark:text-slate-200">{item.name}</span>
                          {isLow && (
                            <span className={`text-[8px] text-white px-2 py-0.5 rounded-md font-black uppercase tracking-tight shadow-sm ${isCritical ? 'bg-brand-danger animate-pulse' : 'bg-brand-danger'}`}>
                              {isCritical ? 'Depleted' : 'Low Stock'}
                            </span>
                          )}
                        </div>
                        <span className={`font-bold ${isLow ? 'text-brand-danger dark:text-brand-danger' : 'text-text-muted dark:text-slate-400'}`}>
                          {item.stockLevel} {item.unit}
                        </span>
                      </div>
                      <div className="w-full bg-border-subtle/50 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
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
        <section className="bg-white dark:bg-slate-900/50 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors backdrop-blur-sm">
          <div className="p-8 md:p-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-brand-primary dark:text-brand-secondary shadow-sm">
                 <Users size={24} />
               </div>
               <div>
                  <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Personnel Directory</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Assign roles and manage system permissions.</p>
               </div>
            </div>
            <div className="hidden md:flex bg-brand-secondary/10 dark:bg-brand-secondary/5 px-4 py-2 rounded-xl items-center gap-2 border border-brand-secondary/20">
              <Shield size={16} className="text-brand-secondary" />
              <span className="text-xs font-bold text-brand-secondary uppercase tracking-widest">{users.length} Active Users</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">User Profile</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Current Role</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {users.map((u) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={u.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all group"
                  >
                    <td className="px-10 py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-brand-primary/5 dark:bg-brand-secondary/10 flex items-center justify-center text-brand-primary dark:text-brand-secondary font-serif font-bold text-xl border border-brand-primary/10 dark:border-brand-secondary/20">
                          {u.name?.[0] || u.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight">{u.name || 'Anonymous'}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-8">
                       <RoleBadge role={u.role} loading={updatingUserId === u.id} />
                    </td>
                    <td className="px-10 py-8 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => setEditingUser(u)}
                          className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => setUserToDelete(u)}
                          className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-brand-danger transition-all bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md disabled:opacity-30"
                          disabled={u.id === user?.id}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'inventory' ? (
        <section className="space-y-8">
           <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Stock Inventory</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Monitor and replenish raw materials and ingredients.</p>
            </div>
            <button 
              onClick={() => setIsInventoryModalOpen(true)}
              className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-3"
            >
              <Plus size={20} />
              <span>Add Stock Item</span>
            </button>
          </div>
 
          <div className="bg-white dark:bg-slate-900/50 p-6 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-primary dark:text-brand-secondary" size={24} />
              <input 
                type="text"
                placeholder="Search inventory items..."
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                className="w-full pl-16 pr-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 shadow-inner rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-brand-primary dark:focus:border-brand-secondary focus:shadow-md outline-none transition-all font-bold text-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredInventory.map((item) => {
              const isLow = item.stockLevel <= item.lowStockThreshold;
              const isCritical = item.stockLevel === 0;
              return (
                <motion.div 
                  layout
                  key={item.id}
                  className={`bg-white dark:bg-slate-900/50 p-8 rounded-[32px] coffee-shadow border transition-all backdrop-blur-sm ${
                    isCritical 
                      ? 'border-brand-danger bg-red-50/50 dark:bg-red-950/20 shadow-lg shadow-brand-danger/10' 
                      : isLow 
                        ? 'border-brand-danger/30 bg-orange-50/30' 
                        : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{item.name}</h3>
                        {isLow && (
                          <span className={`text-[10px] text-white px-2 py-0.5 rounded-lg font-black uppercase tracking-tight shadow-sm ${isCritical ? 'bg-brand-danger animate-pulse' : 'bg-brand-danger'}`}>
                            {isCritical ? 'Depleted' : 'Low Stock'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">Last update: {new Date(item.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isLow ? 'bg-brand-danger/10 text-brand-danger' : 'bg-brand-primary/5 dark:bg-slate-800 text-brand-primary dark:text-brand-secondary border dark:border-slate-700 shadow-sm'}`}>
                      <Package size={24} />
                    </div>
                  </div>
 
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Current Stock</p>
                        <p className={`text-4xl font-serif font-black ${isLow ? 'text-brand-danger' : 'text-slate-900 dark:text-slate-100'}`}>
                          {item.stockLevel}
                          <span className="text-sm font-sans font-bold ml-1 opacity-40 uppercase">{item.unit}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1">Threshold</p>
                        <p className="font-bold text-brand-primary dark:text-brand-secondary">{item.lowStockThreshold} {item.unit}</p>
                      </div>
                    </div>
 
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (item.stockLevel / (item.lowStockThreshold * 3)) * 100)}%` }}
                        className={`h-full transition-colors ${
                          isCritical ? 'bg-brand-danger' : isLow ? 'bg-brand-danger/80' : 'bg-brand-secondary dark:bg-brand-secondary'
                        }`}
                      />
                    </div>
 
                    <div className="pt-4 flex gap-2">
                      <button 
                        onClick={() => {
                          const amount = prompt(`Enter amount to add for ${item.name}:`, '10');
                          if (amount && !isNaN(parseInt(amount))) {
                            handleRestock(item.id, parseInt(amount));
                          }
                        }}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                          isLow 
                            ? 'bg-brand-danger text-white hover:bg-brand-primary shadow-lg shadow-brand-danger/20' 
                            : 'bg-brand-primary/10 dark:bg-slate-800 text-brand-primary dark:text-slate-200 border border-transparent dark:border-slate-700 hover:bg-brand-primary hover:text-white'
                        }`}
                      >
                        <RefreshCw size={14} className={isLow ? 'animate-spin' : ''} />
                        Restock
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            
            {filteredInventory.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <div className="flex flex-col items-center gap-3 text-text-muted">
                  <Search size={48} className="opacity-10" />
                  <p className="font-bold text-lg">No inventory items found</p>
                  <p className="text-sm">Try adjusting your search query.</p>
                  {inventorySearch && (
                    <button 
                      onClick={() => setInventorySearch('')}
                      className="mt-4 text-xs font-black uppercase tracking-widest text-brand-primary hover:underline"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      ) : activeTab === 'products' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Product Inventory</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manage your coffee masterpieces and snack offerings.</p>
            </div>
          </div>
 
          <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900/50 p-6 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 backdrop-blur-sm">
            <div className="flex-1 relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-primary dark:text-brand-secondary" size={24} />
              <input 
                type="text"
                placeholder="Search by product name or description..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-16 pr-6 py-4 bg-slate-50/50 dark:bg-slate-950/50 shadow-inner rounded-2xl border-2 border-slate-200 dark:border-slate-800 focus:border-brand-primary dark:focus:border-brand-secondary focus:shadow-md outline-none transition-all font-bold text-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="relative">
              <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={18} />
              <select 
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="w-full md:w-64 pl-12 pr-10 py-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-brand-primary dark:focus:border-brand-secondary outline-none transition-all font-medium appearance-none text-slate-900 dark:text-slate-100 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <option value="all">All Categories ({allProducts.length})</option>
                {categoryList.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat._count?.products || 0})
                  </option>
                ))}
              </select>
            </div>
          </div>
 
          <div className="bg-white dark:bg-slate-900/50 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-sans">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Product</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Category</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Details</th>
                    <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Price</th>
                    <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredProducts.map((product) => (
                    <ProductRow 
                      key={product.id} 
                      product={product} 
                      categoryList={categoryList} 
                      customizationGroups={customizations}
                      inventory={inventory}
                      onSuccess={fetchData} 
                    />
                  ))}
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-10 py-20 text-center">
                        <div className="flex flex-col items-center gap-3 text-text-muted">
                          <Search size={48} className="opacity-10" />
                          <p className="font-bold text-lg">No products found</p>
                          <p className="text-sm">Try adjusting your search or category filter.</p>
                          {(productSearch || productCategoryFilter !== 'all') && (
                            <button 
                              onClick={() => { setProductSearch(''); setProductCategoryFilter('all'); }}
                              className="mt-4 text-xs font-black uppercase tracking-widest text-brand-primary hover:underline"
                            >
                              Clear all filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      ) : activeTab === 'categories' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-brand-primary">Menu Taxonomy</h2>
              <p className="text-text-muted">Organize your products into accessible categories.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCategory(null);
                setIsCategoryModalOpen(true);
              }}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-brand-primary/10 hover:bg-brand-secondary transition-all"
            >
              <Plus size={20} />
              New Category
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors backdrop-blur-sm">
            <table className="w-full border-collapse font-sans">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Category name</th>
                  <th className="px-10 py-6 text-left text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Linked Products</th>
                  <th className="px-10 py-6 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {categoryList.map((cat) => (
                    <CategoryRow 
                      key={cat.id} 
                      category={cat} 
                      onSuccess={fetchData} 
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === 'variations' ? (
        <section className="space-y-8">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Customization Groups</h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Manage milk types, sweetness, and other drink variations.</p>
            </div>
            <button 
              onClick={() => {
                setEditingCustomizationGroup(null);
                setIsCustomizationModalOpen(true);
              }}
              className="bg-brand-primary text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-brand-primary/20 hover:bg-brand-secondary transition-all"
            >
              <Plus size={20} />
              New Group
            </button>
          </div>
 
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-sans">
            {customizations.map((group) => (
              <motion.div 
                key={group.id}
                layout
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[32px] p-8 coffee-shadow space-y-8 backdrop-blur-sm transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{group.name}</h3>
                      {group.required && (
                        <span className="bg-brand-secondary/10 dark:bg-brand-secondary/5 text-brand-secondary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-brand-secondary/20">Required</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold flex items-center gap-2">
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
                     className="p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 shadow-sm"
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
                      className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-slate-500 dark:text-slate-400 hover:text-brand-danger transition-all border border-transparent hover:border-brand-danger/20 shadow-sm"
                    >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-3">Choices</p>
                   <div className="grid grid-cols-1 gap-3">
                      {group.choices.map((choice: any) => (
                        <ChoiceRow key={choice.id} choice={choice} onSuccess={fetchData} />
                      ))}
                      <NewChoiceButton groupId={group.id} onSuccess={fetchData} />
                   </div>
                </div>
 
                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Associated Products</p>
                   <div className="flex flex-wrap gap-2">
                      {group.products.map((p: any) => (
                        <span key={p.productId} className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 hover:bg-white dark:hover:bg-slate-900 transition-all cursor-default">
                           {p.product.name}
                        </span>
                      ))}
                      {group.products.length === 0 && <span className="text-xs italic text-slate-400 dark:text-slate-500 px-1">Universal across all items</span>}
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      ) : activeTab === 'audit-logs' ? (
        <section className="space-y-8">
          <div className="space-y-1">
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">Security Audit Logs</h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Track administrative actions and role transitions.</p>
          </div>

          <div className="bg-white dark:bg-slate-900/50 rounded-[32px] coffee-shadow border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors backdrop-blur-sm">
            <table className="w-full border-collapse font-sans text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40">
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Timestamp</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Administrator</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Action</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Target User</th>
                  <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {auditLogs.map((log) => (
                  <motion.tr 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={log.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all font-sans"
                  >
                    <td className="px-10 py-6 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-10 py-6 font-bold text-slate-900 dark:text-slate-100">
                      {log.adminName}
                    </td>
                    <td className="px-10 py-6">
                      <span className="bg-brand-primary/5 dark:bg-brand-secondary/10 text-brand-primary dark:text-brand-secondary px-3 py-1 rounded-lg font-black text-[9px] uppercase tracking-widest border border-brand-primary/10 dark:border-brand-secondary/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-10 py-6 font-medium">
                      {log.targetName}
                    </td>
                    <td className="px-10 py-6">
                      <div className="font-bold text-[10px] text-text-muted uppercase tracking-widest whitespace-nowrap">
                        {log.action === 'ROLE_CHANGE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">{log.details.oldRole}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">{log.details.newRole}</span>
                          </div>
                        ) : log.action === 'STOCK_UPDATE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">{log.details.oldLevel}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">{log.details.newLevel}</span>
                             <span className="ml-1 opacity-40 lowercase">({inventory.find(i => i.id === log.targetId)?.unit})</span>
                          </div>
                        ) : log.action === 'PRICE_UPDATE' ? (
                          <div className="flex items-center gap-2">
                             <span className="opacity-60">₱{log.details.oldPrice}</span>
                             <ArrowRight size={12} className="text-brand-secondary" />
                             <span className="text-brand-primary">₱{log.details.newPrice}</span>
                          </div>
                        ) : (
                          <span className="opacity-60 italic">Administrative Action Recorded</span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="p-20 flex flex-col items-center justify-center opacity-40">
                <Shield size={48} className="mb-4" />
                <p className="font-bold">No security events recorded yet.</p>
              </div>
            )}
            {auditPagination && auditPagination.currentPage < auditPagination.pages && (
              <div className="p-8 border-t border-border-subtle bg-bg-sidebar/5 flex justify-center">
                <button
                  onClick={loadMoreAuditLogs}
                  disabled={auditLoading}
                  className="px-8 py-3 bg-white border border-border-subtle rounded-2xl text-sm font-bold text-brand-primary hover:bg-bg-sidebar transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
                >
                  {auditLoading ? <Coffee size={18} className="animate-spin" /> : <History size={18} />}
                  {auditLoading ? 'Loading logs...' : 'Load older events'}
                </button>
              </div>
            )}
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
        {isInventoryModalOpen && (
          <CreateInventoryModal 
            onClose={() => setIsInventoryModalOpen(false)} 
            onSuccess={() => {
              setIsInventoryModalOpen(false);
              fetchData();
            }}
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
      <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border border-brand-primary/30 dark:border-brand-secondary/30 rounded-2xl shadow-lg ring-4 ring-brand-primary/5">
        <input 
          value={editData.name}
          onChange={e => setEditData({...editData, name: e.target.value})}
          className="flex-1 bg-transparent text-sm font-bold font-sans outline-none text-slate-900 dark:text-slate-100"
        />
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] font-black text-slate-400">₱</span>
          <input 
            type="number"
            value={editData.priceModifier}
            onChange={e => setEditData({...editData, priceModifier: Number(e.target.value)})}
            className="w-14 bg-transparent text-[12px] font-bold text-brand-primary dark:text-brand-secondary outline-none"
          />
        </div>
        <button onClick={handleUpdate} disabled={loading} className="p-2 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-all shadow-sm">
          {loading ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
        </button>
        <button onClick={() => setIsEditing(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={16} /></button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-4 rounded-[20px] border border-slate-200 dark:border-slate-800/50 group hover:border-brand-primary/30 dark:hover:border-brand-secondary/30 transition-all hover:shadow-md">
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-brand-primary dark:bg-brand-secondary shadow-[0_0_8px_rgba(200,169,126,0.4)]" />
        <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">{choice.name}</span>
        {choice.priceModifier !== 0 && (
          <span className="text-[11px] text-brand-primary dark:text-brand-secondary font-black drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(200,169,126,0.3)] bg-brand-primary/5 dark:bg-brand-secondary/5 px-2 py-0.5 rounded-lg border border-brand-primary/10 dark:border-brand-secondary/10">
            {choice.priceModifier > 0 ? '+' : ''}₱{Number(choice.priceModifier).toFixed(2)}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
        <button 
          onClick={() => setIsEditing(true)}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 rounded-xl transition-all shadow-sm"
        >
          <Edit3 size={14} />
        </button>
        <button 
          onClick={handleDelete}
          className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-brand-danger rounded-xl transition-all shadow-sm"
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
        className="w-full py-3.5 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400 hover:border-brand-primary dark:hover:border-brand-secondary hover:text-brand-primary dark:hover:text-brand-secondary hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-3"
      >
        <Plus size={16} />
        Add Choice
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-[24px] space-y-4 shadow-inner">
      <div className="space-y-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Choice Name</label>
        <input 
          autoFocus
          placeholder="e.g. Soy Milk"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-brand-primary/20 focus:border-brand-primary text-slate-900 dark:text-slate-100 font-bold"
        />
      </div>
      <div className="space-y-1">
         <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Price Modifier (₱)</label>
         <input 
           type="number"
           placeholder="0.00"
           value={priceModifier}
           onChange={e => setPriceModifier(Number(e.target.value))}
           className="w-full p-3.5 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 ring-brand-primary/20 focus:border-brand-primary text-brand-primary dark:text-brand-secondary font-black"
         />
      </div>
      <div className="flex gap-3 pt-2">
         <button type="submit" className="flex-1 py-3 bg-brand-primary text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary transition-all">Establish</button>
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
}> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: 'pcs',
    stockLevel: 0,
    lowStockThreshold: 5
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiClient.post('/inventory', {
        ...formData,
        stockLevel: Number(formData.stockLevel),
        lowStockThreshold: Number(formData.lowStockThreshold)
      });
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create inventory item:', err);
      alert(err.message || 'Failed to create inventory item.');
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
        className="bg-white dark:bg-slate-900 rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col transition-colors"
      >
        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center transition-colors">
          <div>
            <h2 className="text-3xl font-serif font-bold text-slate-900 dark:text-slate-100 tracking-tight">New Resource</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Add a new item to the supply chain.</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-all text-slate-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 transition-colors">
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Resource Name</label>
            <input 
              required
              autoFocus
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
              placeholder="e.g. Arabica Beans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Initial Stock</label>
              <input 
                required
                type="number"
                value={formData.stockLevel}
                onChange={e => setFormData({...formData, stockLevel: Number(e.target.value)})}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100 font-sans"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Unit</label>
              <select 
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
                className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100 appearance-none shadow-sm"
              >
                <option value="kg">kg (kilograms)</option>
                <option value="L">L (liters)</option>
                <option value="pcs">pcs (pieces)</option>
                <option value="g">g (grams)</option>
                <option value="ml">ml (milliliters)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">Low Stock Threshold</label>
            <input 
              required
              type="number"
              value={formData.lowStockThreshold}
              onChange={e => setFormData({...formData, lowStockThreshold: Number(e.target.value)})}
              className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100 font-sans"
            />
            <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 italic px-1">We'll alert you when stock drops below this level.</p>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? <RefreshCw size={20} className="animate-spin" /> : <Plus size={20} />}
              <span className="text-xs font-black uppercase tracking-widest">{submitting ? 'Adding...' : 'Add to Inventory'}</span>
            </button>
          </div>
        </form>
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
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 dark:bg-slate-950/50 p-3 overflow-visible rounded-2xl border border-slate-200 dark:border-slate-800/40">
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

const CategoryRow: React.FC<{ 
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

  if (isEditing) {
    return (
      <tr className="bg-brand-primary/5 dark:bg-slate-900/50 transition-colors">
        <td className="px-10 py-8">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-brand-primary dark:text-brand-secondary border border-slate-200 dark:border-slate-700 shadow-sm transition-all">
                <Package size={24} />
              </div>
              <input 
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUpdate()}
                className="font-bold text-slate-900 dark:text-slate-100 text-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 outline-none focus:ring-2 ring-brand-primary/20 transition-all w-full max-w-sm"
              />
           </div>
        </td>
        <td className="px-10 py-8">
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-50 italic">Saving name changes...</span>
        </td>
        <td className="px-10 py-8 text-right">
          <div className="flex justify-end gap-3">
            <button 
              onClick={handleUpdate}
              disabled={loading}
              className="p-3 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
            </button>
            <button 
              onClick={() => { setIsEditing(false); setName(category.name); }}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <motion.tr 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-50 dark:border-slate-900/50 transition-all group"
    >
      <td className="px-10 py-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-brand-primary dark:text-brand-secondary border border-transparent dark:border-slate-700 transition-all group-hover:scale-105">
            <Package size={24} />
          </div>
          <span className="font-bold text-slate-900 dark:text-slate-100 text-lg tracking-tight transition-colors">{category.name}</span>
        </div>
      </td>
      <td className="px-10 py-8">
        <span className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all">
          {category._count?.products || 0} Products
        </span>
      </td>
      <td className="px-10 py-8 text-right">
        <div className="flex justify-end gap-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => setIsEditing(true)}
            className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-brand-primary dark:hover:text-slate-100 rounded-xl transition-all"
          >
            <Edit3 size={20} />
          </button>
          <button 
            onClick={() => onDelete(category.id)}
            disabled={(category._count?.products || 0) > 0}
            className={`p-2.5 rounded-xl transition-all ${
              (category._count?.products || 0) > 0 
                ? 'opacity-20 cursor-not-allowed' 
                : 'hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-brand-danger'
            }`}
            title={(category._count?.products || 0) > 0 ? "Cannot delete: Associated products exist" : "Delete Category"}
          >
            <Trash2 size={20} />
          </button>
        </div>
      </td>
    </motion.tr>
  );
};

const ProductRow: React.FC<{ 
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

  const addIngredient = () => {
    if (inventory.length === 0) return;
    setEditData(prev => ({
      ...prev,
      ingredients: [...prev.ingredients, { inventoryItemId: inventory[0].id, quantityNeeded: 1 }]
    }));
  };

  const removeIngredient = (idx: number) => {
    setEditData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const updateIngredient = (idx: number, field: string, value: any) => {
    setEditData(prev => ({
      ...prev,
      ingredients: prev.ingredients.map((ing, i) => i === idx ? { ...ing, [field]: value } : ing)
    }));
  };

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

  const toggleCustomizationGroup = (groupId: string) => {
    setEditData(prev => ({
      ...prev,
      customizationGroupIds: prev.customizationGroupIds.includes(groupId)
        ? prev.customizationGroupIds.filter(id => id !== groupId)
        : [...prev.customizationGroupIds, groupId]
    }));
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

  if (isEditing) {
    return (
      <tr className="bg-brand-primary/5 dark:bg-slate-900/50 transition-colors">
        <td className="px-10 py-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex-shrink-0 bg-white dark:bg-slate-950 transition-colors">
                {editData.imageUrl ? (
                   <img src={editData.imageUrl} className="w-full h-full object-cover" />
                ) : (
                   <div className="w-full h-full flex items-center justify-center text-slate-400"><ImagePlus size={24} /></div>
                )}
             </div>
             <div className="space-y-2 flex-1">
                <input 
                  value={editData.name}
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-brand-primary/20 transition-all"
                  placeholder="Name"
                />
                <input 
                  value={editData.description}
                  onChange={e => setEditData({...editData, description: e.target.value})}
                  className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-500 dark:text-slate-400 outline-none focus:ring-2 ring-brand-primary/20 transition-all font-medium"
                  placeholder="Description"
                />
                <input 
                  value={editData.imageUrl}
                  onChange={e => setEditData({...editData, imageUrl: e.target.value})}
                  className="w-full p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] italic text-slate-400 outline-none focus:ring-2 ring-brand-primary/20 transition-all"
                  placeholder="Image URL"
                />
             </div>
          </div>
        </td>
        <td className="px-10 py-6">
          <select 
            value={editData.categoryId}
            onChange={e => setEditData({...editData, categoryId: e.target.value})}
            className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-brand-primary/20 transition-all"
          >
            {categoryList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </td>
        <td className="px-10 py-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Variations</label>
              <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                {customizationGroups.map(group => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => toggleCustomizationGroup(group.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.1em] border transition-all ${
                      editData.customizationGroupIds.includes(group.id)
                        ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20'
                        : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-brand-primary'
                    }`}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center max-w-xs">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Ingredients</label>
                <button 
                  type="button" 
                  onClick={addIngredient}
                  className="text-[10px] font-black uppercase tracking-[0.15em] text-brand-primary hover:text-brand-secondary flex items-center gap-1 transition-colors"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="space-y-2 min-w-[240px]">
                {editData.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative z-10">
                    <SearchableSelect
                      options={inventory.map(item => ({ value: item.id, label: `${item.name} (${item.unit})` }))}
                      value={ing.inventoryItemId}
                      onChange={(val) => updateIngredient(idx, 'inventoryItemId', val)}
                      className="flex-1 min-w-[120px] text-[10px] font-bold"
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <input 
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={ing.quantityNeeded || ''}
                        onChange={e => {
                          const val = isNaN(parseFloat(e.target.value)) ? 0 : parseFloat(e.target.value);
                          updateIngredient(idx, 'quantityNeeded', val);
                        }}
                        className={`w-12 bg-slate-50 dark:bg-slate-900 ${ing.quantityNeeded <= 0 ? 'border-red-500 bg-red-50 dark:bg-red-950/20' : 'border-transparent'} border rounded-lg px-1.5 py-1 text-center text-[10px] font-black outline-none focus:ring-1 ring-brand-primary/30 transition-all text-slate-900 dark:text-slate-100`}
                        placeholder="Qty"
                      />
                      <button type="button" onClick={() => removeIngredient(idx)} className="text-brand-danger p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
                {editData.ingredients.length === 0 && (
                  <div className="text-[10px] italic text-slate-400 text-center py-3 bg-slate-50/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No ingredients added
                  </div>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-10 py-6">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₱</span>
            <input 
              type="number"
              value={editData.price}
              onChange={e => setEditData({...editData, price: e.target.value})}
              className="w-24 pl-7 pr-3 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-brand-primary/20 transition-all"
            />
          </div>
        </td>
        <td className="px-10 py-6 text-right">
          <div className="flex justify-end gap-3">
            <button 
              onClick={handleUpdate}
              disabled={loading}
              className="p-3 bg-brand-primary text-white rounded-xl hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20"
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
            </button>
            <button 
              onClick={() => setIsEditing(false)}
              className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <X size={20} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-b border-slate-50 dark:border-slate-900/50 transition-all group ${isExpanded ? 'bg-slate-100/50 dark:bg-slate-900/50' : ''}`}>
        <td className="px-10 py-6">
          <div className="flex items-center gap-4">
             <div className="w-16 h-16 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex-shrink-0 shadow-sm transition-transform group-hover:scale-105">
                <img src={product.imageUrl || ''} alt={product.name} className="w-full h-full object-cover" />
             </div>
             <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className={`text-lg font-bold tracking-tight transition-colors ${product.isVisible ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600 line-through'}`}>{product.name}</p>
                  {!product.isVisible && (
                    <span className="text-[10px] bg-amber-100/50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-black uppercase tracking-[0.15em] flex items-center gap-1 border border-amber-200/50 dark:border-amber-900/30">
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1 max-w-[250px] font-medium transition-colors">{product.description}</p>
             </div>
          </div>
        </td>
        <td className="px-10 py-6">
          <span className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50 shadow-sm transition-all whitespace-nowrap">
            {categoryList.find(c => c.id === product.categoryId)?.name || 'Unknown'}
          </span>
        </td>
        <td className="px-10 py-6">
          <div className="space-y-3">
            {product.customizations && product.customizations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {product.customizations.map((c: any) => {
                  const group = customizationGroups.find(g => g.id === c.groupId);
                  return (
                    <span key={c.groupId} className="px-2.5 py-1 rounded-lg bg-brand-primary/10 dark:bg-slate-800 text-brand-primary dark:text-brand-secondary text-[10px] font-black uppercase tracking-widest border border-brand-primary/20 dark:border-slate-700/50">
                      {group?.name || 'Variation'}
                    </span>
                  )
                })}
              </div>
            )}
            {product.ingredients && product.ingredients.length > 0 && (
              <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-1">
                {product.ingredients.length} Ingredient{product.ingredients.length !== 1 ? 's' : ''}
              </span>
            )}
            {(!product.customizations || product.customizations.length === 0) && (!product.ingredients || product.ingredients.length === 0) && (
              <span className="text-[10px] text-slate-400 dark:text-slate-600 italic">No associated data</span>
            )}
          </div>
        </td>
        <td className="px-10 py-6">
          <span className="text-xl font-serif font-bold text-brand-primary dark:text-slate-100 transition-colors">₱{Number(product.price).toFixed(2)}</span>
        </td>
        <td className="px-10 py-6 text-right">
          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-0 translate-x-2">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className={`p-2.5 rounded-xl transition-all ${isExpanded ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              title="View Ingredients"
            >
              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            <button 
              onClick={handleToggleVisibility}
              disabled={loading}
              className={`p-2.5 rounded-xl transition-all ${
                product.isVisible 
                  ? 'text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800' 
                  : 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-500 hover:text-white dark:hover:bg-amber-500'
              }`}
              title={product.isVisible ? "Hide Product" : "Show Product"}
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : product.isVisible ? <Eye size={20} /> : <EyeOff size={20} />}
            </button>
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
            >
              <Edit3 size={20} />
            </button>
            <button 
              onClick={handleDelete}
              disabled={loading}
              className="p-2.5 text-slate-400 hover:text-brand-danger hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-all"
            >
              {loading ? <RefreshCw size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5} className="px-10 py-10 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 transition-colors">
            <div className="max-w-5xl mx-auto">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-6 flex items-center gap-3">
                <Package size={14} /> Recipe Architecture
              </h4>
              {product.ingredients && product.ingredients.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {product.ingredients.map((ing: any) => {
                    const item = inventory.find(i => i.id === ing.inventoryItemId);
                    return (
                      <div key={ing.id} className="flex items-center gap-5 bg-white dark:bg-slate-950 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-brand-primary/30 transition-all group/ing">
                        <div className="w-14 h-14 rounded-2xl bg-brand-primary/5 dark:bg-slate-900/80 flex items-center justify-center text-brand-primary dark:text-brand-secondary border border-transparent dark:border-slate-800 transition-all group-hover/ing:scale-110">
                          <Package size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100 transition-colors uppercase text-[11px] tracking-widest">{item?.name || 'Unknown Item'}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-serif font-black text-brand-primary dark:text-brand-secondary">{ing.quantityNeeded}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item?.unit || 'units'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-950 p-12 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 text-center transition-colors">
                  <p className="text-base font-medium text-slate-400 dark:text-slate-600 italic">No ingredients architecture linked to this asset.</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="bg-white dark:bg-slate-900/50 p-10 rounded-[40px] shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center transition-all hover:border-brand-primary/30 group backdrop-blur-sm">
    <div className="p-5 bg-slate-50 dark:bg-slate-800/80 rounded-3xl mb-6 shadow-sm group-hover:scale-110 transition-transform dark:shadow-[0_0_15px_rgba(200,169,120,0.05)] border border-transparent dark:border-slate-700/50">
      <div className="text-brand-primary dark:text-brand-secondary transition-all dark:drop-shadow-[0_0_8px_rgba(200,169,126,0.3)]">
        {icon}
      </div>
    </div>
    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-3 transition-colors">{label}</p>
    <p className="text-4xl font-serif font-bold text-slate-900 dark:text-slate-100 transition-colors tracking-tight">{value}</p>
  </div>
);

const RoleBadge = ({ role, loading }: { role: Role, loading?: boolean }) => {
  const styles = {
    ADMIN: 'bg-brand-primary/10 dark:bg-slate-800 text-brand-primary dark:text-brand-secondary border-brand-primary/20 dark:border-brand-secondary/20 shadow-brand-primary/5',
    STAFF: 'bg-brand-secondary/10 dark:bg-slate-800/80 text-brand-secondary dark:text-brand-secondary/80 border-brand-secondary/20 dark:border-brand-secondary/10',
    CUSTOMER: 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-primary/10 dark:bg-slate-950/40 backdrop-blur-md"
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
              className="w-full p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl focus:ring-2 ring-brand-primary/20 outline-none transition-all font-bold text-slate-900 dark:text-slate-100"
              placeholder="e.g. Signature Lattes"
            />
          </div>

          <div className="pt-4 flex gap-4 transition-colors">
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 hover:text-brand-primary dark:hover:text-slate-100 transition-all font-sans"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 bg-brand-primary text-white py-4 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 disabled:opacity-50"
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
