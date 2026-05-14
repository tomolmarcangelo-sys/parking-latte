import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CartProvider } from './context/CartContext';
import { OrderProvider } from './context/OrderContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Toaster } from 'react-hot-toast';
import { Coffee, Loader2 } from 'lucide-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ScrollToTop from './components/ScrollToTop';

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bg-base">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Coffee size={24} className="text-brand-primary animate-pulse" />
          </div>
        </div>
        <p className="mt-4 font-serif italic text-brand-primary animate-pulse">Brewing your experience...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  
  return <>{children}</>;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <OrderProvider>
            <CartProvider>
            <Toaster position="bottom-right" reverseOrder={false} />
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                
                <Route path="staff" element={
                  <ProtectedRoute roles={['STAFF', 'ADMIN']}>
                    <StaffDashboard />
                  </ProtectedRoute>
                } />
                
                <Route path="admin" element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </BrowserRouter>
            </CartProvider>
          </OrderProvider>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
