import React from 'react';
import { Coffee, Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="bg-bg-sidebar border-t border-border-subtle pt-24 pb-12 px-8 md:px-20 -mx-4 md:-mx-10 mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
        {/* Brand Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white">
              <Coffee size={24} />
            </div>
            <h2 className="font-serif text-2xl font-bold text-brand-primary">Parking Latte</h2>
          </div>
          <p className="text-text-muted text-sm leading-relaxed">
            Crafting artisan coffee experiences since 2024. Your daily dose of morning magic, just a few clicks away.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-white dark:bg-bg-base border border-border-subtle rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all">
              <Instagram size={18} />
            </a>
            <a href="#" className="w-10 h-10 bg-white dark:bg-bg-base border border-border-subtle rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all">
              <Facebook size={18} />
            </a>
            <a href="#" className="w-10 h-10 bg-white dark:bg-bg-base border border-border-subtle rounded-full flex items-center justify-center text-brand-primary hover:bg-brand-primary hover:text-white transition-all">
              <Twitter size={18} />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <h3 className="font-bold text-brand-primary uppercase tracking-widest text-xs">Explore</h3>
          <ul className="space-y-4">
            <li><Link to="/" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Our Menu</Link></li>
            <li><Link to="/orders" className="text-text-muted text-sm hover:text-brand-primary transition-colors">My Orders</Link></li>
            <li><Link to="/profile" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Account Settings</Link></li>
            <li><Link to="/register" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Join the Club</Link></li>
          </ul>
        </div>

        {/* Information */}
        <div className="space-y-6">
          <h3 className="font-bold text-brand-primary uppercase tracking-widest text-xs">Information</h3>
          <ul className="space-y-4">
            <li><a href="#" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Terms of Service</a></li>
            <li><a href="#" className="text-text-muted text-sm hover:text-brand-primary transition-colors">Shipping Info</a></li>
            <li><a href="#" className="text-text-muted text-sm hover:text-brand-primary transition-colors">FAQ</a></li>
          </ul>
        </div>

        {/* Contact Info */}
        <div className="space-y-6">
          <h3 className="font-bold text-brand-primary uppercase tracking-widest text-xs">Cozy Up</h3>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-brand-secondary mt-0.5" />
              <span className="text-text-muted text-sm leading-relaxed">
                123 Barista Lane, Espresso District, QC 1100
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone size={18} className="text-brand-secondary" />
              <span className="text-text-muted text-sm">+63 900 123 4567</span>
            </li>
            <li className="flex items-center gap-3">
              <Mail size={18} className="text-brand-secondary" />
              <span className="text-text-muted text-sm">hello@parkinglatte.com</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-border-subtle/50 flex flex-col md:flex-row justify-between items-center gap-6">
        <p className="text-text-muted text-xs font-medium">
          © {new Date().getFullYear()} Parking Latte. Hand-roasted for you.
        </p>
        <p className="text-text-muted text-xs font-medium italic">
          Designed with ❤️ for coffee lovers everywhere.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
