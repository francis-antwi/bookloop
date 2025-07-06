'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

interface Props {
  listingId: string;
}

export default function PriceSuggestionChart({ listingId }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const res = await fetch(`/api/ai/pricing?listingId=${listingId}`);
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error("Failed to load price suggestion", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPricing();
  }, [listingId]);

  if (loading) return <div>Loading price forecast...</div>;

  return (
    <div className="w-full h-72 mt-6">
      <h2 className="text-lg font-semibold mb-2">Dynamic Price Suggestion</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#eee" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="basePrice" stroke="#8884d8" strokeWidth={2} name="Base Price" />
          <Line type="monotone" dataKey="suggestedPrice" stroke="#82ca9d" strokeWidth={2} name="Suggested Price" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
