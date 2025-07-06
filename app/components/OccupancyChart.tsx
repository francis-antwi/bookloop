'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';

interface Props {
  listingId: string;
}

interface Prediction {
  date: string;
  occupiedProbability: number;
}

export default function OccupancyChart({ listingId }: Props) {
  const [data, setData] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch(`/api/ai/occupancy?listingId=${listingId}`);
        const predictions = await res.json();
        setData(predictions);
      } catch (err) {
        console.error('Failed to fetch occupancy data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [listingId]);

  if (loading) return <div>Loading occupancy prediction...</div>;

  return (
    <div className="w-full h-72">
      <h2 className="text-lg font-semibold mb-2">Occupancy Forecast (Next 30 Days)</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
          <Tooltip formatter={(value: number) => `${(value * 100).toFixed(0)}%`} />
          <Line type="monotone" dataKey="occupiedProbability" stroke="#2563eb" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
