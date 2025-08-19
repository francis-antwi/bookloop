'use client';

import { useEffect, useState, useCallback } from 'react';
import ListingCard from './listings/ListingCard';
import { SafeListing, SafeUser } from '@/app/types';

interface RecommendationsProps {
  currentUser?: SafeUser | null;
}

export default function Recommendations({ currentUser }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<SafeListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/ai/recommendations', {
        credentials: 'include',
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch recommendations: ${res.status}`);
      }
      
      const data = await res.json();
      setRecommendations(Array.isArray(data) ? data : []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error fetching recommendations:', errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  // Early returns for different states
  if (loading) {
    return (
      <div className="col-span-full mb-8">
        <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm">
          <div className="animate-pulse space-y-6">
            {/* Header skeleton */}
            <div className="flex items-center space-x-3">
              <div className="h-3 w-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg w-72"></div>
            </div>
            
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-white rounded-xl h-72 shadow-sm border border-gray-100 overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-gray-200 to-gray-300 h-48 animate-pulse"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full mb-8">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Recommendations</h3>
              <p className="text-red-700 text-sm mb-4">We couldn't fetch your personalized recommendations. Please check your connection and try again.</p>
              <button 
                onClick={fetchRecommendations}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white text-sm font-medium rounded-lg hover:from-red-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="col-span-full mb-8" aria-labelledby="recommendations-heading">
      <div className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
        {/* Header with decorative elements */}
        <div className="flex items-center mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
            <h2 id="recommendations-heading" className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Recommended For You
            </h2>
          </div>
          <div className="ml-auto">
            <div className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
              <span className="text-xs font-medium text-blue-700">
                {recommendations.length} {recommendations.length === 1 ? 'Property' : 'Properties'}
              </span>
            </div>
          </div>
        </div>

        {/* Listings grid */}
        <div 
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
          role="list"
          aria-label="Recommended listings"
        >
          {recommendations.map((listing, index) => (
            <div 
              key={listing.id} 
              role="listitem"
              className="transform hover:scale-105 transition-transform duration-200 ease-out"
              style={{
                animationDelay: `${index * 100}ms`
              }}
            >
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300 -z-10 blur-sm"></div>
                <ListingCard
                  data={listing}
                  currentUser={currentUser}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decoration */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500 text-center">
            Recommendations powered by AI • Updated regularly based on your preferences
          </p>
        </div>
      </div>
    </section>
  );
}