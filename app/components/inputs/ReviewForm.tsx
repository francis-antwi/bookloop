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
    setLoading(true);
    try {
      await axios.post('/api/reviews', { listingId, rating, comment });
      toast.success('Review submitted!');
      setComment('');
    } catch (err) {
      toast.error('Failed to submit review.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h4 className="font-bold">Leave a Review</h4>
      <input
        type="number"
        min={1}
        max={5}
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Your thoughts..."
        className="w-full p-2 border rounded"
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
      >
        {loading ? 'Submitting...' : 'Submit Review'}
      </button>
    </div>
  );
}
