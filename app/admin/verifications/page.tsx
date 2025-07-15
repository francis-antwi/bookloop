// app/admin/verifications/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function BusinessVerificationPage() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/admin/business-verifications")
      .then((res) => res.json())
      .then(setData);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Business Verification Submissions</h1>
      {data.length === 0 ? (
        <p>No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Provider</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Business</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">TIN</th>
                <th className="p-2 border">Registered</th>
                <th className="p-2 border">Submitted</th>
                <th className="p-2 border">Verified?</th>
                <th className="p-2 border">Docs</th>
              </tr>
            </thead>
            <tbody>
              {data.map((v, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 border">{v.provider.name}</td>
                  <td className="p-2 border">{v.provider.email}</td>
                  <td className="p-2 border">{v.businessName}</td>
                  <td className="p-2 border">{v.businessType}</td>
                  <td className="p-2 border">{v.tinNumber}</td>
                  <td className="p-2 border">{v.registrationNumber}</td>
                  <td className="p-2 border">
                    {new Date(v.submittedAt).toLocaleDateString()}
                  </td>
                  <td className="p-2 border">
                    {v.verified ? "✅" : "⏳"}
                  </td>
                  <td className="p-2 border text-sm">
                    <div className="flex flex-col gap-1">
                      {v.documents.tin && (
                        <a href={v.documents.tin} target="_blank" className="text-blue-600 underline">
                          TIN
                        </a>
                      )}
                      {v.documents.incorporation && (
                        <a href={v.documents.incorporation} target="_blank" className="text-blue-600 underline">
                          Incorporation
                        </a>
                      )}
                      {v.documents.vat && (
                        <a href={v.documents.vat} target="_blank" className="text-blue-600 underline">
                          VAT
                        </a>
                      )}
                      {v.documents.ssnit && (
                        <a href={v.documents.ssnit} target="_blank" className="text-blue-600 underline">
                          SSNIT
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
