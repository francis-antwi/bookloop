'use client';

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { differenceInDays, eachDayOfInterval } from "date-fns";
import axios from "axios";
import toast from "react-hot-toast";
import { Calendar, Clock, MapPin, Star, Users, Wifi, Car, Coffee, ChevronDown, ChevronUp, Heart, Share2, MessageCircle } from "lucide-react";
import Container from "@/app/components/Container";
import ListingHead from "@/app/components/listings/ListingHead";
import ListingReservation from "@/app/components/listings/ListingReservation";
import ListingInfo from "@/app/components/listings/ListingInfo";
import { categories } from "@/app/components/navbar/Categories";
import useLoginModal from "@/app/hooks/useLoginModal";
import { SafeListing, SafeUser } from "@/app/types";
import { Reservation } from "@prisma/client";

const initialDateRange = {
  startDate: new Date(),
  endDate: new Date(),
  key: 'selection'
};

interface ListingClientProps {
  reservations?: Reservation[];
  listing: SafeListing & {
    user: SafeUser;
    availableDates?: string[];
  };
  currentUser?: SafeUser | null;
}

const ListingClient: React.FC<ListingClientProps> = ({
  reservations = [],
  listing,
  currentUser
}) => {
  
  const loginModal = useLoginModal();
  const router = useRouter();
  const [showAllDates, setShowAllDates] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const disabledDates = useMemo(() => {
    let dates: Date[] = [];
    reservations.forEach((reservation) => {
      const range = eachDayOfInterval({
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate)
      });
      dates = [...dates, ...range];
    });
    return dates;
  }, [reservations]);

  const [isLoading, setIsLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(listing.price);
  const [dateRange, setDateRange] = useState(initialDateRange);
  
useEffect(() => {
  if (dateRange.startDate && dateRange.endDate) {
    const dayCount = differenceInDays(
      new Date(dateRange.endDate),
      new Date(dateRange.startDate)
    );

    if (dayCount > 0 && listing.price) {
      setTotalPrice(dayCount * listing.price);
    } else {
      setTotalPrice(listing.price);
    }
  }
}, [dateRange, listing.price]);
const onCreateReservation = useCallback(() => {
    if (!currentUser) {
        return loginModal.onOpen();
    }

    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // Check if the startDate is before the endDate and the duration is at least one day
    if (startDate >= endDate) {
        toast.error('Start date must be before end date.');
        return;
    }

    // Calculate the duration in milliseconds
    const duration = endDate.getTime() - startDate.getTime();

    // Check if the duration is at least one day (86400000 ms in a day)
    if (duration < 86400000) {
        toast.error('Booking duration must be at least one day.');
        return;
    }

    setIsLoading(true);

    const reservationData = {
        totalPrice,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        listingId: listing.id,
        contactPhone: listing.contactPhone || '',
        email: listing.email || '',
    };

    console.log("Sending reservation data:", reservationData);

    axios.post('/api/reservations', reservationData)
        .then((response) => {
            toast.success('Listing booked!');
            setDateRange(initialDateRange);
            router.refresh();
        })
        .catch((error) => {
            console.error("Booking Error:", error);
            
            // Extract the error message from the server response
            let errorMessage = 'Something went wrong';
            
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else if (error.response.data && error.response.data.error) {
                    errorMessage = error.response.data.error;
                } else {
                    errorMessage = `Error: ${error.response.status}`;
                }
            } else if (error.request) {
                // The request was made but no response was received
                errorMessage = 'No response from server. Please try again later.';
            } else {
                // Something happened in setting up the request that triggered an Error
                errorMessage = error.message || errorMessage;
            }
            
            toast.error(errorMessage);
        })
        .finally(() => {
            setIsLoading(false);
        });
}, [
    totalPrice,
    dateRange,
    listing.id,
    router,
    currentUser,
    loginModal,
    initialDateRange
]);

  const category = categories.find((item) => item.label === listing.category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 mt-8">
      <Container>
        <div className="max-w-screen-xl mx-auto">
          {/* Enhanced Breadcrumb Navigation */}
          <div className="py-4 mb-6">
            <nav className="flex items-center space-x-2 text-sm text-gray-500">
              <button className="hover:text-gray-700 transition-colors">Home</button>
              <span>/</span>
              <button className="hover:text-gray-700 transition-colors">Listings</button>
              <span>/</span>
              <span className="text-gray-900 font-medium truncate">{listing.title}</span>
            </nav>
          </div>

          {/* Modern Header Section */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100/50 overflow-hidden mb-8 ">
            <ListingHead
              title={listing.title}
              imageSrc={listing.imageSrc}
              id={listing.id}
              currentUser={currentUser}
              listing={listing}
            />
            
            {/* Enhanced Action Bar */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{listing.address}</span>
                  </div>
                </div>
                
                                <div className="flex items-center gap-3">
                            <button
                                    onClick={() => {
                                    if (navigator.share) {
                                      navigator
                                        .share({
                                          title: 'BookLoop Services',
                                          text: 'Check out this amazing listing on BookLoops!',
                                          url: window.location.href,
                                        })
                                        .then(() => console.log('Shared successfully'))
                                        .catch((error) => console.error('Error sharing:', error));
                                    } else {
                                      navigator.clipboard.writeText(window.location.href);
                                      alert('Link copied to clipboard!');
                                    }
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                      <Share2 className="w-4 h-4" />
                                      <span className="text-sm font-medium">Share</span>
                                    </button>

              
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-8">
              {/* Tab Navigation */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100/50 mb-6">
                <div className="flex border-b border-gray-100">
                  {[
                    { id: 'overview', label: 'Overview', icon: Users },
                    { id: 'availability', label: 'Availability', icon: Calendar },
                 
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors border-b-2 ${
                        activeTab === tab.id
                          ? 'text-blue-600 border-blue-600 bg-blue-50/30'
                          : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      {/* Host Information */}
                      <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {listing.user.name?.[0] || 'H'}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Posted by {listing.user.name}</p>
                          <p className="text-sm text-gray-500">Joined • {listing.user.createdAt}</p>
                        </div>
                        <div className="ml-auto">
                         <a
href={`tel:+233${listing.contactPhone}`}
  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
>
  <MessageCircle className="w-4 h-4" />
  <span className="text-sm font-medium">Contact</span>
</a>

                        </div>
                      </div>

                     
                      {/* Original ListingInfo Component */}
                      <div className="border border-gray-100 rounded-2xl p-6 bg-white">
                        <ListingInfo listing={listing} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'availability' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Dates</h3>
                        {listing.availableDates && listing.availableDates.length > 0 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {listing.availableDates
                                .slice(0, showAllDates ? undefined : 6)
                                .map((date, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl"
                                >
                                  <Calendar className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-medium text-green-800">
                                    {new Date(date).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              ))}
                            </div>
                            
                            {listing.availableDates.length > 6 && (
                              <button
                                onClick={() => setShowAllDates(!showAllDates)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
                              >
                                {showAllDates ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    Show less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Show all {listing.availableDates.length} dates
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No specific available dates listed</p>
                            <p className="text-sm text-gray-400 mt-1">Check the booking calendar for availability</p>
                          </div>
                        )}
                      </div>

                      {/* Booking Tips */}
                      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                        <h4 className="font-semibold text-blue-900 mb-3">💡 Booking Tips</h4>
                        <ul className="space-y-2 text-sm text-blue-800">
                          <li>• Book early for better rates and availability</li>
                          <li>• Weekdays often have lower prices than weekends</li>
                       
                        </ul>
                      </div>
                    </div>
                  )}


                  
                </div>
              </div>
            </div>

            {/* Right Column - Booking Widget */}
            <div className="lg:col-span-4">
              <div className="sticky top-6">
                <div className="bg-white rounded-3xl shadow-lg border border-gray-100/50 overflow-hidden">
                  {/* Price Header */}
                  <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold">GH₵ {listing.price}</span>
                    </div>
                  </div>

                  {/* Booking Component */}
                  <div className="p-6">
                    <ListingReservation
                      price={listing.price}
                      totalPrice={totalPrice}
                      onChangeDate={(value) => setDateRange(value)}
                      dateRange={dateRange}
                      onSubmit={onCreateReservation}
                      disabled={isLoading}
                      disabledDates={disabledDates}
                    />
                  </div>

                 
                </div>

               
              </div>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default ListingClient;