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

  const handleNextImage = () => {
    if (imageSrc.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % imageSrc.length);
  };

  const handlePrevImage = () => {
    if (imageSrc.length === 0) return;
    setCurrentImageIndex((prev) =>
      prev === 0 ? imageSrc.length - 1 : prev - 1
    );
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const address = listing.address || "Address not provided";
  const user = listing.user;

  return (
    <>
      {/* Enhanced Title Section */}
      <div className="pt-8 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <Heading title={title} subtitle={address} />
          </div>
          <div className="flex items-center gap-3">
            {/* Image Counter */}
            {imageSrc.length > 1 && (
              <div className="bg-black/10 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300">
                {currentImageIndex + 1} / {imageSrc.length}
              </div>
            )}
            {/* Heart Button */}
            <div className="bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-lg">
              <HeartButton listingId={id} currentUser={currentUser} />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Image Gallery */}
      <div className="relative group">
        {/* Main Image Container */}
        <div 
          className="relative w-full h-[65vh] cursor-zoom-in overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl"
          onClick={openModal}
        >
          {/* Loading Skeleton */}
          {imageLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-2xl" />
          )}
          
          <Image
            alt={`Image ${currentImageIndex + 1} of ${title}`}
            src={imageSrc[currentImageIndex]}
            fill
            className={`object-cover transition-all duration-500 ${
              imageLoading ? 'opacity-0' : 'opacity-100'
            } group-hover:scale-105`}
            onLoad={() => setImageLoading(false)}
            priority
          />

          {/* Gradient Overlays for Better Button Visibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Navigation Arrows - Only show if multiple images */}
          {imageSrc.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
                className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 w-12 h-12 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
                className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/90 backdrop-blur-sm hover:bg-white text-gray-800 w-12 h-12 rounded-full shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </>
          )}

          {/* Zoom Indicator */}
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline mr-1">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            Click to zoom
          </div>
        </div>

        {/* Thumbnail Strip */}
        {imageSrc.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {imageSrc.map((src, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`relative flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden transition-all duration-200 ${
                  index === currentImageIndex
                    ? 'ring-2 ring-blue-500 shadow-lg scale-105'
                    : 'hover:scale-105 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={src}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Fullscreen Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl mx-auto">
            <div className="relative">
              <Image
                alt={`Fullscreen view of ${title}`}
                src={imageSrc[currentImageIndex]}
                width={1400}
                height={900}
                className="object-contain w-full max-h-[90vh] rounded-lg"
              />

              {/* Modal Controls */}
              <div className="absolute top-4 right-4 flex gap-2">
                {/* Image Counter in Modal */}
                {imageSrc.length > 1 && (
                  <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
                    {currentImageIndex + 1} / {imageSrc.length}
                  </div>
                )}
                {/* Close Button */}
                <button
                  onClick={closeModal}
                  className="bg-white/90 backdrop-blur-sm text-gray-800 w-10 h-10 rounded-full hover:bg-white transition-all duration-200 flex items-center justify-center"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>

              {/* Modal Navigation */}
              {imageSrc.length > 1 && (
                <>
                  <button
                    onClick={handlePrevImage}
                    className="absolute top-1/2 left-6 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white w-14 h-14 rounded-full transition-all duration-200 flex items-center justify-center"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15,18 9,12 15,6"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="absolute top-1/2 right-6 transform -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/40 text-white w-14 h-14 rounded-full transition-all duration-200 flex items-center justify-center"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9,18 15,12 9,6"></polyline>
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Modal Thumbnail Strip */}
            {imageSrc.length > 1 && (
              <div className="mt-6 flex justify-center gap-2 overflow-x-auto pb-2">
                {imageSrc.map((src, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative flex-shrink-0 w-16 h-12 rounded-md overflow-hidden transition-all duration-200 ${
                      index === currentImageIndex
                        ? 'ring-2 ring-white shadow-lg'
                        : 'opacity-60 hover:opacity-100'
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

      {/* Listing Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-7 md:gap-10 mt-8">
        <ListingInfo user={user} address={address} />
      </div>
    </>
  );
};

export default ListingHead;