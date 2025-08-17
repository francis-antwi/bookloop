'use client';

import { useSearchParams, usePathname } from "next/navigation";
import Container from "../Container";
import CategoryBox from "../CategoryBox";
import { FaHome, FaCar, FaUtensils } from 'react-icons/fa';
import { GiCommercialAirplane, GiTheaterCurtains } from 'react-icons/gi';
import { SiAirbnb } from 'react-icons/si';
import { MdEvent } from 'react-icons/md';
import { AiOutlineCalendar } from 'react-icons/ai';

export const categories = [
  {
    label: 'Apartments',
    icon: FaHome,
    description: 'Browse and reserve apartments for short-term or long-term stays, suitable for business, vacation, or personal use.',
  },
  {
    label: 'Cars',
    icon: FaCar,
    description: 'Book a wide range of rental cars for travel, business, or leisure — available by the hour, day, or week.',
  },
  {
    label: 'Event Centers',
    icon: MdEvent,
    description: 'Reserve venues for weddings, conferences, parties, and other special events with customizable time slots and capacities.',
  },
  {
    label: 'Hotel Rooms',
    icon: SiAirbnb,
    description: 'Find and reserve hotel accommodations that suit your travel needs with filters for price, location, and amenities.',
  },
  {
    label: 'Tour Services',
    icon: GiCommercialAirplane,
    description: 'Book guided tour services for city tours, adventure trips, or cultural experiences, complete with transport and itineraries.',
  },
  {
    label: 'Event Tickets',
    icon: GiTheaterCurtains,
    description: 'Secure tickets for concerts, theater shows, sports events, and more — including seat selection where applicable.',
  },
  {
    label: 'Restaurants',
    icon: FaUtensils,
    description: 'Make dining reservations at popular restaurants, choose your preferred time, and receive confirmation instantly.',
  },
  {
    label: 'Appointments',
    icon: AiOutlineCalendar,
    description: 'Book appointments for services like salons, spas, doctor visits, and consultations with flexible scheduling options.',
  },
];

const Categories = () => {
  const params = useSearchParams();
  const category = params?.get('category');
  const pathname = usePathname();
  const isMainPage = pathname === '/';

  if (!isMainPage) {
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-white via-gray-50/30 to-white">
      <Container>
        <div className="py-2">
          {/* Header */}
          <div className="mb-1F text-center">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              What are you looking for?
            </h2>
            <p className="text-xs text-gray-600 max-w-2xl mx-auto mb-2">
              Discover and book from our wide range of services
            </p>
          </div>

          {/* Scrollable Categories */}
          <div className="overflow-x-auto scrollbar-hide scroll-smooth">
            <div className="flex flex-nowrap justify-start sm:justify-center gap-2 px-1">
              {categories.map((item) => (
                <div
                  key={item.label}
                  className="flex-shrink-0 w-24 h-24" // Increased to w-24 h-24 for better text visibility
                >
                  <CategoryBox
                    label={item.label}
                    selected={category === item.label}
                    icon={item.icon}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Selected Category Info */}
          {category && (
            <div className="mt-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg">
                  {categories.find(cat => cat.label === category)?.icon && (
                    <div className="w-4 h-4 text-blue-600">
                      {(() => {
                        const IconComponent = categories.find(cat => cat.label === category)?.icon;
                        return IconComponent ? <IconComponent size={16} /> : null;
                      })()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base text-blue-900 mb-1">
                    {category}
                  </h3>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {categories.find(cat => cat.label === category)?.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Hide scrollbars */}
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default Categories;