'use client';

import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useCallback, useState } from "react";
import Container from "../components/Container";
import ListingCard from "../components/listings/ListingCard";
import { SafeReservation, SafeUser } from "../types";

interface ApprovalsProps {
  approvals: SafeReservation[];
  currentUser?: SafeUser | null;
}

const Approvals: React.FC<ApprovalsProps> = ({ approvals: initialReservations, currentUser }) => {
  const router = useRouter();
  const [processingId, setProcessingId] = useState('');
  const [reservations, setReservations] = useState(initialReservations);

  const handleAction = useCallback(async (id: string, action: "approve" | "cancel") => {
    setProcessingId(id);
    try {
      const url = `/api/reservations/${id}/${action}`;
      const payload = action === "cancel" ? { reason: "User requested cancellation" } : undefined;
      const response = await axios.patch(url, payload);

      if (response.status === 200) {
        toast.success(`Booking ${action === "approve" ? "approved" : "cancelled"}`);
        setReservations(prev =>
          action === "approve"
            ? prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r)
            : prev.filter(r => r.id !== id)
        );
      } else {
        throw new Error(`Failed to ${action} booking`);
      }
    } catch (error: any) {
      console.error(`${action} error:`, error?.response?.data || error?.message);
      toast.error(error?.response?.data?.error || error?.message || `Failed to ${action} booking`);
    } finally {
      setProcessingId('');
    }
  }, []);

  const actionClasses = {
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    red: "bg-red-600 hover:bg-red-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="relative overflow-hidden bg-white border-b border-slate-200/60 shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/5 to-cyan-600/5" />
        <Container>
          <div className="relative py-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Bookings</h1>
              <p className="mt-2 text-slate-600 text-lg">Manage bookings on your listings</p>
            </div>
            <div className="hidden sm:flex items-center space-x-4">
              <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                {reservations.length} Booking(s)
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-8">
          {reservations.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-emerald-100 to-cyan-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-slate-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5a2.25 2.25 0 002.25-2.25m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5a2.25 2.25 0 012.25 2.25v7.5M9 12.75h6m-6 3h6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No bookings yet</h3>
              <p className="text-slate-600">When listings get booked, they'll appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
              {reservations.map((reservation) => {
                const isPending = reservation.status === "PENDING";
                const isProcessing = processingId === reservation.id;
                const actionLabel = isPending ? "Approve" : "Cancel";
                const actionColor = isPending ? "emerald" : "red";
                const handleClick = () => handleAction(reservation.id, isPending ? "approve" : "cancel");

                return (
                  <div key={reservation.id} className="group relative">
                    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 hover:border-slate-300 transform hover:-translate-y-1 overflow-hidden">

                      {reservation?.listing ? (
                        <ListingCard
                          data={reservation.listing}
                          reservation={reservation}
                          actionId={reservation.id}
                          onAction={handleClick}
                          disabled={isProcessing}
                          actionLabel={actionLabel}
                          currentUser={currentUser}
                        />
                      ) : (
                        <div className="p-4 bg-red-100 text-red-700 text-sm font-medium">
                          Listing information missing for this reservation.
                        </div>
                      )}

                      <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-cyan-600 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
                        {isPending ? "Pending Approval" : "Booked"}
                      </div>

                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                        <button
                          onClick={handleClick}
                          disabled={isProcessing}
                          aria-label={isPending ? "Approve this booking" : "Cancel this booking"}
                          className={`${actionClasses[actionColor]} text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-3 shadow-lg`}
                        >
                          {isProcessing ? (
                            <>
                              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                                <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>{isPending ? "Approving..." : "Cancelling..."}</span>
                            </>
                          ) : (
                            <>
                              {isPending ? (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                              <span>{isPending ? "Approve Booking" : "Cancel Booking"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default Approvals;
