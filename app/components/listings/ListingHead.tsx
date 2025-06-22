'use client';

import { useState, useCallback, useEffect } from "react";
import { SafeUser } from "@/app/types";
import Heading from "../Heading";
import HeartButton from "../HeartButton";
import Image from "next/image";
import { IconType } from "react-icons";
import ListingInfo from "./ListingInfo";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Category {
  icon: IconType;
  label: string;
  description: string;
}

interface Listing {
  user: SafeUser;
  category?: Category;
  description: string;
  address?: string;
  contactPhone: string;
  email: string;
  images: string[];
}

interface ListingHeadProps {
  title: string;
  imageSrc: string[];
  id: string;
  currentUser: SafeUser | null;
  listing: Listing;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ListingHead: React.FC<ListingHeadProps> = ({
  title,
  imageSrc,
  id,
  currentUser,
  listing,
}) => {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isImageTransitioning, setIsImageTransitioning] = useState(false);

  // --------------------------------------------------------------------------
  // COMPUTED VALUES
  // --------------------------------------------------------------------------

  const hasMultipleImages = imageSrc.length > 1;
  const hasImages = imageSrc.length > 0;
  const address = listing.address || "Address not provided";
  const user = listing.user;
  const currentImage = hasImages ? imageSrc[currentImageIndex] : '';

