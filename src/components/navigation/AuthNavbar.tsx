import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Coffee } from 'lucide-react';
import { motion } from 'motion/react';

const AuthNavbar: React.FC = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-bg-sidebar/80 backdrop-blur-md border-b border-border-subtle/30 px-4 py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <motion.button
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-text-muted hover:text-brand-primary hover:bg-brand-primary/5 transition-all group"
          aria-label="Go back to home"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold hidden sm:inline">Back to Home</span>
        </motion.button>

        <Link 
          to="/" 
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Parking Latte Home"
        >
          <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
            <Coffee size={24} strokeWidth={2} />
          </div>
          <span className="font-serif font-bold text-xl text-brand-primary tracking-tight">Parking Latte</span>
        </Link>

        {/* Empty div for balance */}
        <div className="w-10 sm:w-28 hidden sm:block"></div>
      </div>
    </nav>
  );
};

export default AuthNavbar;
