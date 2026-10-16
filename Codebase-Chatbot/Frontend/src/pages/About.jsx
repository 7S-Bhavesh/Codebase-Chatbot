import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function About() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#FDFBD4]">
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#38240D] mb-6">
            About CodebaseLM
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-[#713600] leading-relaxed">
            Transforming how developers understand and interact with their codebases through the power of AI
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-[#38240D] mb-6">
                Our Mission
              </h2>
              <p className="text-[#713600] text-base sm:text-lg leading-relaxed mb-4">
                We believe that understanding code shouldn't be a barrier to productivity. CodebaseLM leverages cutting-edge AI technology to make codebases more accessible and comprehensible.
              </p>
              <p className="text-[#713600] text-base sm:text-lg leading-relaxed">
                Whether you're onboarding to a new project, debugging complex systems, or exploring unfamiliar code, our platform provides instant, intelligent answers to your questions.
              </p>
            </div>
            <div className="bg-[#FDFBD4] rounded-2xl p-8 sm:p-12 text-center shadow-lg">
              <div className="text-5xl sm:text-6xl mb-4">🚀</div>
              <h3 className="text-2xl sm:text-3xl font-bold text-[#38240D] mb-4">
                Built for Developers
              </h3>
              <p className="text-[#713600] text-sm sm:text-base">
                By developers who understand the challenges of navigating large codebases
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#38240D] mb-8 sm:mb-12 text-center">
            Powered by Advanced Technology
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Retrieval Augmented Generation
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Combines the power of semantic search with large language models to provide accurate, context-aware responses.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Vector Embeddings
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Uses Weaviate vector database with JinaAI embeddings for lightning-fast semantic code search.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Google Gemini AI
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Leverages state-of-the-art language models to generate intelligent, human-like responses.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Language-Aware Processing
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Intelligently chunks code based on programming language syntax for optimal context preservation.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Asynchronous Architecture
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Background processing with BullMQ ensures your queries are answered quickly without blocking.
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 sm:p-8 shadow-md">
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Secure & Private
              </h3>
              <p className="text-[#713600] text-sm sm:text-base leading-relaxed">
                Your code is processed securely with user-isolated data and industry-standard encryption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How We're Different */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#38240D] mb-8 sm:mb-12 text-center">
            Why Choose CodebaseLM?
          </h2>
          <div className="space-y-6 sm:space-y-8">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              <div className="bg-[#C05800] text-[#FDFBD4] w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0">
                ✓
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-2">
                  Context-Aware Answers
                </h3>
                <p className="text-[#713600] text-base sm:text-lg leading-relaxed">
                  Unlike generic AI assistants, our system understands your specific codebase and provides answers based on your actual code.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              <div className="bg-[#C05800] text-[#FDFBD4] w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0">
                ✓
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-2">
                  Instant Onboarding
                </h3>
                <p className="text-[#713600] text-base sm:text-lg leading-relaxed">
                  New team members can quickly understand complex codebases by asking natural language questions instead of manually exploring files.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start">
              <div className="bg-[#C05800] text-[#FDFBD4] w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold flex-shrink-0">
                ✓
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-2">
                  Multi-Repository Support
                </h3>
                <p className="text-[#713600] text-base sm:text-lg leading-relaxed">
                  Work with multiple repositories simultaneously, each with its own isolated context and chat history.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-[#C05800] text-[#FDFBD4]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg sm:text-xl mb-8 sm:mb-10 opacity-95">
            Join developers who are already using AI to understand their codebases better.
          </p>
          {!isAuthenticated && (
            <Link
              to="/register"
              className="inline-block px-8 py-4 rounded-lg bg-[#FDFBD4] text-[#C05800] font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg"
            >
              Sign Up Free
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-[#38240D] text-[#FDFBD4]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-[#FDFBD4]/60">&copy; 2024 CodebaseLM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

