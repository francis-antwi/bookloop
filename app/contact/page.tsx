'use client';

import React, { useState, useEffect } from 'react';
import { Send, User, Mail, Phone, MessageSquare, Instagram, Sparkles, Heart } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate loading for better UX
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const { name, email, phone, message } = formData;
    const whatsappMessage = `Hello, my name is ${name}. Email: ${email}, Phone: ${phone}. Message: ${message}`;
    const whatsappUrl = `https://wa.me/233506632349?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        {/* Floating orbs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-pink-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-gradient-to-r from-green-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        
        {/* Floating particles */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 6}s`
            }}
          ></div>
        ))}
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      </div>

      <div className="relative container mx-auto px-4 py-16">
        {/* Header */}
        <div className={`text-center mb-16 transform transition-all duration-1000 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400 mr-3 animate-pulse" />
            <h1 className="text-6xl md:text-7xl font-black bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Contact Us
            </h1>
            <Sparkles className="w-8 h-8 text-pink-400 ml-3 animate-pulse delay-500" />
          </div>
          <p className="text-xl text-purple-200 mt-4 max-w-2xl mx-auto leading-relaxed">
            Ready to start something amazing together? We'd love to hear from you!
          </p>
        </div>

        {/* Contact Form */}
        <div className={`max-w-2xl mx-auto transform transition-all duration-1000 delay-300 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <div className="bg-white/10 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white/20 relative overflow-hidden">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-3 flex items-center justify-center">
                  <Heart className="w-6 h-6 text-pink-400 mr-2 animate-pulse" />
                  We'd love to hear from you!
                </h2>
                <p className="text-purple-200">Share your thoughts, ideas, or just say hello</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Name Field */}
                <div className="relative group">
                  <label htmlFor="name" className={`block text-sm font-semibold mb-3 transition-all duration-200 ${
                    focusedField === 'name' ? 'text-blue-300' : 'text-purple-200'
                  }`}>
                    Your Name
                  </label>
                  <div className="relative">
                    <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                      focusedField === 'name' ? 'text-blue-400 scale-110' : 'text-gray-400'
                    }`} size={20} />
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField('')}
                      className={`w-full pl-12 pr-6 py-4 bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none text-white placeholder-gray-400 ${
                        focusedField === 'name' 
                          ? 'border-blue-400 bg-white/20 shadow-lg shadow-blue-500/25 transform scale-[1.02]' 
                          : 'border-white/20 hover:border-white/40 hover:bg-white/15'
                      }`}
                      placeholder="Enter your full name"
                      required
                    />
                    {focusedField === 'name' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 pointer-events-none animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Email Field */}
                <div className="relative group">
                  <label htmlFor="email" className={`block text-sm font-semibold mb-3 transition-all duration-200 ${
                    focusedField === 'email' ? 'text-purple-300' : 'text-purple-200'
                  }`}>
                    Your Email
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                      focusedField === 'email' ? 'text-purple-400 scale-110' : 'text-gray-400'
                    }`} size={20} />
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField('')}
                      className={`w-full pl-12 pr-6 py-4 bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none text-white placeholder-gray-400 ${
                        focusedField === 'email' 
                          ? 'border-purple-400 bg-white/20 shadow-lg shadow-purple-500/25 transform scale-[1.02]' 
                          : 'border-white/20 hover:border-white/40 hover:bg-white/15'
                      }`}
                      placeholder="your.email@example.com"
                      required
                    />
                    {focusedField === 'email' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 pointer-events-none animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Phone Field */}
                <div className="relative group">
                  <label htmlFor="phone" className={`block text-sm font-semibold mb-3 transition-all duration-200 ${
                    focusedField === 'phone' ? 'text-pink-300' : 'text-purple-200'
                  }`}>
                    Your Phone
                  </label>
                  <div className="relative">
                    <Phone className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-all duration-300 ${
                      focusedField === 'phone' ? 'text-pink-400 scale-110' : 'text-gray-400'
                    }`} size={20} />
                    <input
                      type="text"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField('')}
                      className={`w-full pl-12 pr-6 py-4 bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none text-white placeholder-gray-400 ${
                        focusedField === 'phone' 
                          ? 'border-pink-400 bg-white/20 shadow-lg shadow-pink-500/25 transform scale-[1.02]' 
                          : 'border-white/20 hover:border-white/40 hover:bg-white/15'
                      }`}
                      placeholder="+1 (555) 123-4567"
                      required
                    />
                    {focusedField === 'phone' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-pink-500/20 to-yellow-500/20 pointer-events-none animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Message Field */}
                <div className="relative group">
                  <label htmlFor="message" className={`block text-sm font-semibold mb-3 transition-all duration-200 ${
                    focusedField === 'message' ? 'text-green-300' : 'text-purple-200'
                  }`}>
                    Your Message
                  </label>
                  <div className="relative">
                    <MessageSquare className={`absolute left-4 top-6 transition-all duration-300 ${
                      focusedField === 'message' ? 'text-green-400 scale-110' : 'text-gray-400'
                    }`} size={20} />
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={formData.message}
                      onChange={handleChange}
                      onFocus={() => setFocusedField('message')}
                      onBlur={() => setFocusedField('')}
                      className={`w-full pl-12 pr-6 py-4 bg-white/10 border-2 rounded-2xl transition-all duration-300 focus:outline-none resize-none text-white placeholder-gray-400 ${
                        focusedField === 'message' 
                          ? 'border-green-400 bg-white/20 shadow-lg shadow-green-500/25 transform scale-[1.02]' 
                          : 'border-white/20 hover:border-white/40 hover:bg-white/15'
                      }`}
                      placeholder="Tell us what's on your mind..."
                      required
                    />
                    {focusedField === 'message' && (
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/20 to-blue-500/20 pointer-events-none animate-pulse"></div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-5 px-8 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white font-bold text-lg rounded-2xl shadow-2xl hover:shadow-yellow-500/25 transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center space-x-3 relative overflow-hidden ${
                    isSubmitting ? 'opacity-80 cursor-not-allowed' : 'hover:from-yellow-500 hover:via-orange-600 hover:to-red-600'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sending your message...</span>
                    </>
                  ) : (
                    <>
                      <Send size={22} className="animate-pulse" />
                      <span>Send via WhatsApp</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Social Media Section */}
        <div className={`mt-20 text-center transform transition-all duration-1000 delay-500 ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}>
          <h2 className="text-3xl font-bold text-white mb-8 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-pink-400 mr-3 animate-spin" />
            Follow Our Journey
            <Sparkles className="w-6 h-6 text-yellow-400 ml-3 animate-spin delay-500" />
          </h2>
          
          <div className="flex justify-center">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="group relative"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 via-red-500 via-orange-500 to-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl hover:shadow-pink-500/50 transform hover:scale-110 hover:rotate-6 transition-all duration-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl"></div>
                <Instagram className="w-10 h-10 text-white group-hover:scale-125 transition-transform duration-300 relative z-10" />
                
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-3xl border-4 border-white/30 group-hover:border-white/60 transition-all duration-300"></div>
                <div className="absolute -inset-2 rounded-3xl border-2 border-pink-400/50 group-hover:border-pink-400 animate-pulse"></div>
              </div>
              
              <p className="mt-4 text-purple-200 group-hover:text-white transition-colors duration-300 font-semibold">
                @ourhandle
              </p>
            </a>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg) scale(1); 
            opacity: 0.7;
          }
          33% { 
            transform: translateY(-20px) rotate(120deg) scale(1.1); 
            opacity: 1;
          }
          66% { 
            transform: translateY(10px) rotate(240deg) scale(0.9); 
            opacity: 0.8;
          }
        }
        
        .animate-float {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Contact;