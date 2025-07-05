'use client';

import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

interface Props {
  listingId: string;
}

export default function ReviewForm({ listingId }: Props) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim()) {
      toast.error("Please enter a comment.");
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/reviews', { listingId, rating, comment });
      toast.success('Review submitted!');
      setComment('');
    } catch (err) {
      toast.error('Failed to submit review.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-8 bg-white p-4 rounded-xl shadow-sm border">
      <h4 className="font-semibold text-lg mb-3">Leave a Review</h4>

      <div className="flex items-center gap-3 mb-3">
        <label className="text-sm font-medium text-gray-700">Rating:</label>
        <input
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          className="w-16 p-1 border rounded text-center"
        />
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Your thoughts..."
        className="w-full p-3 border rounded text-sm mb-3 resize-none"
        rows={4}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
