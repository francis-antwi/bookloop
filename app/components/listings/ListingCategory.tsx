'use client';

import { SafeListing } from "@/app/types";

interface ListingCategoryProps {
  data: SafeListing;
}

const ListingCategory: React.FC<ListingCategoryProps> = ({ data }) => {
  if (!data) return null;

  const {
    category,
    bedrooms,
    bathrooms,
    furnished,
    address,
    floor,
    make,
    model,
    year,
    seats,
    fuelType,
    capacity,
    rooms,
    hasStage,
    parkingAvailable,
    cuisineType,
    seatingCapacity,
    openingHours,
    deliveryAvailable,
    menuHighlights,
    serviceType,
    availableDates,
    duration,
    requiresBooking,
    serviceProvider,
  } = data;

  return (
    <div className="grid gap-2 text-neutral-700">
      {/* Apartments */}
      {category === 'Apartments' && (
        <>
          {bedrooms !== undefined && <div>Bedrooms: {bedrooms}</div>}
          {bathrooms !== undefined && <div>Bathrooms: {bathrooms}</div>}
          {furnished !== undefined && <div>Furnished: {furnished ? 'Yes' : 'No'}</div>}
          {floor !== undefined && <div>Floor: {floor}</div>}
        </>
      )}

      {/* Cars */}
      {category === 'Cars' && (
        <>
          {make && <div>Make: {make}</div>}
          {model && <div>Model: {model}</div>}
          {year !== undefined && <div>Year: {year}</div>}
          {seats !== undefined && <div>Seats: {seats}</div>}
          {fuelType && <div>Fuel Type: {fuelType}</div>}
        </>
      )}

      {/* Event Centers */}
      {category === 'Event Centers' && (
        <>
          {capacity !== undefined && <div>Capacity: {capacity}</div>}
          {rooms !== undefined && <div>Rooms: {rooms}</div>}
          {hasStage !== undefined && <div>Has Stage: {hasStage ? 'Yes' : 'No'}</div>}
          {parkingAvailable !== undefined && <div>Parking Available: {parkingAvailable ? 'Yes' : 'No'}</div>}
        </>
      )}

      {/* Hotel Rooms */}
      {category === 'Hotel Rooms' && (
        <>
          {bedrooms !== undefined && <div>Bedrooms: {bedrooms}</div>}
          {bathrooms !== undefined && <div>Bathrooms: {bathrooms}</div>}
          {furnished !== undefined && <div>Furnished: {furnished ? 'Yes' : 'No'}</div>}
          {floor !== undefined && <div>Floor: {floor}</div>}
          {capacity !== undefined && <div>Capacity: {capacity}</div>}
          {/* Add more hotel-specific fields as needed */}
        </>
      )}

      {/* Tour Services */}
      {category === 'Tour Services' && (
        <>
          {serviceType && <div>Service Type: {serviceType}</div>}
          {availableDates && <div>Available Dates: {availableDates}</div>}
          {duration !== undefined && <div>Duration: {duration} minutes</div>}
          {requiresBooking !== undefined && <div>Requires Booking: {requiresBooking ? 'Yes' : 'No'}</div>}
          {serviceProvider && <div>Service Provider: {serviceProvider}</div>}
        </>
      )}

      {/* Event Tickets */}
      {category === 'Event Tickets' && (
        <>
          {/* You can add ticket-specific fields here */}
          {availableDates && <div>Event Date(s): {availableDates}</div>}
          {/* Add more event ticket specific info */}
        </>
      )}

      {/* Restaurants */}
      {category === 'Restaurants' && (
        <>
          {cuisineType && <div>Cuisine Type: {cuisineType}</div>}
          {seatingCapacity !== undefined && <div>Seating Capacity: {seatingCapacity}</div>}
          {openingHours && <div>Opening Hours: {openingHours}</div>}
          {deliveryAvailable !== undefined && <div>Delivery Available: {deliveryAvailable ? 'Yes' : 'No'}</div>}
          {menuHighlights && <div>Menu Highlights: {menuHighlights}</div>}
        </>
      )}

      {/* Appointments */}
      {category === 'Appointments' && (
        <>
          {serviceType && <div>Service Type: {serviceType}</div>}
          {availableDates && <div>Available Dates: {availableDates}</div>}
          {duration !== undefined && <div>Duration: {duration} minutes</div>}
          {requiresBooking !== undefined && <div>Requires Booking: {requiresBooking ? 'Yes' : 'No'}</div>}
          {serviceProvider && <div>Service Provider: {serviceProvider}</div>}
        </>
      )}
    </div>
  );
};

export default ListingCategory;
