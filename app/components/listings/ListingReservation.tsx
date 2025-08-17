'use client';
import { DateRange, Range, RangeKeyDict } from 'react-date-range';
import Button from '../Button';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface ListingReservationProps {
    price: number;
    dateRange: Range;
    totalPrice: number;
    onChangeDate: (value: Range) => void;
    onSubmit: () => void;
    disabled?: boolean;
    disabledDates: Date[];
}

const ListingReservation: React.FC<ListingReservationProps> = ({
    price,
    dateRange,
    totalPrice,
    onChangeDate,
    onSubmit,
    disabled = false,
    disabledDates
}) => {
    return (
        <div className="relative">
            {/* Gradient backdrop for depth */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 rounded-2xl blur-sm" />
            
            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl shadow-black/5 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-black/10 hover:-translate-y-1">
                {/* Price Header with gradient accent */}
                <div className="relative p-6">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            GH₵ {price}
                        </div>
                       
                    </div>
                </div>

                {/* Subtle separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-6" />

                {/* Date Range Picker with custom styling */}
                <div className="p-6">
                    <div className="relative">
                        <DateRange
                            ranges={[dateRange]}
                            onChange={(item: RangeKeyDict) => onChangeDate(item.selection)}
                            minDate={new Date()}
                            disabledDates={disabledDates}
                            rangeColors={['#3b82f6']}
                            direction="vertical"
                            showDateDisplay={false}
                            className="rounded-xl overflow-hidden border border-gray-100"
                        />
                        
                        {/* Custom overlay for enhanced styling */}
                        <style jsx global>{`
                            .rdrCalendarWrapper {
                                border-radius: 12px !important;
                                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
                            }
                            .rdrMonth {
                                padding: 1rem !important;
                            }
                            .rdrWeekDay {
                                color: #6b7280 !important;
                                font-weight: 600 !important;
                                font-size: 0.75rem !important;
                            }
                            .rdrDay:not(.rdrDayPassive) .rdrDayNumber span {
                                color: #374151 !important;
                                font-weight: 500 !important;
                            }
                            .rdrDayToday .rdrDayNumber span {
                                color: #3b82f6 !important;
                                font-weight: 700 !important;
                            }
                            .rdrDayStartEdge, .rdrDayEndEdge, .rdrDayInRange {
                                background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
                            }
                            .rdrDayStartEdge .rdrDayNumber span,
                            .rdrDayEndEdge .rdrDayNumber span,
                            .rdrDayInRange .rdrDayNumber span {
                                color: white !important;
                                font-weight: 600 !important;
                            }
                        `}</style>
                    </div>
                </div>

                {/* Another subtle separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-6" />

                {/* Reserve Button */}
                <div className="p-6">
                    <button
                        disabled={disabled}
                        onClick={onSubmit}
                        className={`
                            w-full py-4 px-6 rounded-xl font-semibold text-white
                            bg-gradient-to-r from-blue-600 to-purple-600
                            hover:from-blue-700 hover:to-purple-700
                            transform transition-all duration-200
                            hover:scale-[1.02] hover:shadow-lg
                            active:scale-[0.98]
                            disabled:opacity-50 disabled:cursor-not-allowed
                            disabled:hover:scale-100 disabled:hover:shadow-none
                            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                            shadow-md
                        `}
                    >
                        {disabled ? 'Unavailable' : 'Book Now'}
                    </button>
                </div>

                {/* Total Price Footer */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 p-6">
                    <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-gray-700">
                            Total
                        </div>
                        <div className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                            GH₵ {totalPrice.toLocaleString()}
                        </div>
                    </div>
                    
                    {/* Subtle animation indicator */}
                    <div className="mt-2 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transform scale-x-0 transition-transform duration-500 group-hover:scale-x-100" />
                </div>
            </div>
        </div>
    );
}

export default ListingReservation;