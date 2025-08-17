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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/ai/occupancy?listingId=${listingId}`);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const predictions = await res.json();
        setData(predictions);
      } catch (err) {
        console.error('Failed to fetch occupancy data', err);
        setError('Failed to load occupancy data');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, [listingId]);

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-md border border-gray-200 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-gray-800">{`Date: ${label}`}</p>
          <p className="text-sm text-blue-600 font-semibold">
            {`Occupancy: ${(payload[0].value * 100).toFixed(1)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-gray-200 shadow-sm">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600 font-medium">Loading booking prediction...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-96 bg-gradient-to-br from-red-50 to-pink-50 rounded-xl border border-red-200 shadow-sm">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-96 bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">
              Booking Forecast
            </h2>
            <p className="text-sm text-gray-500">
              Next 30 days prediction
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm text-gray-600 font-medium">Booking Rate</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart 
              data={data} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e5e7eb" 
                opacity={0.5}
              />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                domain={[0, 1]} 
                tickFormatter={(v) => `${Math.round(v * 100)}%`}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickLine={{ stroke: '#d1d5db' }}
                axisLine={{ stroke: '#d1d5db' }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                cursor={{ stroke: '#3b82f6', strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Line 
                type="monotone" 
                dataKey="occupiedProbability" 
                stroke="#3b82f6"
                strokeWidth={3}
                fill="url(#colorGradient)"
                dot={{ 
                  fill: '#3b82f6', 
                  strokeWidth: 2, 
                  r: 4,
                  stroke: '#ffffff'
                }}
                activeDot={{ 
                  r: 6, 
                  fill: '#3b82f6',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                  filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3))'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Stats */}
        {data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-600">
                <span className="font-medium">Avg: </span>
                {(data.reduce((sum, item) => sum + item.occupiedProbability, 0) / data.length * 100).toFixed(1)}%
              </div>
              <div className="text-gray-600">
                <span className="font-medium">Peak: </span>
                {(Math.max(...data.map(item => item.occupiedProbability)) * 100).toFixed(1)}%
              </div>
              <div className="text-gray-600">
                <span className="font-medium">Low: </span>
                {(Math.min(...data.map(item => item.occupiedProbability)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}