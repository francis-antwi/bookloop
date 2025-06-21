'use client';

import { useSearchParams, usePathname } from "next/navigation";
import Container from "../Container";
import CategoryBox from "../CategoryBox";
   import { FaHome, FaCar, FaUtensils} from 'react-icons/fa';
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
        <Container>
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
}

export default Categories;
