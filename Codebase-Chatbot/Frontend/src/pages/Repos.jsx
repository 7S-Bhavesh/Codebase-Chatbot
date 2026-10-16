import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { repoAPI } from '../services/api';
import Navbar from '../components/Navbar';

export default function Repos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState('');
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.email) {
      loadRepos();
    }
  }, [user]);

  const loadRepos = async () => {
    try {
      const data = await repoAPI.getAllRepos(user.email);
      setRepos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load repos:', error);
      setRepos([]);
    }
  };

  const handleAddRepo = async (e) => {
    e.preventDefault();
    setError('');
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }
    setLoading(true);
    try {
      await repoAPI.saveRepo(user.email, repoUrl.trim());
      setRepoUrl('');
      await loadRepos();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to add repository');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveRepo = async (repoId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this repository?')) {
      return;
    }
    setLoading(true);
    try {
      await repoAPI.deleteRepo(repoId);
      await loadRepos();
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to remove repository');
    } finally {
      setLoading(false);
    }
  };

  const handleRepoClick = (repoId) => {
    navigate(`/chat/${repoId}`);
  };

  const getRepoName = (repoUrl) => {
    if (!repoUrl) return 'Repository';
    const parts = repoUrl.split('/');
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Repository';
  };

  const getRepoOwner = (repoUrl) => {
    if (!repoUrl) return '';
    const parts = repoUrl.split('/');
    return parts[parts.length - 2] || '';
  };

  return (
    <div className="min-h-screen bg-[#FDFBD4] flex flex-col">
      <Navbar />

      <div className="flex-1 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#38240D] mb-3">
              Your Repositories
            </h1>
            <p className="text-[#713600] text-lg sm:text-xl">
              Manage and chat with your GitHub repositories
            </p>
          </div>

          {/* Add Repo Form */}
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12 border-2 border-[#38240D]/10">
            <h2 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-4 sm:mb-6">
              Add New Repository
            </h2>
            <form onSubmit={handleAddRepo} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="flex-1 px-4 py-3 sm:py-4 bg-[#FDFBD4] border-2 border-[#713600]/30 rounded-lg text-[#38240D] placeholder-[#713600]/50 focus:outline-none focus:ring-2 focus:ring-[#C05800] focus:border-transparent transition-all text-sm sm:text-base"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 sm:px-8 py-3 sm:py-4 bg-[#C05800] hover:bg-[#713600] text-[#FDFBD4] font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg whitespace-nowrap text-sm sm:text-base"
                >
                  {loading ? 'Adding...' : 'Add Repository'}
                </button>
              </div>
              {error && (
                <div className="p-3 sm:p-4 bg-red-50 border-2 border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* Repos Grid */}
          {repos.length === 0 ? (
            <div className="text-center py-16 sm:py-20">
              <div className="text-[#713600]/50 mb-6">
                <svg className="mx-auto h-16 w-16 sm:h-20 sm:w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-2">No repositories yet</h3>
              <p className="text-[#713600] text-sm sm:text-base">Add your first repository to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {repos.map((repo) => (
                <div
                  key={repo.repo_id}
                  onClick={() => handleRepoClick(repo.repo_id)}
                  className="bg-white rounded-xl border-2 border-[#38240D]/10 p-6 hover:border-[#C05800] hover:shadow-xl cursor-pointer transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full"
                  style={{ aspectRatio: '1', minHeight: '200px' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[#713600] mb-2 uppercase tracking-wide truncate">
                        {getRepoOwner(repo.repo_url)}
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-[#38240D] mb-1 truncate" title={getRepoName(repo.repo_url)}>
                        {getRepoName(repo.repo_url)}
                      </h3>
                    </div>
                    <button
                      onClick={(e) => handleRemoveRepo(repo.repo_id, e)}
                      className="text-[#713600]/50 hover:text-red-500 transition-colors p-1 flex-shrink-0 ml-2"
                      title="Remove repository"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <p className="text-xs sm:text-sm text-[#713600]/70 mb-4 flex-1 line-clamp-2 overflow-hidden" title={repo.repo_url}>
                    {repo.repo_url}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs sm:text-sm text-[#C05800] font-semibold pt-4 border-t border-[#38240D]/10 mt-auto">
                    <span>Open Chat</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
