'use client';
import { useState } from "react";
import { BiSearch } from "react-icons/bi";
import useSearchModal from "@/app/hooks/useSearchModal"
const Search = () => {
  const searchModal = useSearchModal();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onClick={searchModal.onOpen}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        onClick={searchModal.onOpen}
        relative
        w-full
        md:w-auto
        py-3
        px-1
        rounded-2xl
        transition-all
        duration-300
        cursor-pointer
        bg-white
        backdrop-blur-lg
        border
        border-gray-200/50
        hover:border-gray-300/70
        hover:shadow-xl
        hover:shadow-gray-100/50
        hover:-translate-y-0.5
        group
        ${isHovered ? 'bg-gradient-to-r from-white to-gray-50/30' : ''}
      `}
    >
      {/* Subtle gradient background on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-50/0 via-purple-50/0 to-pink-50/0 group-hover:from-blue-50/30 group-hover:via-purple-50/20 group-hover:to-pink-50/30 transition-all duration-500" />
      
      <div className="relative flex flex-row items-center justify-between">
        <div className="text-sm font-medium px-5 text-gray-700 group-hover:text-gray-900 transition-colors">
          Anywhere
        </div>
        
        <div className="hidden sm:block text-sm font-medium px-5 border-x border-gray-200/60 flex-1 text-center text-gray-700 group-hover:text-gray-900 transition-colors">
          Any Week
        </div>
        
        <div className="text-sm pl-5 pr-3 text-gray-500 flex flex-row items-center gap-3">
          <div className="hidden sm:block group-hover:text-gray-700 transition-colors">
            Anyday
          </div>
          
          <div className={`
            p-2.5
            rounded-full
            text-white
            transition-all
            duration-300
            transform
            group-hover:scale-110
            ${isHovered 
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 shadow-lg shadow-rose-200' 
              : 'bg-gradient-to-r from-rose-400 to-pink-400'
            }
          `}>
            <BiSearch size={16} className="transition-transform group-hover:rotate-12" />
          </div>
        </div>
      </div>
      
      {/* Animated underline effect */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-rose-400 to-pink-400 group-hover:w-16 transition-all duration-500 rounded-full" />
    </div>
  );
};

export default Search;