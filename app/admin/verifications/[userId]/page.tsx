"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";

export default function UserBusinessVerificationPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!userId) return;

    fetch(`/api/admin/business-verifications/${userId}`)
      .then((res) => res.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      });
  }, [userId]);

  const handleVerify = async (verified: boolean) => {
    setSubmitting(true);
    try {
      await axios.post(`/api/admin/providers/${userId}/status`, {
        verified,
        notes,
      });
      toast.success(verified ? "Approved" : "Rejected");
      router.refresh();
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!data) return <div className="p-6 text-red-500">No data found</div>;

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Business Verification for {data.provider.name}</h1>

      <p><strong>Email:</strong> {data.provider.email}</p>
      <p><strong>Business Name:</strong> {data.businessName}</p>
      <p><strong>Business Type:</strong> {data.businessType}</p>
      <p><strong>TIN Number:</strong> {data.tinNumber}</p>
      <p><strong>Registration Number:</strong> {data.registrationNumber}</p>
      <p><strong>Submitted:</strong> {new Date(data.submittedAt).toLocaleDateString()}</p>
      <p><strong>Status:</strong> {data.verified ? "✅ Verified" : "⏳ Pending"}</p>

      <div className="mt-4">
        <h2 className="font-semibold mb-2">Documents:</h2>
        <ul className="space-y-1">
          {data.documents.tin && <li><a href={data.documents.tin} className="text-blue-600 underline">TIN Certificate</a></li>}
          {data.documents.incorporation && <li><a href={data.documents.incorporation} className="text-blue-600 underline">Incorporation Certificate</a></li>}
          {data.documents.vat && <li><a href={data.documents.vat} className="text-blue-600 underline">VAT Certificate</a></li>}
          {data.documents.ssnit && <li><a href={data.documents.ssnit} className="text-blue-600 underline">SSNIT Certificate</a></li>}
        </ul>
      </div>

      <div className="mt-6">
        <label className="block mb-2 font-medium">Verification Notes (optional):</label>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        ></textarea>
      </div>

      <div className="flex gap-4 mt-4">
        <button
          onClick={() => handleVerify(true)}
          disabled={submitting}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ✅ Approve
        </button>
        <button
          onClick={() => handleVerify(false)}
          disabled={submitting}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          ❌ Reject
        </button>
      </div>
    </div>
  );
}
