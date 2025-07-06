'use client';

import { useEffect, useState } from 'react';
import ListingCard from './listings/ListingCard';


export default function RecommendedListings() {
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      const res = await fetch('/api/ai/recommendations');
      const data = await res.json();
      setRecommendations(data);
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
