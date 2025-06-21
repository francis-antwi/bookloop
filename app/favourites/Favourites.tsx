'use client'
import { useState } from 'react';
import { Heart, Grid, List, Filter, Search, MapPin, Star, Calendar, Users } from 'lucide-react';
import Container from "../components/Container";
import Heading from "../components/Heading";
import ListingCard from "../components/listings/ListingCard";
import { SafeListing, SafeUser } from "../types";

interface FavouriteProps {
    listings: SafeListing[];
    currentUser?: SafeUser | null;
}

const Favourites: React.FC<FavouriteProps> = ({
    listings,
    currentUser
}) => {
    const [viewType, setViewType] = useState('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recently-added');

    // Filter listings based on search
    const filteredListings = listings.filter(listing =>
        listing.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.locationValue?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort listings
    const sortedListings = [...filteredListings].sort((a, b) => {
        switch (sortBy) {
            case 'price-low':
                return a.price - b.price;
            case 'price-high':
                return b.price - a.price;
            case 'title':
                return a.title.localeCompare(b.title);
            default:
                return 0; // Keep original order for 'recently-added'
        }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
            <Container>
                {/* Enhanced Header Section */}
                <div className="pt-8 pb-6">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg">
                            <Heart className="w-7 h-7 text-white fill-white" />
                        </div>
                        <div>
                            <Heading
                                title="Your Favourites"
                                
                            />
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="font-medium">{listings.length} saved listing(s)</span>
                        </div>
                        {listings.length > 0 && (
                            <>
                                <span>•</span>
                                <span>Ready for your next adventure</span>
                            </>
                        )}
                    </div>

                </div>

                {/* Empty State */}
                {listings.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-2xl font-semibold text-gray-900 mb-3">No favourites yet</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            Start exploring and save places you love by clicking the heart icon
                        </p>
                        <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                            Start Exploring
                        </button>
                    </div>
                ) : filteredListings.length === 0 && searchTerm ? (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
                        <p className="text-gray-500 mb-4">Try adjusting your search terms</p>
                        <button
                            onClick={() => setSearchTerm('')}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                        >
                            Clear search
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Results Count */}
                        {searchTerm && (
                            <div className="mb-6 text-sm text-gray-600">
                                Found {sortedListings.length} of {listings.length} places
                            </div>
                        )}

                        {/* Listings Grid - Using your original ListingCard */}
                        <div className={`
                            grid gap-6 mb-12
                            ${viewType === 'grid' 
                                ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6' 
                                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                            }
                        `}>
                            {sortedListings.map((listing) => (
                                <div 
                                    key={listing.id}
                                    className="transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    <ListingCard
                                        currentUser={currentUser}
                                        data={listing}
                                    />
                                </div>
                            ))}
                        </div>

                       
                    </>
                )}
            </Container>
        </div>
    );
}

export default Favourites;