'use client';

import { useEffect, useState } from 'react';

export default function AccessDenied() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden z-0">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 rotate-12 animate-pulse"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-blue-500/10 to-purple-500/10 -rotate-12 animate-pulse delay-1000"></div>
        
        {/* Floating particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          ></div>
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 text-center px-4 max-w-2xl mx-auto transform transition-all duration-1000 ${
        mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}>
        {/* Lock icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl animate-bounce">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-red-400 to-pink-500 rounded-full animate-ping opacity-20"></div>
          </div>
        </div>

        {/* Error code with glitch effect */}
        <div className="relative mb-6">
          <h1 className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-500 to-purple-600 animate-pulse">
            403
          </h1>
          <div className="absolute inset-0 text-8xl md:text-9xl font-black text-red-500/20 animate-glitch">
            403
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 animate-fade-in-up">
          Access <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-500">Denied</span>
        </h2>

        {/* Description */}
        <p className="text-gray-300 text-lg md:text-xl mb-8 leading-relaxed animate-fade-in-up delay-200">
          Oops! You don't have permission to access this page. 
          <br className="hidden md:block" />
          This area is restricted to authorized users only.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up delay-300">
          <a
            href="/"
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            <span className="relative flex items-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </span>
          </a>

          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-transparent border-2 border-gray-400 text-gray-300 font-semibold rounded-full hover:bg-white/10 hover:border-white hover:text-white transform hover:scale-105 transition-all duration-300"
          >
            Go Back
          </button>
        </div>

        {/* Additional help text */}
        <div className="mt-12 p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 animate-fade-in-up delay-500">
          <p className="text-gray-400 text-sm">
            If you believe this is an error, please contact the administrator or try logging in with proper credentials.
          </p>
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-glitch {
          animation: glitch 2s infinite;
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
        
        .delay-200 {
          animation-delay: 0.2s;
        }
        
        .delay-300 {
          animation-delay: 0.3s;
        }
        
        .delay-500 {
          animation-delay: 0.5s;
        }
        
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
}