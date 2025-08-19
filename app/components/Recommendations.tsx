'use client';

import { useEffect, useState } from 'react';
import ListingCard from './listings/ListingCard';
import { FiLoader, FiAlertCircle } from 'react-icons/fi';

export default function RecommendedListings() {
  const [recommendations, setRecommendations] = useState<any[]>([]);
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
            setError('Please sign in to see recommendations');
          } else {
            setError('Failed to load recommendations');
          }
          console.error('Error fetching recommendations:', res.status);
          return;
        }

        const data = await res.json();
        setRecommendations(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-semibold mb-4">Recommended For You</h2>
        <div className="flex items-center justify-center py-8">
          <FiLoader className="animate-spin text-2xl text-blue-500 mr-2" />
          <span>Loading recommendations...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-semibold mb-4">Recommended For You</h2>
        <div className="flex items-center justify-center py-8 text-red-500">
          <FiAlertCircle className="text-xl mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="my-12">
        <h2 className="text-2xl font-semibold mb-4">Recommended For You</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No recommendations available yet.</p>
          <p className="text-sm">Make some reservations to get personalized recommendations!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-12">
      <h2 className="text-2xl font-semibold mb-6">Recommended For You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {recommendations.map((listing: any) => (
          <ListingCard key={listing.id} data={listing} />
        ))}
      </div>
    </div>
  );
}