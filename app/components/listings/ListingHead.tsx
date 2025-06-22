'use client';

import { useState } from "react";
import { SafeUser } from "@/app/types";
import Heading from "../Heading";
import HeartButton from "../HeartButton";
import Image from "next/image";
import { IconType } from "react-icons";
import ListingInfo from "./ListingInfo";

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

const ListingHead: React.FC<ListingHeadProps> = ({
  title,
  imageSrc,
  id,
  currentUser,
  listing,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Check if images exist
  const hasImages = imageSrc && imageSrc.length > 0;

  const handleNextImage = () => {
    if (!hasImages) return;
    setImageLoading(true);
    setCurrentImageIndex((prev) => (prev + 1) % imageSrc.length);
  };

  const handlePrevImage = () => {
    if (!hasImages) return;
    setImageLoading(true);
    setCurrentImageIndex((prev) =>
      prev === 0 ? imageSrc.length - 1 : prev - 1
    );
  };

  const handleThumbnailClick = (index: number) => {
    if (index !== currentImageIndex) {
      setImageLoading(true);
      setCurrentImageIndex(index);
    }
  };

  const openModal = () => {
    if (hasImages) setIsModalOpen(true);
  };
  
  const closeModal = () => setIsModalOpen(false);

  const address = listing.address || "Address not provided";
  const user = listing.user;

  return (
    <>
      {/* Enhanced Title Section with Glass Morphism */}
      <div className="pt-8 pb-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex-1 space-y-2">
            <Heading title={title} subtitle={address} />
            {listing.category && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-5 h-5 flex items-center justify-center">
                  <listing.category.icon size={16} />
                </div>
                <span className="text-sm font-medium">{listing.category.label}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Enhanced Image Counter */}
            {hasImages && imageSrc.length > 1 && (
              <div className="bg-white/20 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-gray-700/30 px-4 py-2 rounded-2xl text-sm font-semibold text-gray-800 dark:text-gray-200 shadow-lg">
                <span className="text-blue-600 dark:text-blue-400">{currentImageIndex + 1}</span>
                <span className="mx-1 text-gray-400">/</span>
                <span>{imageSrc.length}</span>
              </div>
            )}
            {/* Enhanced Heart Button */}
            <div className="bg-white/30 dark:bg-black/20 backdrop-blur-md border border-white/30 dark:border-gray-700/30 rounded-2xl p-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
              <HeartButton listingId={id} currentUser={currentUser} />
            </div>
          </div>
        </div>
      </div>

      {/* Premium Image Gallery */}
      <div className="relative group">
        {hasImages ? (
          <div className="space-y-6">
            {/* Main Image Container with Enhanced Effects */}
            <div 
              className="relative w-full h-[70vh] cursor-zoom-in overflow-hidden rounded-3xl shadow-2xl transition-all duration-500 hover:shadow-3xl group-hover:scale-[1.01] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900"
              onClick={openModal}
            >
              {/* Advanced Loading Skeleton */}
              {imageLoading && (
                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse rounded-3xl">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" 
                       style={{
                         backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                         transform: 'translateX(-100%)',
                         animation: 'shimmer 2s infinite'
                       }} />
                </div>
              )}
              
              <Image
                alt={`Image ${currentImageIndex + 1} of ${title}`}
                src={imageSrc[currentImageIndex]}
                fill
                className={`object-cover transition-all duration-700 ${
                  imageLoading ? 'opacity-0 scale-110' : 'opacity-100 scale-100'
                } group-hover:scale-105`}
                onLoad={() => setImageLoading(false)}
                priority
              />

              {/* Dynamic Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/10 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              {/* Premium Navigation Arrows */}
              {imageSrc.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                    className="absolute top-1/2 left-6 transform -translate-y-1/2 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white w-14 h-14 rounded-2xl shadow-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center hover:border-white/40"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                    className="absolute top-1/2 right-6 transform -translate-y-1/2 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white w-14 h-14 rounded-2xl shadow-2xl transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center hover:border-white/40"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </button>
                </>
              )}

              {/* Enhanced Zoom Indicator */}
              <div className="absolute bottom-6 right-6 bg-black/60 backdrop-blur-lg border border-white/10 text-white px-4 py-2 rounded-2xl text-sm font-medium opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/70">
                <div className="flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                  <span>Click to expand</span>
                </div>
              </div>

              {/* Image Quality Indicator */}
              <div className="absolute top-6 left-6 bg-green-500/80 backdrop-blur-lg text-white px-3 py-1 rounded-full text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-300">
                HD Quality
              </div>
            </div>

            {/* Premium Thumbnail Strip */}
            {imageSrc.length > 1 && (
              <div className="relative">
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide scroll-smooth">
                  {imageSrc.map((src, index) => (
                    <button
                      key={index}
                      onClick={() => handleThumbnailClick(index)}
                      className={`relative flex-shrink-0 w-24 h-20 rounded-2xl overflow-hidden transition-all duration-300 ${
                        index === currentImageIndex
                          ? 'ring-3 ring-blue-500 shadow-lg scale-105 brightness-100'
                          : 'hover:scale-105 opacity-60 hover:opacity-90 brightness-90 hover:brightness-100'
                      }`}
                    >
                      <Image
                        src={src}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                      {/* Thumbnail overlay effect */}
                      <div className={`absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity duration-300 ${
                        index === currentImageIndex ? 'opacity-0' : 'opacity-100'
                      }`} />
                    </button>
                  ))}
                </div>
                {/* Scroll fade indicators */}
                <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none" />
              </div>
            )}
          </div>
        ) : (
          /* Premium No Image Placeholder */
          <div className="relative w-full h-[70vh] bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-5 dark:opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse" 
                   style={{
                     backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(147, 51, 234, 0.3) 0%, transparent 50%)'
                   }} />
            </div>
            
            <div className="relative z-10 flex items-center justify-center h-full p-8">
              <div className="text-center max-w-md space-y-6">
                {/* Enhanced No Image Icon */}
                <div className="relative mx-auto w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-3xl flex items-center justify-center shadow-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl" />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-gray-400">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                    <polyline points="21,15 16,10 5,21"></polyline>
                  </svg>
                  {/* Floating elements */}
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500/20 rounded-full animate-bounce delay-100" />
                  <div className="absolute -bottom-3 -left-3 w-4 h-4 bg-purple-500/20 rounded-full animate-bounce delay-300" />
                </div>
                
                {/* Enhanced No Image Text */}
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-700 to-gray-900 dark:from-gray-300 dark:to-gray-100 bg-clip-text text-transparent">
                    No Images Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    This listing doesn't have any images yet. Images help showcase the property better and attract more interest.
                  </p>
                </div>

                {/* Call to action for listing owner */}
                <div className="pt-4">
                  <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path>
                    </svg>
                    <span>Contact owner for details</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium Fullscreen Modal */}
      {hasImages && isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/98 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl mx-auto">
            <div className="relative">
              <Image
                alt={`Fullscreen view of ${title}`}
                src={imageSrc[currentImageIndex]}
                width={1400}
                height={900}
                className="object-contain w-full max-h-[90vh] rounded-2xl shadow-2xl"
              />

              {/* Enhanced Modal Controls */}
              <div className="absolute top-6 right-6 flex gap-3">
                {/* Image Counter in Modal */}
                {imageSrc.length > 1 && (
                  <div className="bg-black/70 backdrop-blur-xl border border-white/10 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold">
                    <span className="text-blue-400">{currentImageIndex + 1}</span>
                    <span className="mx-2 text-gray-400">/</span>
                    <span>{imageSrc.length}</span>
                  </div>
                )}
                {/* Enhanced Close Button */}
                <button
                  onClick={closeModal}
                  className="bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white w-12 h-12 rounded-2xl transition-all duration-300 flex items-center justify-center hover:scale-110"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Enhanced Modal Navigation */}
              {imageSrc.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute top-1/2 left-8 transform -translate-y-1/2 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white w-16 h-16 rounded-2xl transition-all duration-300 flex items-center justify-center hover:scale-110"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute top-1/2 right-8 transform -translate-y-1/2 bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 text-white w-16 h-16 rounded-2xl transition-all duration-300 flex items-center justify-center hover:scale-110"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Enhanced Modal Thumbnail Strip */}
            {imageSrc.length > 1 && (
              <div className="mt-8 flex justify-center gap-3 overflow-x-auto pb-4">
                {imageSrc.map((src, index) => (
                  <button
                    key={index}
                    onClick={() => handleThumbnailClick(index)}
                    className={`relative flex-shrink-0 w-20 h-16 rounded-xl overflow-hidden transition-all duration-300 ${
                      index === currentImageIndex
                        ? 'ring-2 ring-white shadow-xl scale-110'
                        : 'opacity-50 hover:opacity-80 hover:scale-105'
                    }`}
                  >
                    <Image
                      src={src}
                      alt={`Modal thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Enhanced Listing Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-7 md:gap-12 mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <ListingInfo user={user} address={address} />
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </>
  );
};

export default ListingHead;