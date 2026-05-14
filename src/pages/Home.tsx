import React, { useEffect, useState, useRef } from 'react';
import { apiClient } from '../lib/api';
import { Category, Product, CustomizationChoice } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Plus, Coffee, X, Check, ArrowRight, Shield, Zap, MapPin, Star, Laptop, CreditCard, ShoppingBag, Cookie, Trash2, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ProductModal } from '../components/ProductModal';

const ImageWithFallback: React.FC<{ src?: string; alt: string }> = ({ src, alt }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fallbackImage = 'https://images.unsplash.com/photo-1541167760496-162955ed8a9f?w=600&q=80';

  return (
    <div className="w-full h-full relative">
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-bg-sidebar animate-pulse flex items-center justify-center">
          <Coffee size={24} className="text-brand-secondary opacity-20" />
        </div>
      )}
      <img 
        src={hasError || !src ? fallbackImage : src} 
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'} group-hover:scale-110`}
        referrerPolicy="no-referrer"
      />
    </div>
  );
};


/* Custom Steam Animation */
const SteamEffect = () => (
  <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none z-20">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        animate={{ 
          y: [-10, -40], 
          opacity: [0, 0.4, 0], 
          scale: [0.8, 1.2],
          x: [0, i % 2 === 0 ? 5 : -5, 0]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          delay: i * 0.6,
          ease: "easeInOut"
        }}
        className="w-1.5 h-6 bg-white/40 blur-sm rounded-full"
      />
    ))}
  </div>
);

