import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(name, email, password);
    
    if (result.success) {
      // Auto login after registration
      const loginResult = await login(email, password);
      setLoading(false);
      if (loginResult.success) {
        navigate('/repos');
      } else {
        setError('Registration successful, but login failed. Please try logging in.');
      }
    } else {
      setLoading(false);
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBD4] flex flex-col">
      <Navbar />
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Branding */}
          <div className="text-center mb-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-[#38240D] mb-2">
              CodebaseLM
            </h2>
            <p className="text-[#713600] text-lg">AI-Powered Codebase Intelligence</p>
          </div>

          {/* Register Card */}
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-[#38240D]/10">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#38240D] mb-2">Create Account</h1>
            <p className="text-[#713600] mb-6 sm:mb-8">Start understanding your codebase today</p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-[#38240D] mb-2">
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#FDFBD4] border-2 border-[#713600]/30 rounded-lg text-[#38240D] placeholder-[#713600]/50 focus:outline-none focus:ring-2 focus:ring-[#C05800] focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#38240D] mb-2">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#FDFBD4] border-2 border-[#713600]/30 rounded-lg text-[#38240D] placeholder-[#713600]/50 focus:outline-none focus:ring-2 focus:ring-[#C05800] focus:border-transparent transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#38240D] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-[#FDFBD4] border-2 border-[#713600]/30 rounded-lg text-[#38240D] placeholder-[#713600]/50 focus:outline-none focus:ring-2 focus:ring-[#C05800] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <p className="mt-1 text-xs text-[#713600]/70">Minimum 6 characters</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C05800] hover:bg-[#713600] text-[#FDFBD4] font-semibold py-3 px-4 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg text-lg mt-6"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#713600]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#C05800] hover:text-[#713600] font-semibold">
                Sign in
              </Link>
            </p>
          </div>

          {/* Additional Info */}
          <p className="mt-6 text-center text-xs text-[#713600]/70">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}
