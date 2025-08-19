'use client';

import { useEffect, useState } from 'react';
import { SafeListing, SafeUser } from '../types';

interface RecommendedListingsProps {
  currentUser?: SafeUser | null;
}

interface RecommendationData {
  popularListings: SafeListing[];
  categoryRecommendations: SafeListing[];
  locationBasedRecommendations: SafeListing[];
}

const RecommendedListings: React.FC<RecommendedListingsProps> = ({ 
  currentUser 
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // You can create an API route for recommendations
        // For now, let's simulate the logic
        if (currentUser) {
          // Fetch personalized recommendations based on user's booking history
          // This would typically call your API: /api/recommendations
          console.log('Fetching personalized recommendations for user:', currentUser.id);
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mock recommendations data
          setRecommendations({
            popularListings: [],
            categoryRecommendations: [],
            locationBasedRecommendations: []
          });
        } else {
          // Show popular/trending listings for non-authenticated users
          console.log('Fetching popular recommendations for guest user');
          
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 800));
          
          setRecommendations({
            popularListings: [],
            categoryRecommendations: [],
            locationBasedRecommendations: []
          });
        }
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [currentUser]);

  // Loading state
  if (isLoading) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading personalized recommendations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-800 font-medium">Oops! Something went wrong</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has made reservations (you'd get this from your database)
  const hasReservations = false; // Replace with actual logic
  
  // If no reservations, show the current message
  if (!hasReservations && currentUser) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Recommended for You
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Make some reservations to get personalized recommendations!
          </p>
          
          {/* You could add a CTA button here */}
          <div className="mt-6">
            <button 
              onClick={() => {
                // Scroll to categories or trigger search modal
                document.querySelector('[data-category-section]')?.scrollIntoView({ 
                  behavior: 'smooth' 
                });
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Explore Categories
            </button>
          </div>
        </div>
      </div>
    );
  }

  // For guest users, show popular listings
  if (!currentUser) {
    return (
      <div className="w-full py-12">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Popular Right Now
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Discover the most booked services in your area
          </p>
          
          {/* Placeholder for popular listings - you'd map through actual data */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
              <div className="text-blue-600 text-2xl mb-2">🏠</div>
              <h3 className="font-semibold text-gray-900 mb-2">Luxury Apartments</h3>
              <p className="text-sm text-gray-600">Premium stays in prime locations</p>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-xl border border-green-200">
              <div className="text-green-600 text-2xl mb-2">🚗</div>
              <h3 className="font-semibold text-gray-900 mb-2">Car Rentals</h3>
              <p className="text-sm text-gray-600">Flexible vehicle options</p>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-6 rounded-xl border border-purple-200">
              <div className="text-purple-600 text-2xl mb-2">🎉</div>
              <h3 className="font-semibold text-gray-900 mb-2">Event Centers</h3>
              <p className="text-sm text-gray-600">Perfect venues for celebrations</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user has reservations, show personalized recommendations
  return (
    <div className="w-full py-12">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recommended for You
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Based on your booking history and preferences
        </p>
      </div>

      {/* Here you would render actual recommendation sections */}
      <div className="space-y-8">
        {/* Similar to what you liked */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Similar to what you liked</h3>
          {/* Render recommendation cards */}
        </section>

        {/* Popular in your area */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular in your area</h3>
          {/* Render location-based recommendations */}
        </section>
      </div>
    </div>
  );
};

export default RecommendedListings;