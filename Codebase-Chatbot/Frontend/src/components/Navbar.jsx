import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const bgColor = isAuthPage ? 'bg-[#FDFBD4]' : 'bg-transparent';

  const linkClass = (path) => {
    const isActive = location.pathname === path;
    return `text-[#38240D] hover:text-[#C05800] font-medium transition-colors ${isActive ? 'text-[#C05800]' : ''}`;
  };

  return (
    <nav className={`${bgColor} border-b border-[#38240D]/10 relative z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link to="/" className="text-[#38240D] text-xl sm:text-2xl md:text-3xl font-bold tracking-tight hover:text-[#C05800] transition-colors flex-shrink-0">
            CodebaseLM
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {!isAuthenticated ? (
              <>
                <Link to="/about" className={linkClass('/about')}>
                  About
                </Link>
                <Link to="/testimonials" className={linkClass('/testimonials')}>
                  Testimonials
                </Link>
                <Link
                  to="/login"
                  className="px-4 lg:px-6 py-2 text-[#713600] hover:text-[#C05800] font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-4 lg:px-6 py-2 bg-[#C05800] text-[#FDFBD4] font-semibold rounded-lg hover:bg-[#713600] transition-all shadow-md"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <span className="text-[#713600] text-sm hidden lg:inline">Hello, {user?.name}</span>
                <Link
                  to="/repos"
                  className="px-4 lg:px-6 py-2 bg-[#713600] text-[#FDFBD4] font-medium rounded-lg hover:bg-[#C05800] transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="px-4 lg:px-6 py-2 bg-[#38240D] text-[#FDFBD4] font-medium rounded-lg hover:bg-[#713600] transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#38240D] hover:text-[#C05800] focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-[#38240D]/10">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/about"
                  className="block py-2 text-[#38240D] hover:text-[#C05800] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="/testimonials"
                  className="block py-2 text-[#38240D] hover:text-[#C05800] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Testimonials
                </Link>
                <Link
                  to="/login"
                  className="block py-2 text-[#713600] hover:text-[#C05800] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="block w-full text-center px-6 py-3 bg-[#C05800] text-[#FDFBD4] font-semibold rounded-lg hover:bg-[#713600] transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <div className="py-2 text-[#713600] text-sm">Hello, {user?.name}</div>
                <Link
                  to="/repos"
                  className="block w-full text-center px-6 py-3 bg-[#713600] text-[#FDFBD4] font-medium rounded-lg hover:bg-[#C05800] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="block w-full text-center px-6 py-3 bg-[#38240D] text-[#FDFBD4] font-medium rounded-lg hover:bg-[#713600] transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
