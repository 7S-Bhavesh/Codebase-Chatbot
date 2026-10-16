import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';

export default function Testimonials() {
  const { isAuthenticated } = useAuth();

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Senior Developer",
      company: "TechCorp",
      image: "👩‍💻",
      text: "CodebaseLM has transformed how our team onboards new developers. What used to take weeks now takes days. The AI-powered insights are incredibly accurate."
    },
    {
      name: "Michael Rodriguez",
      role: "Engineering Manager",
      company: "StartupXYZ",
      image: "👨‍💼",
      text: "We've reduced code review time by 40% since implementing CodebaseLM. The ability to quickly understand complex architectural decisions is invaluable."
    },
    {
      name: "Emily Watson",
      role: "Full Stack Developer",
      company: "DevStudio",
      image: "👩‍🔬",
      text: "As someone who works across multiple repositories daily, CodebaseLM is a game-changer. I can instantly find and understand code patterns without endless searching."
    },
    {
      name: "David Kim",
      role: "CTO",
      company: "CloudTech",
      image: "👨‍💻",
      text: "The ROI is clear. Our developers are more productive, and the learning curve for new projects has dramatically decreased. Highly recommended!"
    },
    {
      name: "Jessica Martinez",
      role: "Frontend Lead",
      company: "WebSolutions",
      image: "👩‍🎨",
      text: "I love how CodebaseLM provides context-aware answers. It's like having a senior developer available 24/7 to answer questions about our codebase."
    },
    {
      name: "Alex Thompson",
      role: "Backend Engineer",
      company: "DataFlow",
      image: "👨‍🔧",
      text: "The semantic search is incredibly powerful. I can find relevant code using natural language queries, which saves me hours every week."
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFBD4]">
      <Navbar />

      {/* Hero Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#38240D] mb-6">
            What Developers Say
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-[#713600] leading-relaxed">
            Hear from developers who are using CodebaseLM to transform their workflow
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 text-center">
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#C05800] mb-2">95%</div>
              <p className="text-[#713600] text-base sm:text-lg font-medium">User Satisfaction</p>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#C05800] mb-2">50%</div>
              <p className="text-[#713600] text-base sm:text-lg font-medium">Time Saved</p>
            </div>
            <div>
              <div className="text-4xl sm:text-5xl md:text-6xl font-bold text-[#C05800] mb-2">1000+</div>
              <p className="text-[#713600] text-base sm:text-lg font-medium">Active Developers</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-[#38240D]/5"
              >
                <div className="flex items-start mb-4 sm:mb-6">
                  <div className="text-4xl sm:text-5xl mr-4 flex-shrink-0">
                    {testimonial.image}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-[#38240D] truncate">
                      {testimonial.name}
                    </h3>
                    <p className="text-sm text-[#713600] font-medium truncate">
                      {testimonial.role}
                    </p>
                    <p className="text-xs text-[#713600]/70 truncate">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute -top-2 -left-2 text-4xl sm:text-5xl text-[#C05800]/20 font-serif">"</div>
                  <p className="text-[#713600] leading-relaxed relative z-10 text-sm sm:text-base">
                    {testimonial.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Testimonial */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#FDFBD4] rounded-3xl p-8 sm:p-12 md:p-16 text-center shadow-xl border-2 border-[#C05800]/20">
            <div className="text-5xl sm:text-6xl mb-6">⭐</div>
            <blockquote className="text-xl sm:text-2xl md:text-3xl font-bold text-[#38240D] mb-6 sm:mb-8 leading-tight">
              "CodebaseLM is not just a tool, it's a game-changer for developer productivity. Our entire engineering team relies on it daily."
            </blockquote>
            <div>
              <p className="text-lg sm:text-xl font-bold text-[#C05800]">James Wilson</p>
              <p className="text-[#713600] text-sm sm:text-base">VP of Engineering, Innovation Labs</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-[#C05800] text-[#FDFBD4]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            Join Thousands of Happy Developers
          </h2>
          <p className="text-lg sm:text-xl mb-8 sm:mb-10 opacity-95">
            Start understanding your codebase better today with AI-powered insights.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-6">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="px-8 py-4 rounded-lg bg-[#FDFBD4] text-[#C05800] font-semibold text-lg hover:bg-white transition-all duration-300 shadow-lg"
                >
                  Get Started Free
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

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-[#38240D] text-[#FDFBD4]">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm text-[#FDFBD4]/60">&copy; 2024 CodebaseLM. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

