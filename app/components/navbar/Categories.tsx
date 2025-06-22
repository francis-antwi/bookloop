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
    description: 'Short-term and long-term apartment stays.',
  },
  {
    label: 'Cars',
    icon: FaCar,
    description: 'Rental cars by hour, day, or week.',
  },
  {
    label: 'Event Centers',
    icon: MdEvent,
    description: 'Venues for weddings, conferences, and parties.',
  },
  {
    label: 'Hotel Rooms',
    icon: SiAirbnb,
    description: 'Hotel accommodations with flexible filters.',
  },
  {
    label: 'Tour Services',
    icon: GiCommercialAirplane,
    description: 'Guided tours with transport and itineraries.',
  },
  {
    label: 'Event Tickets',
    icon: GiTheaterCurtains,
    description: 'Tickets for concerts, shows, and sports events.',
  },
  {
    label: 'Restaurants',
    icon: FaUtensils,
    description: 'Dining reservations with instant confirmation.',
  },
  {
    label: 'Appointments',
    icon: AiOutlineCalendar,
    description: 'Book services with flexible scheduling.',
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
    <Container>
      <div className="mb-4 md:mb-6 text-center">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-1">
          What are you looking for?
        </h2>
        <p className="text-xs md:text-sm text-gray-600 max-w-2xl mx-auto">
          Discover and book from our wide range of services
        </p>
      </div>
      
      <div className="pt-4 flex flex-row items-center justify-between overflow-x-auto">
        {categories.map((item) => (
          <CategoryBox
            key={item.label}
            label={item.label}
            selected={category === item.label}
            icon={item.icon}
          />
        ))}
      </div>
    </Container>
  );
};

export default Categories;