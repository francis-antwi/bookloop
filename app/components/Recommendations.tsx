'use client';

import { useEffect, useState } from 'react';
import ListingCard from './listings/ListingCard';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';
import { SafeListing, SafeUser } from '../types';

interface RecommendedListingsProps {
  currentUser?: SafeUser | null;
}

export default function RecommendedListings({ currentUser }: RecommendedListingsProps) {
  const [recommendations, setRecommendations] = useState<SafeListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const res = await fetch('/api/ai/recommendations', {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            setError('Please sign in to see personalized recommendations');
          } else if (res.status === 404) {
            setError('Recommendation service not available');
          } else {
            setError('Failed to load recommendations');
          }
          console.error('Error fetching recommendations:', res.status, res.statusText);
          return;
        }

        const data = await res.json();
        
        // Validate the response data
        if (Array.isArray(data)) {
          setRecommendations(data);
        } else if (data.recommendations && Array.isArray(data.recommendations)) {
          setRecommendations(data.recommendations);
        } else {
          console.warn('Unexpected response format:', data);
          setRecommendations([]);
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentUser]); // Add currentUser as dependency

  if (loading) {
    return (
      <div className="my-10">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Recommended For You</h2>
        <div className="flex items-center justify-center py-12 bg-gray-50 rounded-lg">
          <FiLoader className="animate-spin text-2xl text-purple-600 mr-3" />
          <span className="text-gray-600">Loading personalized recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-10">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Recommended For You</h2>
        <div className="flex flex-col items-center justify-center py-12 bg-red-50 rounded-lg border border-red-200">
          <FiAlertCircle className="text-3xl text-red-500 mb-3" />
          <span className="text-red-700 font-medium">{error}</span>
          {error.includes('sign in') && (
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-semibold mb-4 text-gray-900">Recommended For You</h2>
        <div className="text-center py-12 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-700 font-medium mb-2">No recommendations available yet.</p>
          <p className="text-sm text-gray-600 mb-2">
            Make some reservations to get personalized recommendations!
          </p>
          
          {/* Add a CTA button to encourage exploration */}
          <button 
            onClick={() => {
              // Scroll to categories section
              const categoriesSection = document.querySelector('[data-category-section]');
              if (categoriesSection) {
                categoriesSection.scrollIntoView({ behavior: 'smooth' });
              } else {
                // Fallback: scroll to the category buttons
                const categoryButtons = document.querySelector('.grid');
                categoryButtons?.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            Explore Categories
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-10">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-semibold text-gray-900">Recommended For You</h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'}
        </span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {recommendations.map((listing: SafeListing) => (
          <ListingCard 
            key={listing.id} 
            data={listing} 
            currentUser={currentUser}
          />
        ))}
      </div>
    </div>
  );
}