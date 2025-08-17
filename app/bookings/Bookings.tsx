'use client';

import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useCallback, useState } from "react";
import Container from "../components/Container";
import ListingCard from "../components/listings/ListingCard";
import { SafeReservation, SafeUser } from "../types";

interface ReservationProps {
  reservations: SafeReservation[];
  currentUser?: SafeUser | null;
}

const Reservations: React.FC<ReservationProps> = ({
  reservations,
  currentUser,
}) => {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState('');
const onCancel = useCallback(async (id: string) => {
  setDeletingId(id);
  try {
    await axios.delete(`/api/reservations/${id}`);
    toast.success("Booking cancelled and deleted");
    router.refresh();
  } catch (error: any) {
    toast.error(error?.response?.data?.message || "Something went wrong.");
  } finally {
    setDeletingId('');
  }
}, [router]);



  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-cyan-50">
      <div className="border-b bg-white shadow-sm">
        <Container>
          <div className="py-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">Bookings</h1>
              <p className="text-slate-600">Manage your bookings</p>
            </div>
            <div className="bg-gradient-to-r from-emerald-500 to-cyan-600 text-white px-4 py-2 rounded-full text-sm font-medium">
              {reservations.length} Booking(s)
            </div>
          </div>
        </Container>
      </div>

      <Container>
        <div className="py-10">
          {reservations.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <div className="mb-4 inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full">
                <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25M9 12.75h6m-6 3h6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold mb-2">No bookings yet</h2>
              <p>When listings get booked, they’ll appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {reservations.map((reservation) => (
                <ListingCard
                  key={reservation.id}
                  data={reservation.listing}
                  reservation={reservation}
                  actionId={reservation.id}
                  onAction={() => onCancel(reservation.id)}
                  disabled={deletingId === reservation.id}
                  actionLabel="Cancel Booking"
                  secondaryAction={() => router.push(`/listings/${reservation.listing.id}`)}
                  secondaryLabel="View Details"
                  currentUser={currentUser}
                  showActions
                />
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};

export default Reservations;
