import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { NetworkProvider } from './contexts/NetworkContext';
import { ToastProvider } from './components/ui/Toast';
import { NetworkStatus } from './components/ui/NetworkStatus';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Invoices } from './pages/Invoices';
import { Clients } from './pages/Clients';
import { Receipts } from './pages/Receipts';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Quotations } from './pages/Quotations';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <NetworkProvider>
            <AuthProvider>
              <Router>
                <div className="min-h-screen bg-gray-100 dark:bg-[#181f2a]">
                  <NetworkStatus />
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <Layout />
                        </ProtectedRoute>
                      }
                    >
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="invoices" element={<Invoices />} />
                      <Route path="quotations" element={<Quotations />} />
                      <Route path="clients" element={<Clients />} />
                      <Route path="receipts" element={<Receipts />} />
                      <Route path="reports" element={
                        <ProtectedRoute requiredRole="admin">
                          <Reports />
                        </ProtectedRoute>
                      } />
                      <Route path="settings" element={
                        <ProtectedRoute requiredRole="admin">
                          <Settings />
                        </ProtectedRoute>
                      } />
                    </Route>
                  </Routes>
                </div>
              </Router>
            </AuthProvider>
          </NetworkProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;