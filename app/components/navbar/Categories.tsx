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
    description: 'Browse and reserve apartments for short- or long-term stays.',
  },
  {
    label: 'Cars',
    icon: FaCar,
    description: 'Book rental cars by the hour, day, or week.',
  },
  {
    label: 'Event Centers',
    icon: MdEvent,
    description: 'Reserve venues for weddings, conferences, and parties.',
  },
  {
    label: 'Hotel Rooms',
    icon: SiAirbnb,
    description: 'Find and reserve hotel accommodations that suit your needs.',
  },
  {
    label: 'Tour Services',
    icon: GiCommercialAirplane,
    description: 'Book guided tours for cultural or adventure experiences.',
  },
  {
    label: 'Event Tickets',
    icon: GiTheaterCurtains,
    description: 'Secure tickets for concerts, shows, and sports events.',
  },
  {
    label: 'Restaurants',
    icon: FaUtensils,
    description: 'Make dining reservations at your favorite spots.',
  },
  {
    label: 'Appointments',
    icon: AiOutlineCalendar,
    description: 'Book appointments with professionals or services.',
  },
];

const Categories = () => {
  const params = useSearchParams();
  const category = params?.get('category');
  const pathname = usePathname();
  const isMainPage = pathname === '/';

  if (!isMainPage) return null;

  return (
    <div className="bg-gradient-to-b from-white via-gray-50/30 to-white">
      <Container>
        <div className="py-4 md:py-6">
          {/* Header */}
          <div className="mb-4 md:mb-6 text-center">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
              What are you looking for?
            </h2>
            <p className="text-xs md:text-sm text-gray-600 max-w-2xl mx-auto">
              Discover and book from our wide range of services
            </p>
          </div>

          {/* Centered Horizontal Category Scroll */}
          <div className="overflow-x-auto scrollbar-hide scroll-smooth">
            <div className="flex justify-center w-max mx-auto gap-2 md:gap-3 px-2">
              {categories.map((item) => (
                <div key={item.label} className="flex-shrink-0 w-20 md:w-20 lg:w-24">
                  <CategoryBox
                    label={item.label}
                    selected={category === item.label}
                    icon={item.icon}
                    description={item.description}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>

      {/* Hide native scrollbars */}
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
