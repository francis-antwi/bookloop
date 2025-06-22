import React, { useState } from 'react';
import { Calendar, Clock, CreditCard, MapPin, Users, Star, Sparkles, CheckCircle } from 'lucide-react';

// Mock DateRange component since react-date-range isn't available
const DateRange = ({ ranges, onChange, minDate, disabledDates, rangeColors, direction, showDateDisplay, className }) => {
  const [selectedRange, setSelectedRange] = useState(ranges[0]);
  
  const handleDateClick = (date) => {
    if (!selectedRange.startDate) {
      const newRange = { ...selectedRange, startDate: date, endDate: null };
      setSelectedRange(newRange);
      onChange({ selection: newRange });
    } else if (!selectedRange.endDate && date > selectedRange.startDate) {
      const newRange = { ...selectedRange, endDate: date };
      setSelectedRange(newRange);
      onChange({ selection: newRange });
    } else {
      const newRange = { ...selectedRange, startDate: date, endDate: null };
      setSelectedRange(newRange);
      onChange({ selection: newRange });
    }
  };

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  
  const days = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(currentYear, currentMonth, day));
  }
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const isInRange = (date) => {
    if (!selectedRange.startDate || !selectedRange.endDate) return false;
    return date >= selectedRange.startDate && date <= selectedRange.endDate;
  };
  
  const isSelected = (date) => {
    return (selectedRange.startDate && date.getTime() === selectedRange.startDate.getTime()) ||
           (selectedRange.endDate && date.getTime() === selectedRange.endDate.getTime());
  };
  
  return (
    <div className={`bg-white rounded-xl ${className}`}>
      <div className="p-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            {monthNames[currentMonth]} {currentYear}
          </h3>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <div key={index} className="aspect-square">
              {date && (
                <button
                  onClick={() => handleDateClick(date)}
                  disabled={date < today || disabledDates.some(d => d.getTime() === date.getTime())}
                  className={`
                    w-full h-full rounded-lg text-sm font-medium transition-all duration-200
                    ${isSelected(date) 
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg transform scale-110' 
                      : isInRange(date)
                      ? 'bg-gradient-to-br from-blue-100 to-purple-100 text-blue-700'
                      : date < today 
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:scale-105'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {date.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface Range {
  startDate?: Date | null;
  endDate?: Date | null;
  key?: string;
}

interface RangeKeyDict {
  selection: Range;
}

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
    const [isHovered, setIsHovered] = useState(false);
    const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);
    
    const nights = dateRange.startDate && dateRange.endDate 
        ? Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    
    const serviceFee = Math.round(totalPrice * 0.1);
    const cleaningFee = 150;
    const subtotal = nights * price;
    
    return (
        <div 
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Animated background elements */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl opacity-20 blur-lg transition-opacity duration-500 group-hover:opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-blue-50/30 rounded-2xl backdrop-blur-sm" />
            
            <div className={`relative bg-white/95 backdrop-blur-md rounded-2xl border border-white/30 shadow-xl overflow-hidden transition-all duration-500 ${
                isHovered ? 'shadow-2xl shadow-blue-500/20 -translate-y-2' : 'shadow-lg'
            }`}>
                
                {/* Animated top border */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                </div>

                {/* Premium badge */}
                <div className="absolute top-4 right-4 z-10">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        <Star className="w-3 h-3 fill-current" />
                        <span>Premium</span>
                    </div>
                </div>

                {/* Price Header */}
                <div className="relative p-6 pb-4">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-baseline gap-2 mb-2">
                                <div className="text-4xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                                    GH₵ {price.toLocaleString()}
                                </div>
                                <div className="text-lg text-gray-500 font-medium"></div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <span className="font-semibold">4.9</span>
                                    <span>(127 reviews)</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-sm text-gray-500 mb-1">Instant Book</div>
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        </div>
                    </div>
                </div>

                {/* Elegant separator */}
                <div className="relative mx-6">
                    <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                {/* Date Selection */}
                <div className="p-6 py-4">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-600" />
                            Select your dates
                        </h3>
                        
                        {/* Date display cards */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-3 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md">
                                <div className="text-xs font-medium text-gray-500 mb-1">CHECK-IN</div>
                                <div className="text-sm font-semibold text-gray-800">
                                    {dateRange.startDate ? dateRange.startDate.toDateString() : 'Select date'}
                                </div>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-purple-50 p-3 rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-md">
                                <div className="text-xs font-medium text-gray-500 mb-1">CHECK-OUT</div>
                                <div className="text-sm font-semibold text-gray-800">
                                    {dateRange.endDate ? dateRange.endDate.toDateString() : 'Select date'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Calendar */}
                    <div className="overflow-hidden rounded-xl border border-gray-100 shadow-sm">
                        <DateRange
                            ranges={[dateRange]}
                            onChange={(item: RangeKeyDict) => onChangeDate(item.selection)}
                            minDate={new Date()}
                            disabledDates={disabledDates}
                            rangeColors={['#3b82f6']}
                            direction="vertical"
                            showDateDisplay={false}
                            className="border-0"
                        />
                    </div>
                    
                    
                </div>

                {/* Another separator */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent mx-6" />

                {/* Price breakdown */}
                {nights > 0 && (
                    <div className="p-6 py-4">
                        <button
                            onClick={() => setShowPriceBreakdown(!showPriceBreakdown)}
                            className="w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                        >
                            <div className="flex items-center justify-between">
                                <span>Price breakdown</span>
                                <span className={`transform transition-transform duration-200 ${showPriceBreakdown ? 'rotate-180' : ''}`}>
                                    ▼
                                </span>
                            </div>
                        </button>
                        
                        {showPriceBreakdown && (
                            <div className="mt-3 space-y-2 animate-in slide-in-from-top duration-300">
                                <div className="flex justify-between text-sm">
                                    <span>GH₵ {price} × {nights} nights</span>
                                    <span>GH₵ {subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Cleaning fee</span>
                                    <span>GH₵ {cleaningFee}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Service fee</span>
                                    <span>GH₵ {serviceFee}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Reserve Button */}
                <div className="p-6 pt-4">
                    <button
                        disabled={disabled || !dateRange.startDate || !dateRange.endDate}
                        onClick={onSubmit}
                        className={`
                            group/btn relative w-full py-4 px-6 rounded-xl font-bold text-white text-lg
                            bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
                            hover:from-blue-700 hover:via-purple-700 hover:to-pink-700
                            transform transition-all duration-300
                            hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/25
                            active:scale-[0.98]
                            disabled:opacity-50 disabled:cursor-not-allowed
                            disabled:hover:scale-100 disabled:hover:shadow-none
                            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2
                            shadow-lg overflow-hidden
                        `}
                    >
                        {/* Button shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                        
                        <div className="relative flex items-center justify-center gap-2">
                            {disabled ? (
                                <>
                                    <span>Unavailable</span>
                                </>
                            ) : !dateRange.startDate || !dateRange.endDate ? (
                                <>
                                    <Calendar className="w-5 h-5" />
                                    <span>Select dates</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    <span>Reserve Now</span>
                                </>
                            )}
                        </div>
                    </button>
                    
                    {!disabled && dateRange.startDate && dateRange.endDate && (
                        <p className="text-center text-sm text-gray-500 mt-3">
                            You won't be charged yet
                        </p>
                    )}
                </div>

                {/* Total Price Footer */}
                <div className="bg-gradient-to-r from-gray-50 via-blue-50/30 to-purple-50/30 p-6 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-gray-600" />
                            Total
                        </div>
                        <div className="text-3xl font-black bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                            GH₵ {totalPrice.toLocaleString()}
                        </div>
                    </div>
                    
                    
                    
                    {/* Animated progress bar */}
                    <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-1000 ${
                            isHovered ? 'w-full' : 'w-0'
                        }`} />
                    </div>
                </div>

                {/* Floating trust indicators */}
                <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="flex items-center gap-2 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full shadow-lg text-xs">
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        <span className="text-gray-600">Instant confirmation</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ListingReservation;