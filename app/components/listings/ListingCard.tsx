'use client';

import { SafeListing, SafeUser } from "@/app/types";
import { Reservation } from "@prisma/client";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import Button from "../Button";
import Image from "next/image";
import HeartButton from "../HeartButton";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

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
  // --------------------------------------------------------------------------
  // HOOKS & STATE
  // --------------------------------------------------------------------------
  
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  // --------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------

  const price = useMemo(() => {
    return reservation ? reservation.totalPrice : data.price;
  }, [reservation, data.price]);

  const reservationDate = useMemo(() => {
    if (!reservation) return null;
    const start = new Date(reservation.startDate);
    const end = new Date(reservation.endDate);
    return `${format(start, 'PP')} - ${format(end, 'PP')}`;
  }, [reservation]);

  const currentImageSrc = data.imageSrc[currentImageIndex];
  const hasMultipleImages = data.imageSrc.length > 1;
  const hasImages = data.imageSrc.length > 0;
  const isAppointment = data.category === 'Appointments';
  const hasAvailableDates = isAppointment && data.availableDates?.length > 0;

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------

  const handleCancel = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onAction?.(actionId);
    },
    [onAction, actionId, disabled]
  );

  const handleCardClick = useCallback(() => {
    router.push(`/listings/${data.id}`);
  }, [router, data.id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleNextImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasImages) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % data.imageSrc.length);
  }, [hasImages, data.imageSrc.length]);

  const handlePrevImage = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasImages) return;
    setCurrentImageIndex((prevIndex) =>
      prevIndex === 0 ? data.imageSrc.length - 1 : prevIndex - 1
    );
  }, [hasImages, data.imageSrc.length]);

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(data);
  }, [onEdit, data]);

  const handleImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  const renderImagePlaceholder = () => (
    <div className="flex flex-col justify-center items-center w-full h-full text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
      <svg 
        width="48" 
        height="48" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className="mb-3 opacity-60"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <polyline points="21,15 16,10 5,21" />
      </svg>
      <span className="text-sm font-medium text-gray-500">No Images Available</span>
    </div>
  );

  const renderNavigationButton = (direction: 'prev' | 'next', onClick: (e: React.MouseEvent) => void) => {
    const isNext = direction === 'next';
    const translateClass = isNext ? 'translate-x-2' : '-translate-x-2';
    
    return (
      <button
        onClick={onClick}
        className={`absolute top-1/2 ${isNext ? 'right-3' : 'left-3'} transform -translate-y-1/2 
          bg-white/95 backdrop-blur-sm hover:bg-white hover:scale-110 
          text-gray-800 w-10 h-10 rounded-full shadow-lg 
          transition-all duration-300 ease-out flex items-center justify-center
          hover:shadow-xl border border-white/20
          ${isHovered ? 'opacity-100 translate-x-0' : `opacity-0 ${translateClass}`}`}
        aria-label={`${direction === 'next' ? 'Next' : 'Previous'} image`}
      >
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points={isNext ? "9,18 15,12 9,6" : "15,18 9,12 15,6"} />
        </svg>
      </button>
    );
  };

  const renderImageCounter = () => (
    <div className={`absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm text-white 
      px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide
      transition-all duration-300 border border-white/10
      ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      {currentImageIndex + 1} / {data.imageSrc.length}
    </div>
  );

  const renderCategoryBadge = () => (
    <div className="absolute top-4 left-4 z-10">
      <span className="bg-gradient-to-r from-blue-500 to-blue-600 backdrop-blur-sm 
        text-white px-3 py-1.5 rounded-full text-xs font-bold tracking-wide
        shadow-lg border border-blue-400/20">
        {data.category}
      </span>
    </div>
  );

  const renderAvailableDates = () => (
    <div className="mb-5 p-4 bg-gradient-to-r from-emerald-50 to-green-50 
      rounded-xl border border-emerald-200/50 shadow-sm">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mt-0.5">
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-emerald-600"
          >
            <path d="M9 11l3 3l8-8" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-emerald-800 mb-2">Available Dates</div>
          <div className="flex flex-wrap gap-2">
            {data.availableDates!.slice(0, 3).map((date, index) => (
              <span 
                key={index} 
                className="inline-flex items-center bg-white px-3 py-1.5 rounded-lg 
                  text-xs font-semibold text-emerald-700 border border-emerald-200
                  shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {format(new Date(date), 'MMM dd')}
              </span>
            ))}
            {data.availableDates!.length > 3 && (
              <span className="inline-flex items-center px-3 py-1.5 text-xs 
                text-emerald-600 font-bold bg-emerald-100/50 rounded-lg">
                +{data.availableDates!.length - 3} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="flex gap-3 pt-4 border-t border-gray-100">
      {onEdit && (
        <Button
          disabled={disabled}
          small
          label="Edit Listing"
          onClick={handleEditClick}
          className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200
            hover:border-gray-300 transition-all duration-200 font-medium"
        />
      )}
      {onAction && actionLabel && (
        <Button
          disabled={disabled}
          small
          label={actionLabel}
          onClick={handleCancel}
          className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700
            text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
        />
      )}
    </div>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group cursor-pointer transition-all duration-500 ease-out
        hover:scale-[1.03] hover:shadow-2xl hover:-translate-y-1 
        mt-6 relative z-0"
    >
      <div className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl 
        transition-all duration-500 border border-gray-100 hover:border-gray-200
        backdrop-blur-sm">
        
        {/* ===== IMAGE SECTION ===== */}
        <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
          {hasImages ? (
            <>
              {/* Loading State */}
              {isImageLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
              )}
              
              {/* Main Image */}
              <Image
                src={currentImageSrc}
                alt={`${data.address} - Image ${currentImageIndex + 1}`}
                fill
                className={`object-cover transition-all duration-700 ease-out
                  ${isImageLoading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'} 
                  group-hover:scale-110`}
                onLoad={handleImageLoad}
                priority={currentImageIndex === 0}
              />

              {/* Navigation Buttons */}
              {hasMultipleImages && (
                <>
                  {renderNavigationButton('prev', handlePrevImage)}
                  {renderNavigationButton('next', handleNextImage)}
                </>
              )}

              {/* Image Counter */}
              {hasMultipleImages && renderImageCounter()}
            </>
          ) : (
            renderImagePlaceholder()
          )}

          {/* Heart Button */}
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white/90 backdrop-blur-md rounded-full p-2 shadow-lg 
              hover:bg-white hover:scale-110 transition-all duration-300 border border-white/20">
              <HeartButton listingId={data.id} currentUser={currentUser} />
            </div>
          </div>

          {/* Category Badge */}
          {data.category && renderCategoryBadge()}
        </div>

        {/* ===== CONTENT SECTION ===== */}
        <div className="p-6">
          {/* Address/Title */}
          <div className="mb-4">
            <h3 className="font-bold text-xl text-gray-900 line-clamp-2 leading-tight 
              group-hover:text-blue-600 transition-colors duration-300">
              {data.address}
            </h3>
          </div>

          {/* Reservation Date or Category */}
          <div className="mb-5">
            {reservationDate ? (
              <div className="flex items-center text-sm text-gray-600 bg-gray-50 
                px-3 py-2 rounded-lg border border-gray-100">
                <svg 
                  width="16" 
                  height="16" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  className="mr-2 text-gray-500"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span className="font-semibold">{reservationDate}</span>
              </div>
            ) : (
              <div className="text-sm text-gray-500 font-medium uppercase tracking-wide">
                {data.category}
              </div>
            )}
          </div>

          {/* Available Dates for Appointments */}
          {hasAvailableDates && renderAvailableDates()}

          {/* Price */}
          <div className="mb-5">
            <div className="flex items-baseline space-x-1">
              <span className="text-3xl font-bold text-gray-900 tracking-tight">
                GH₵{price.toFixed(2)}
              </span>
              {!reservation && (
                <span className="text-sm text-gray-500 font-medium">per night</span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {(onEdit || (onAction && actionLabel)) && renderActionButtons()}
        </div>
      </div>
    </div>
  );
};

export default ListingCard;