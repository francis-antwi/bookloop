'use client';

import { useEffect, useState } from 'react';
import ListingCard from './listings/ListingCard';

export default function RecommendedListings() {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const res = await fetch('/api/ai/recommendations', {
          credentials: 'include',
        });

        if (!res.ok) {
          console.error('Error fetching recommendations:', res.status);
          return;
        }

        const data = await res.json();
        setRecommendations(data);
      } catch (err) {
        console.error('Error:', err);
      }
    };

    fetchRecommendations();
  }, []);

  if (!recommendations.length) return null;

  return (
    <div className="my-12">
      <h2 className="text-2xl font-semibold mb-4">Recommended For You</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {recommendations.map((listing: any) => (
          <ListingCard key={listing.id} data={listing} />
        ))}
      </div>
    </div>
  );
}
