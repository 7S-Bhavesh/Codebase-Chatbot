import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import FloatingLines from "../components/FloatingLines";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-[#FDFBD4] text-[#38240D]">
      <Navbar />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 sm:pt-20 md:pt-24 lg:pt-32 pb-16 sm:pb-20 md:pb-24 px-4 sm:px-6">
        {/* Background */}
        <div className="absolute inset-0 z-0 opacity-10">
          <FloatingLines
            enabledWaves={["top", "middle", "bottom"]}
            lineCount={[12, 18, 24]}
            lineDistance={[10, 8, 6]}
            bendRadius={6}
            bendStrength={-0.6}
            interactive
            parallax
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight mb-6 text-[#38240D]">
              Understand Your Codebase
              <span className="block mt-2 text-[#C05800]">With AI-Powered Insights</span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-[#713600] mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
              Chat with your GitHub repositories using advanced AI. Get instant answers, understand complex architectures, and accelerate your development workflow.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 mb-16">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/register"
                    className="px-8 py-4 rounded-lg bg-[#C05800] text-[#FDFBD4] font-semibold text-lg hover:bg-[#713600] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/login"
                    className="px-8 py-4 rounded-lg bg-transparent text-[#C05800] font-semibold text-lg border-2 border-[#C05800] hover:bg-[#C05800] hover:text-[#FDFBD4] transition-all duration-300"
                  >
                    Sign In
                  </Link>
                </>
              ) : (
                <Link
                  to="/repos"
                  className="px-8 py-4 rounded-lg bg-[#C05800] text-[#FDFBD4] font-semibold text-lg hover:bg-[#713600] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  Go to Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#38240D] mb-4">
              Powerful Features
            </h2>
            <p className="text-lg sm:text-xl text-[#713600] max-w-2xl mx-auto">
              Everything you need to understand and navigate your codebase efficiently
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">🔍</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Semantic Search
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Find code using natural language queries powered by advanced vector embeddings and AI search.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">🤖</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                AI-Powered Answers
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Get intelligent, context-aware responses using Retrieval Augmented Generation with Google Gemini.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">⚡</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Lightning Fast
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Asynchronous processing ensures quick responses while indexing happens in the background.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">🔐</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Secure & Private
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Your code is processed securely with enterprise-grade encryption and isolated user data.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">📊</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Multi-Repository
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Manage and chat with multiple repositories simultaneously with organized chat history.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-[#FDFBD4] rounded-xl p-6 sm:p-8 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
              <div className="text-4xl sm:text-5xl mb-4">🌐</div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-3">
                Language Aware
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Supports multiple programming languages with intelligent chunking and context preservation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-[#FDFBD4]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#38240D] mb-4">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-[#713600] max-w-2xl mx-auto">
              Get started in three simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
            {/* Step 1 */}
            <div className="text-center">
              <div className="bg-[#C05800] text-[#FDFBD4] w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6">
                1
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-4">
                Connect Repository
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Add your GitHub repository URL and let our system index your codebase automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="bg-[#C05800] text-[#FDFBD4] w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6">
                2
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-4">
                Ask Questions
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Start chatting with your codebase using natural language queries in real-time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="bg-[#C05800] text-[#FDFBD4] w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold mx-auto mb-6">
                3
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-[#38240D] mb-4">
                Get Insights
              </h3>
              <p className="text-[#713600] leading-relaxed">
                Receive intelligent answers with code references and contextual understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-[#C05800] text-[#FDFBD4]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Development?
          </h2>
          <p className="text-lg sm:text-xl mb-8 sm:mb-10 opacity-95">
            Join developers who are already leveraging AI to understand their codebases better.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="px-8 py-4 rounded-lg bg-[#FDFBD4] text-[#C05800] font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg"
                >
                  Start Free Today
                </Link>
                <Link
                  to="/about"
                  className="px-8 py-4 rounded-lg bg-transparent text-[#FDFBD4] font-semibold text-lg border-2 border-[#FDFBD4] hover:bg-[#FDFBD4] hover:text-[#C05800] transition-all duration-300"
                >
                  Learn More
                </Link>
              </>
            ) : (
              <Link
                to="/repos"
                className="px-8 py-4 rounded-lg bg-[#FDFBD4] text-[#C05800] font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg"
              >
                Go to Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-[#38240D] text-[#FDFBD4]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-4">CodebaseLM</h3>
              <p className="text-[#FDFBD4]/80 text-sm">
                AI-powered codebase understanding for modern developers.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="text-[#FDFBD4]/80 hover:text-[#FDFBD4] transition-colors">
                    About
                  </Link>
                </li>
                <li>
                  <Link to="/testimonials" className="text-[#FDFBD4]/80 hover:text-[#FDFBD4] transition-colors">
                    Testimonials
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Get Started</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/register" className="text-[#FDFBD4]/80 hover:text-[#FDFBD4] transition-colors">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-[#FDFBD4]/80 hover:text-[#FDFBD4] transition-colors">
                    Login
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#FDFBD4]/20 pt-6 text-center text-sm text-[#FDFBD4]/60">
            <p>&copy; 2024 CodebaseLM. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
