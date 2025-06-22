'use client';

import { useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
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

  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  if (!isMainPage) return null;

  return (
    <div className="bg-gradient-to-b from-white via-gray-50/30 to-white">
      <Container>
        <div className="py-4 md:py-6">
          <div className="mb-4 md:mb-6 text-center">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
              What are you looking for?
            </h2>
            <p className="text-xs md:text-sm text-gray-600 max-w-2xl mx-auto">
              Discover and book from our wide range of services
            </p>
          </div>

          <div className="overflow-x-auto scrollbar-hide scroll-smooth">
            <div className="flex justify-center w-max mx-auto gap-2 md:gap-3 px-2">
              {categories.map((item) => (
                <div key={item.label} className="flex-shrink-0 w-20 md:w-20 lg:w-24">
                  <CategoryBox
                    label={item.label}
                    selected={category === item.label}
                    icon={item.icon}
                    description={item.description}
                    isActive={activeLabel === item.label}
                    onActivate={() =>
                      setActiveLabel((prev) => (prev === item.label ? null : item.label))
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Categories;
