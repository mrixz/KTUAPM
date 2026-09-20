import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Automatically close mobile menu whenever navigation occurs
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-container">
      {/* Mobile Drawer Backdrop Overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(5, 8, 16, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 90,
            animation: 'fadeIn 0.2s ease'
          }}
          aria-hidden="true"
        />
      )}

      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="main-content">
        <Navbar onToggleMenu={() => setMobileMenuOpen((prev) => !prev)} mobileMenuOpen={mobileMenuOpen} />
        <main className="page-wrapper">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