const Home: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const { addToCart } = useCart();
  const menuRef = useRef<HTMLElement>(null);
  
  const filterScrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const checkFilterScroll = () => {
    if (filterScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = filterScrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(checkFilterScroll, 100);
    window.addEventListener('resize', checkFilterScroll);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkFilterScroll);
    };
  }, [categories]);

  const scrollFilter = (direction: 'left' | 'right') => {
    if (filterScrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      filterScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);

  const fetchMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get('/menu');
      if (Array.isArray(data)) {
        setCategories(data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      console.error('Failed to fetch menu:', err);
      setError('Could not reach the coffee server. Please check your connection.');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const scrollToMenu = () => {
    menuRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const dynamicFilters = React.useMemo(() => {
    const baseFilters = [
      { name: 'All', icon: <Zap size={14} /> }
    ];

    // Extract unique categories from fetched data
    const categoryFilters = categories.map(cat => {
      const norm = normalize(cat.name);
      let icon = <Coffee size={14} />;
      if (norm.includes('non')) icon = <span className="text-sm">🍓</span>;
      else if (norm.includes('milk')) icon = <span className="text-sm">🥛</span>;
      else if (norm.includes('juice') || norm.includes('fruit')) icon = <span className="text-sm">🍹</span>;
      else if (norm.includes('tea')) icon = <span className="text-sm">🍃</span>;
      else if (norm.includes('dessert') || norm.includes('cake') || norm.includes('pastr')) icon = <Cookie size={14} />;
      
      return { name: cat.name, icon };
    });

    // Add extra behavioral tags
    const extraTags = [
      { name: 'Sweet', icon: <Star size={14} /> },
      { name: 'Fruity', icon: <Zap size={14} /> },
      { name: 'Chocolatey', icon: <Cookie size={14} /> }
    ];

    // Filter out duplicates if category names overlap with hardcoded ones
    const seen = new Set(['all']);
    const result = [...baseFilters];

    [...categoryFilters, ...extraTags].forEach(f => {
      const norm = normalize(f.name);
      if (!seen.has(norm)) {
        seen.add(norm);
        result.push(f);
      }
    });

    return result;
  }, [categories]);

  const filteredCategories = categories.map(cat => ({
    ...cat,
    products: cat.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const categoryName = cat.name.toLowerCase();
      const productName = p.name.toLowerCase();
      const productDesc = (p.description || '').toLowerCase();

      // Normalized names for precise matching
      const normActiveFilter = normalize(activeFilter);
      const normCategoryName = normalize(cat.name);

      let matchesFilter = true;
      if (activeFilter === 'All') {
        matchesFilter = true;
      } else if (normActiveFilter === normCategoryName) {
        // Precise category match
        matchesFilter = true;
      } else if (activeFilter === 'Coffee') {
        // Primary 'Coffee' filter logic - more inclusive matching
        const isNonCoffee = normCategoryName.includes('non') || categoryName.includes('milk') || categoryName.includes('juice');
        matchesFilter = !isNonCoffee && (categoryName.includes('coffee') || categoryName.includes('brew') || categoryName.includes('espresso') || productName.includes('espresso') || productName.includes('latte'));
      } else if (activeFilter === 'Non-Coffee') {
        // Primary 'Non-Coffee' filter logic - more inclusive matching
        matchesFilter = normCategoryName.includes('non') || categoryName.includes('milk') || categoryName.includes('juice') || categoryName.includes('tea') || categoryName.includes('soda') || categoryName.includes('refresher');
      } else if (activeFilter === 'Sweet') {
        matchesFilter = productDesc.includes('sweet') || productDesc.includes('caramel') || productName.includes('caramel');
      } else if (activeFilter === 'Fruity') {
        matchesFilter = productDesc.includes('berry') || productDesc.includes('mango') || productDesc.includes('strawberry') || productName.includes('strawberry') || productName.includes('mango');
      } else if (activeFilter === 'Chocolatey') {
        matchesFilter = productDesc.includes('choco') || productDesc.includes('oreo') || productName.includes('choco') || productName.includes('oreo');
      } else {
        // Fallback precise match
        matchesFilter = normCategoryName === normActiveFilter;
      }
      
      return matchesSearch && matchesFilter;
    })
  })).filter(cat => cat.products.length > 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl px-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-96 bg-bg-sidebar animate-pulse rounded-[40px] border border-border-subtle"></div>
        ))}
      </div>
      <p className="font-serif text-lg font-medium text-brand-primary animate-pulse italic">Arriving at your table...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8 px-4 text-center">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-24 h-24 bg-red-50 rounded-[32px] flex items-center justify-center text-brand-danger shadow-inner"
      >
        <Coffee size={48} className="opacity-40" />
      </motion.div>
      <div className="space-y-4">
        <h2 className="text-3xl font-serif font-bold text-brand-primary">Grounds for Concern</h2>
        <p className="text-text-muted max-w-md mx-auto italic">"We're having trouble connecting to our brewing station. The menu couldn't be prepared."</p>
        <div className="flex items-center justify-center gap-2 text-brand-danger bg-red-50/50 px-4 py-2 rounded-full w-fit mx-auto">
          <Zap size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">{error}</span>
        </div>
      </div>
      <button 
        onClick={fetchMenu}
        className="bg-brand-primary text-white px-12 py-6 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-2xl shadow-brand-primary/20 flex items-center gap-3 group"
      >
        <Zap size={18} className="group-hover:rotate-12 transition-transform" />
        Retry Brewing
      </button>
    </div>
  );

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center text-center px-4 overflow-hidden -mx-4 md:-mx-12 lg:-mx-20 mb-24">
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="absolute inset-0 z-0"
        >
          <div className="absolute inset-0 bg-brand-primary/40 z-10"></div>
          <img 
            src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670" 
            alt="Cozy Coffee Shop" 
            className="w-full h-full object-cover"
          />
        </motion.div>

        <div className="relative z-20 max-w-4xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <span className="inline-block px-4 py-2 bg-brand-secondary/20 backdrop-blur-md border border-white/20 rounded-full text-white text-xs font-bold uppercase tracking-[0.3em] mb-6">
              Parking Latte Coffee Ordering System
            </span>
            <h1 className="text-6xl md:text-8xl font-serif font-bold text-white leading-tight mb-6">
              Coffee is always <br />
              <span className="text-brand-secondary italic">a good idea.</span>
            </h1>
            <p className="text-white/80 text-xl md:text-2xl font-medium leading-relaxed max-w-2xl mx-auto">
              Skip the line. Order your perfect cup in seconds with our premium digital companion.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-8"
          >
            <button 
              onClick={scrollToMenu}
              className="bg-brand-primary text-white px-12 py-6 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-2xl flex items-center justify-center gap-3 group"
            >
              Order Now
              <ArrowRight className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={scrollToMenu}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-12 py-6 rounded-2xl font-bold hover:bg-white/20 transition-all"
            >
              View Menu
            </button>
          </motion.div>
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" ref={menuRef} className="py-24 space-y-12">
        <header className="text-center space-y-4 max-w-2xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block p-4 bg-brand-primary/5 rounded-3xl mb-2"
          >
            <Coffee size={32} className="text-brand-primary" />
          </motion.div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand-secondary">Premium Experience</h2>
          <h3 className="text-5xl font-serif font-bold text-brand-primary">Our Menu</h3>
          <p className="text-text-muted italic">"Crafted drinks, made just for you. From our bean house to your cup."</p>
        </header>

        {/* Search and Filters */}
        <div className="sticky top-20 z-40 bg-bg-base/90 backdrop-blur-xl -mx-4 px-4 py-4 md:py-6 border-b border-border-subtle/30 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            <div className="max-w-2xl mx-auto relative group">
              <input 
                type="text" 
                placeholder="Find your favorite drink..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-bg-sidebar border border-border-subtle p-4 md:p-6 pr-14 md:pr-16 rounded-2xl md:rounded-[32px] outline-none focus:border-brand-primary transition-all font-medium text-brand-primary shadow-sm group-hover:shadow-lg focus:shadow-xl text-sm md:text-base"
              />
              <div className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-brand-primary/5 text-brand-primary rounded-xl">
                {searchQuery ? <X size={18} className="cursor-pointer" onClick={() => { setSearchQuery(''); toast.success('Search cleared'); }} /> : <Zap size={18} />}
              </div>
            </div>

            <div className="relative flex items-center w-full group/filter">
              <AnimatePresence>
                {showLeftArrow && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-0 top-0 bottom-0 flex items-center justify-start z-10 w-24 bg-gradient-to-r from-bg-base via-bg-base/90 to-transparent pointer-events-none pb-2 md:pb-0"
                  >
                    <button 
                      onClick={() => scrollFilter('left')} 
                      className="p-1.5 md:p-2 bg-white dark:bg-bg-sidebar border border-border-subtle rounded-full ml-1 md:ml-2 shadow-md text-brand-primary pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div 
                ref={filterScrollRef}
                onScroll={checkFilterScroll}
                className="flex overflow-x-auto whitespace-nowrap gap-2 md:gap-3 pb-2 md:pb-0 no-scrollbar justify-start px-2 w-full scroll-smooth"
              >
                {dynamicFilters.map(f => (
                  <button
                    key={f.name}
                    onClick={() => {
                      setActiveFilter(f.name);
                      if (f.name !== 'All') toast.success(`Filtered by ${f.name}`, { duration: 1500, icon: f.icon });
                    }}
                    className={`px-5 md:px-8 py-2 md:py-3 rounded-full md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-1.5 md:gap-2 flex-shrink-0 ${
                      activeFilter === f.name 
                      ? 'bg-slate-900 border-slate-900 text-white dark:bg-white dark:border-white dark:text-slate-900 shadow-md group border-2' 
                      : 'bg-white dark:bg-bg-sidebar border-border-subtle text-text-muted hover:border-text-muted hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <span className="scale-90 md:scale-100">{f.icon}</span>
                    {f.name}
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showRightArrow && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute right-0 top-0 bottom-0 flex items-center justify-end z-10 w-24 bg-gradient-to-l from-bg-base via-bg-base/90 to-transparent pointer-events-none pb-2 md:pb-0"
                  >
                    <button 
                      onClick={() => scrollFilter('right')} 
                      className="p-1.5 md:p-2 bg-white dark:bg-bg-sidebar border border-border-subtle rounded-full mr-1 md:mr-2 shadow-md text-brand-primary pointer-events-auto hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {filteredCategories.length > 0 ? (
          <div className="space-y-32 pt-12">
            {filteredCategories.map((cat) => (
              <div key={cat.id} className="space-y-12">
                <div className="flex items-center gap-6">
                  <h4 className="text-3xl font-serif font-bold text-brand-primary flex items-center gap-4">
                    <div className="w-1.5 h-8 bg-brand-secondary rounded-full"></div>
                    {cat.name}
                  </h4>
                  <div className="flex-1 h-[1px] bg-border-subtle/50"></div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {cat.products.map((product) => {
                    const isBestSeller = ['Spanish Latte', 'Strawberry Latte', 'Oreo Coffee'].includes(product.name);
                    const categoryLabel = cat.name.toLowerCase().includes('non') ? 'non-coffee' : 'coffee';
                    
                    return (
                      <motion.div 
                        key={product.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                        className="bg-white dark:bg-bg-sidebar rounded-[40px] p-8 coffee-shadow border border-border-subtle flex flex-col group relative"
                      >
                        {isBestSeller && (
                          <div className="absolute -top-3 -right-3 z-30 bg-brand-secondary text-brand-primary px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 border-2 border-white">
                            <Star size={10} fill="currentColor" />
                            Best Seller
                          </div>
                        )}
                        
                        <div className="w-full aspect-[4/5] bg-bg-sidebar rounded-[32px] mb-8 overflow-hidden relative border border-border-subtle/50 shadow-inner group-hover:shadow-brand-primary/5 transition-all">
                          {isBestSeller && product.name.toLowerCase().includes('coffee') && <SteamEffect />}
                          <ImageWithFallback src={product.imageUrl} alt={product.name} />
                          <div className="absolute inset-0 bg-brand-primary/0 group-hover:bg-brand-primary/10 transition-colors pointer-events-none"></div>
                          
                          {/* Stock & Category Indicators */}
                          <div className="absolute bottom-4 left-4 flex flex-col gap-2">
                            <span className="bg-white/80 dark:bg-bg-base/80 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-bold text-brand-primary flex items-center gap-1.5 shadow-sm border border-border-subtle/50 w-fit">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                              Available
                            </span>
                            <span className="bg-brand-primary/10 backdrop-blur-sm px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-brand-primary border border-brand-primary/20 w-fit">
                              {categoryLabel}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-4 mb-8">
                          <div className="flex justify-between items-start gap-4">
                            <h3 className="text-2xl font-serif font-bold text-brand-primary leading-tight group-hover:text-brand-secondary transition-colors">{product.name}</h3>
                            <div className="bg-brand-primary text-white px-2.5 py-1.5 rounded-xl flex flex-col items-center justify-center min-w-[56px] shadow-lg">
                              <span className="text-[8px] font-black uppercase tracking-tighter opacity-70">Only</span>
                              <span className="text-sm font-bold">₱{Number(product.price).toFixed(0)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-text-muted leading-relaxed line-clamp-2 italic font-medium opacity-80 group-hover:opacity-100 transition-opacity">
                            {product.description || "A masterfully crafted beverage with premium extracts."}
                          </p>
                        </div>

                        <div className="mt-auto flex gap-3">
                          <button 
                            onClick={() => {
                              if (product.customizationGroups && product.customizationGroups.length > 0) {
                                setCustomizingProduct(product);
                              } else {
                                addToCart(product);
                                toast.success(`${product.name} added to cart!`, {
                                  icon: '☕',
                                  style: {
                                    borderRadius: '16px',
                                    background: '#2D1B14',
                                    color: '#FFF',
                                  },
                                });
                              }
                            }}
                            className="flex-1 bg-brand-primary text-white py-5 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-xl shadow-brand-primary/10 flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-xs"
                          >
                            <Plus size={16} />
                            <span>Add to Cart</span>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-32 space-y-6">
            <div className="w-24 h-24 bg-bg-sidebar rounded-full flex items-center justify-center mx-auto shadow-inner text-brand-secondary opacity-30">
              <Coffee size={48} />
            </div>
            <p className="text-text-muted font-serif text-xl italic">"No matching brew found in our archives."</p>
            <button 
              onClick={() => { 
                setSearchQuery(''); 
                setActiveFilter('All'); 
                toast.success('Filters reset');
              }}
              className="text-brand-primary font-bold underline underline-offset-4 hover:text-brand-secondary"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section id="about" className="py-24 bg-brand-primary text-white -mx-4 md:-mx-12 lg:-mx-20 px-8 md:px-32 relative overflow-hidden rounded-[64px] mb-24">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>
        
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-8">
            <header className="space-y-4">
              <span className="text-brand-secondary text-xs font-black uppercase tracking-[0.3em]">Parking Latte Origins</span>
              <h3 className="text-4xl md:text-6xl font-serif font-bold leading-tight">Every cup, <br /> a <span className="text-brand-secondary">soulful</span> experience.</h3>
            </header>
            <p className="text-white/60 text-lg leading-relaxed max-w-md">
              We specialize in small-batch roasts and unique infusions that bridge the gap between traditional craft and modern convenience.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8">
              {[
                { icon: <Zap />, title: "Live Tracking", desc: "Watch your latte go from brew to box in real-time." },
                { icon: <Shield />, title: "Secure Pay", desc: "Encrypted transactions for a worry-free checkout." },
                { icon: <Star />, title: "Member Rewards", desc: "Earn points with every sip. Join the inner circle." },
                { icon: <MapPin />, title: "Convenience", desc: "Located precisely where you need us most." }
              ].map((feat, idx) => (
                <div key={idx} className="space-y-3">
                  <div className="text-brand-secondary">{feat.icon}</div>
                  <h4 className="font-bold">{feat.title}</h4>
                  <p className="text-xs text-white/40 leading-relaxed">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="relative aspect-square">
            <div className="absolute inset-0 border-2 border-dashed border-white/10 rounded-full animate-[spin_60s_linear_infinite]"></div>
            <div className="absolute inset-10 rounded-full overflow-hidden border-8 border-brand-primary shadow-2xl relative z-10">
              <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670" alt="Latte Art" className="w-full h-full object-cover grayscale-50 group-hover:grayscale-0 transition-all duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 max-w-5xl mx-auto space-y-16">
        <div className="text-center space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Words from the Bar</h2>
          <h3 className="text-4xl md:text-5xl font-serif font-bold text-brand-primary">Lover's Corner</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {[
            { 
              name: "Elena Rossi", role: "Daily Lover", 
              text: "The Spanish Latte is simply unparalleled. It has that creamy silkiness that you only find in high-end Tokyo boutiques.",
              img: "https://i.pravatar.cc/150?u=elena"
            },
            { 
              name: "Marcus Chen", role: "Commuter", 
              text: "The web ordering is so smooth. I place my order at the stoplight and it's perfect every time I arrive.",
              img: "https://i.pravatar.cc/150?u=marcus"
            }
          ].map((t, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ scale: 1.02 }}
              className="bg-bg-sidebar p-12 rounded-[48px] border border-border-subtle relative group shadow-sm hover:shadow-xl transition-all"
            >
              <div className="absolute top-0 right-12 w-12 h-16 bg-brand-secondary rounded-b-3xl flex items-center justify-center text-brand-primary shadow-lg">
                <Star size={20} fill="currentColor" />
              </div>
              <p className="text-lg font-serif italic text-brand-primary leading-relaxed mb-10">"{t.text}"</p>
              <div className="flex items-center gap-4">
                <img src={t.img} alt={t.name} className="w-14 h-14 rounded-full border-2 border-brand-secondary shadow-lg" />
                <div>
                  <h4 className="font-bold text-brand-primary">{t.name}</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 text-center space-y-12 bg-bg-sidebar border border-border-subtle rounded-[64px] mb-24 coffee-shadow">
        <div className="space-y-4">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-brand-secondary">Parking Latte Experience</h2>
          <h3 className="text-5xl md:text-7xl font-serif font-bold text-brand-primary leading-tight">Craving Coffee? <br /> <span className="text-brand-secondary italic">Get Started Now.</span></h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={scrollToMenu}
            className="bg-brand-primary text-white px-12 py-6 rounded-2xl font-bold hover:bg-brand-secondary transition-all shadow-2xl shadow-brand-primary/20 flex items-center gap-3"
          >
            Order Your Coffee
            <ArrowRight size={20} />
          </button>
        </div>
      </section>

      <AnimatePresence>
        {customizingProduct && (
          <ProductModal 
            product={customizingProduct}
            onClose={() => setCustomizingProduct(null)}
            onAdd={(customization, choices) => {
              addToCart(customizingProduct, customization, choices);
              setCustomizingProduct(null);
              toast.success(`${customizingProduct.name} added with customizations!`, {
                icon: '✨',
                style: {
                  borderRadius: '16px',
                  background: '#2D1B14',
                  color: '#FFF',
                },
              });
            }}
          />
        )}
      </AnimatePresence>
      
      {/* Background Steam Particles (Optional enhancement) */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-10 dark:opacity-20">
         <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-brand-primary rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-1/4 right-1/4 w-32 h-32 bg-brand-secondary rounded-full blur-[100px] animate-pulse delay-700"></div>
      </div>
    </div>
  );
};

export default Home;
