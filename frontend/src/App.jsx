import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CategoryPage from './pages/CategoryPage';
import Receipts from './pages/Receipts';

// Protected route — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Layout with sidebar
function AppLayout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <AppLayout><Dashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/customers" element={
        <ProtectedRoute>
          <AppLayout><Customers /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/insurance" element={
        <ProtectedRoute>
          <AppLayout><CategoryPage category="insurance" /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/permit" element={
        <ProtectedRoute>
          <AppLayout><CategoryPage category="permit" /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/fitness-puc" element={
        <ProtectedRoute>
          <AppLayout><CategoryPage category="fitness_puc" /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/license" element={
        <ProtectedRoute>
          <AppLayout><CategoryPage category="license" /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/receipts" element={
        <ProtectedRoute>
          <AppLayout><Receipts /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1e293b',
              color: '#fff',
              fontSize: '14px',
              borderRadius: '10px',
              padding: '12px 18px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
