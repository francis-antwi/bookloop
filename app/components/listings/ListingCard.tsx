'use client';

import { SafeListing, SafeUser } from "@/app/types";
import { Reservation } from "@prisma/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import Button from "../Button";
import Image from "next/image";
import HeartButton from "../HeartButton";

interface ListingCardProps {
  data: SafeListing;
  reservation?: Reservation;
  onAction?: (id: string) => void;
  onEdit?: (listing: SafeListing) => void;
  disabled?: boolean;
  actionLabel?: string;
  actionId?: string;
  currentUser?: SafeUser | null;
}

const ListingCard: React.FC<ListingCardProps> = ({
  data,
  reservation,
  onAction,
  onEdit,
  disabled,
  actionLabel,
  actionId = "",
  currentUser,
}) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onAction?.(actionId);
    },
    [onAction, actionId, disabled]
  );

  const price = useMemo(() => {
    return reservation ? reservation.totalPrice : data.price;
  }, [reservation, data.price]);

  const reservationDate = useMemo(() => {
    if (!reservation) return null;
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
  }, [reservation]);

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.imageSrc.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % data.imageSrc.length);
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.imageSrc.length === 0) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? data.imageSrc.length - 1 : prevIndex - 1
    );
  };

  const currentImageSrc = data.imageSrc[currentImageIndex];

  return (
    <div
      onClick={() => router.push(`/listings/${data.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl z-0"
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100">
        {/* Image Section */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {currentImageSrc ? (
            <>
              {/* Loading State */}
              {isImageLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              )}
              
              <Image
                src={currentImageSrc}
                alt={`${data.address} - Image ${currentImageIndex + 1}`}
                fill
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"  
                className={`object-cover transition-all duration-500 ${
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                } group-hover:scale-110`}
                onLoad={() => setIsImageLoading(false)}
              />

              {/* Image Navigation - Only show on hover and if multiple images */}
              {data.imageSrc.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className={`absolute top-1/2 left-3 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 w-9 h-9 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
                      isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className={`absolute top-1/2 right-3 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 w-9 h-9 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
                      isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </button>
                </>
              )}

              {/* Image Counter */}
              {data.imageSrc.length > 1 && (
                <div className={`absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  {currentImageIndex + 1}/{data.imageSrc.length}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col justify-center items-center w-full h-full text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21,15 16,10 5,21"></polyline>
              </svg>
              <span className="text-sm font-medium">No Images</span>
            </div>
          )}

          {/* Heart Button */}
          <div className="absolute top-3 right-3 z-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-lg">
              <HeartButton listingId={data.id} currentUser={currentUser} />
            </div>
          </div>

          {/* Category Badge */}
          {data.category && (
            <div className="absolute top-3 left-3 z-10">
              <span className="bg-blue-500/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold">
                {data.category}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-5">
          {/* Address */}
          <div className="mb-3">
            <h3 className="font-bold text-lg text-gray-900 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors duration-200">
              {data.address}
            </h3>
          </div>

          {/* Reservation Date or Category */}
          <div className="mb-4">
            {reservationDate ? (
              <div className="flex items-center text-sm text-gray-600">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="font-medium">{reservationDate}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                {data.category}
              </div>
            )}
          </div>

          {/* Available Dates for Appointments */}
          {data.category === 'Appointments' && data.availableDates?.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-start">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 mt-0.5 text-green-600 flex-shrink-0">
                  <path d="M9 11l3 3l8-8"></path>
                  <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9s4.03-9 9-9c1.59 0 3.07.41 4.36 1.14"></path>
                </svg>
                <div>
                  <div className="text-sm font-semibold text-green-800 mb-1">Available Dates</div>
                  <div className="flex flex-wrap gap-1">
                    {data.availableDates.slice(0, 3).map((date, index) => (
                      <span key={index} className="inline-block bg-white px-2 py-1 rounded text-xs font-medium text-green-700 border border-green-200">
                        {format(new Date(date), 'MMM dd')}
                      </span>
                    ))}
                    {data.availableDates.length > 3 && (
                      <span className="inline-block px-2 py-1 text-xs text-green-600 font-medium">
                        +{data.availableDates.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-baseline">
              <span className="text-2xl font-bold text-gray-900">GH₵{typeof price === "number" ? price.toFixed(2) : "0.00"}
</span>
              {!reservation && (
                <span className="text-sm text-gray-500 ml-1"></span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {(onEdit || (onAction && actionLabel)) && (
            <div className="flex gap-2 pt-3 border-t border-gray-100">
              {onEdit && (
                <Button
                  disabled={disabled}
                  small
                  label="Edit Listing"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(data);
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border-0"
                />
              )}

              {onAction && actionLabel && (
                <Button
                  disabled={disabled}
                  small
                  label={actionLabel}
                  onClick={handleCancel}
                  className="flex-1"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;