  // --------------------------------------------------------------------------
  // EVENT HANDLERS
  // --------------------------------------------------------------------------

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
    setIsImageTransitioning(false);
  }, []);

  const handleNextImage = useCallback(() => {
    if (!hasImages) return;
    setIsImageTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageSrc.length);
    }, 150);
  }, [hasImages, imageSrc.length]);

  const handlePrevImage = useCallback(() => {
    if (!hasImages) return;
    setIsImageTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex((prev) =>
        prev === 0 ? imageSrc.length - 1 : prev - 1
      );
    }, 150);
  }, [hasImages, imageSrc.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    if (index === currentImageIndex) return;
    setIsImageTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(index);
    }, 150);
  }, [currentImageIndex]);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    document.body.style.overflow = 'unset';
  }, []);

  // --------------------------------------------------------------------------
  // KEYBOARD NAVIGATION
  // --------------------------------------------------------------------------

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isModalOpen) return;
      
      switch (event.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevImage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNextImage();
          break;
      }
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, closeModal, handlePrevImage, handleNextImage]);

  // --------------------------------------------------------------------------
  // RENDER HELPERS
  // --------------------------------------------------------------------------

  const renderNavigationButton = (
    direction: 'prev' | 'next',
    onClick: () => void,
    variant: 'gallery' | 'modal' = 'gallery'
  ) => {
    const isNext = direction === 'next';
    const isModal = variant === 'modal';
    
    const baseClasses = `absolute top-1/2 transform -translate-y-1/2 rounded-full 
      transition-all duration-300 flex items-center justify-center
      hover:scale-110 active:scale-95`;
    
    const variantClasses = isModal
      ? `${isNext ? 'right-6' : 'left-6'} bg-white/20 backdrop-blur-md hover:bg-white/40 
         text-white w-14 h-14 border border-white/20`
      : `${isNext ? 'right-4' : 'left-4'} bg-white/95 backdrop-blur-sm hover:bg-white 
         text-gray-800 w-12 h-12 shadow-lg border border-white/50
         opacity-0 group-hover:opacity-100 hover:shadow-xl`;

    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        className={`${baseClasses} ${variantClasses}`}
        aria-label={`${direction === 'next' ? 'Next' : 'Previous'} image`}
      >
        <svg 
          width={isModal ? "24" : "20"} 
          height={isModal ? "24" : "20"} 
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

  const renderImageCounter = (variant: 'header' | 'gallery' | 'modal' = 'gallery') => {
    if (!hasMultipleImages) return null;

    const variantClasses = {
      header: "bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl text-sm font-semibold text-gray-700 shadow-lg border border-white/50",
      gallery: "bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300",
      modal: "bg-black/70 backdrop-blur-sm text-white px-4 py-2 rounded-xl text-sm font-semibold"
    };

    const positionClasses = {
      header: "",
      gallery: "absolute bottom-4 left-4",
      modal: ""
    };

    return (
      <div className={`${variantClasses[variant]} ${positionClasses[variant]}`}>
        <span className="tabular-nums">
          {currentImageIndex + 1} / {imageSrc.length}
        </span>
      </div>
    );
  };

  const renderThumbnails = (variant: 'gallery' | 'modal' = 'gallery') => {
    if (!hasMultipleImages) return null;

    const containerClasses = variant === 'gallery' 
      ? "mt-6 flex gap-3 overflow-x-auto pb-3 scrollbar-hide"
      : "mt-6 flex justify-center gap-2 overflow-x-auto pb-2";

    const thumbnailClasses = variant === 'gallery'
      ? "relative flex-shrink-0 w-24 h-18 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
      : "relative flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden transition-all duration-300";

    return (
      <div className={containerClasses}>
        {imageSrc.map((src, index) => (
          <button
            key={index}
            onClick={() => handleThumbnailClick(index)}
            className={`${thumbnailClasses} ${
              index === currentImageIndex
                ? variant === 'gallery'
                  ? 'ring-3 ring-blue-500 shadow-xl scale-105 ring-offset-2'
                  : 'ring-2 ring-white shadow-lg'
                : 'opacity-70 hover:opacity-100 hover:scale-105'
            }`}
          >
            <Image
              src={src}
              alt={`Thumbnail ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 96px, 96px"
            />
            {/* Overlay for active state */}
            {index === currentImageIndex && (
              <div className="absolute inset-0 bg-blue-500/10" />
            )}
          </button>
        ))}
      </div>
    );
  };

  const renderZoomIndicator = () => (
    <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-sm text-white 
      px-4 py-2 rounded-xl text-sm font-semibold opacity-0 group-hover:opacity-100 
      transition-all duration-300 flex items-center space-x-2">
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
      <span>Click to zoom</span>
    </div>
  );

  // --------------------------------------------------------------------------
  // MAIN RENDER
  // --------------------------------------------------------------------------

  return (
    <>
      {/* ===== ENHANCED TITLE SECTION ===== */}
      <div className="pt-8 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1 min-w-0">
            <Heading title={title} subtitle={address} />
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Image Counter */}
            {renderImageCounter('header')}
            
            {/* Heart Button */}
            <div className="bg-white/90 backdrop-blur-sm rounded-xl p-2 shadow-lg 
              hover:bg-white hover:scale-110 transition-all duration-300 border border-white/50">
              <HeartButton listingId={id} currentUser={currentUser} />
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODERN IMAGE GALLERY ===== */}
      <div className="relative group">
        {/* Main Image Container */}
        <div 
          className="relative w-full h-[70vh] cursor-zoom-in overflow-hidden 
            rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-3xl
            bg-gradient-to-br from-gray-100 to-gray-200"
          onClick={openModal}
        >
          {/* Loading Skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 
              animate-pulse rounded-3xl" />
          )}
          
          {/* Main Image */}
          {hasImages && (
            <Image
              alt={`Image ${currentImageIndex + 1} of ${title}`}
              src={currentImage}
              fill
              className={`object-cover transition-all duration-700 ease-out
                ${imageLoading || isImageTransitioning ? 'opacity-0 scale-110' : 'opacity-100 scale-100'} 
                group-hover:scale-105`}
              onLoad={handleImageLoad}
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            />
          )}

          {/* Gradient Overlays for Better Button Visibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 
            opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              {renderNavigationButton('prev', handlePrevImage)}
              {renderNavigationButton('next', handleNextImage)}
            </>
          )}

          {/* Image Counter */}
          {renderImageCounter('gallery')}

          {/* Zoom Indicator */}
          {renderZoomIndicator()}
        </div>

        {/* Thumbnail Strip */}
        {renderThumbnails('gallery')}
      </div>

      {/* ===== ENHANCED FULLSCREEN MODAL ===== */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div className="relative w-full max-w-7xl mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="relative">
              {/* Main Modal Image */}
              <div className="relative rounded-2xl overflow-hidden bg-black/20">
                <Image
                  alt={`Fullscreen view of ${title}`}
                  src={currentImage}
                  width={1400}
                  height={900}
                  className={`object-contain w-full max-h-[85vh] transition-opacity duration-300
                    ${isImageTransitioning ? 'opacity-50' : 'opacity-100'}`}
                  priority
                />
              </div>

              {/* Modal Controls */}
              <div className="absolute top-4 right-4 flex gap-3">
                {/* Image Counter in Modal */}
                {renderImageCounter('modal')}
                
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="bg-white/20 backdrop-blur-md text-white w-12 h-12 rounded-xl 
                    hover:bg-white/40 transition-all duration-300 flex items-center justify-center
                    border border-white/20 hover:scale-110"
                  aria-label="Close fullscreen view"
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Modal Navigation */}
              {hasMultipleImages && (
                <>
                  {renderNavigationButton('prev', handlePrevImage, 'modal')}
                  {renderNavigationButton('next', handleNextImage, 'modal')}
                </>
              )}
            </div>

            {/* Modal Thumbnail Strip */}
            {renderThumbnails('modal')}

            {/* Keyboard Instructions */}
            <div className="mt-4 text-center">
              <p className="text-white/70 text-sm">
                Use <kbd className="px-2 py-1 bg-white/20 rounded text-xs">←</kbd> <kbd className="px-2 py-1 bg-white/20 rounded text-xs">→</kbd> to navigate • <kbd className="px-2 py-1 bg-white/20 rounded text-xs">ESC</kbd> to close
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== LISTING INFO SECTION ===== */}
      <div className="grid grid-cols-1 md:grid-cols-7 md:gap-12 mt-12">
        <ListingInfo user={user} address={address} />
      </div>
    </>
  );
};

export default ListingHead;