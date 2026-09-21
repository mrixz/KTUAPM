import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Certificates } from './pages/Certificates';
import { Upload } from './pages/Upload';
import { CertificateDetail } from './pages/CertificateDetail';
import { Analytics } from './pages/Analytics';
import { Opportunities } from './pages/Opportunities';
import { Profile } from './pages/Profile';
import { Evaluation } from './pages/Evaluation';

export default function App() {
  return (
    <Router>
      <NotificationProvider>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            {/* Protected Student Routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/certificates" element={<Certificates />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/certificates/upload" element={<Navigate to="/upload" replace />} />
                <Route path="/certificates/:id" element={<CertificateDetail />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/opportunities" element={<Opportunities />} />
                <Route path="/evaluation" element={<Evaluation />} />
                <Route path="/profile" element={<Profile />} />
              </Route>
            </Route>

            {/* Default Catch-all */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </Router>
  );
}
