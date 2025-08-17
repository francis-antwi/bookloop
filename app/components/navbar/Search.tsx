'use client';

import { BiSearch } from "react-icons/bi";
import useSearchModal from "@/app/hooks/useSearchModal";

const Search = () => {
  const searchModal = useSearchModal();

  return (
    <div className="flex justify-center w-full">
      <div
        onClick={searchModal.onOpen}
        className=" relative flex items-center gap-3 w-full max-w-md px-4 py-2.5 bg-gradient-to-r from-white to-gray-50 border border-gray-200/60 rounded-xl shadow-md shadow-gray-200/50 hover:shadow-lg hover:shadow-gray-300/60 hover:border-blue-200 hover:from-blue-50/30 hover:to-purple-50/20 backdrop-blur-sm transition-all duration-500 cursor-pointer group overflow-hidden"
      >
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400/0 via-purple-400/0 to-pink-400/0 group-hover:from-blue-400/5 group-hover:via-purple-400/5 group-hover:to-pink-400/5 transition-all duration-700 rounded-xl" />
        
        <div className="relative flex items-center gap-3 w-full">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 group-hover:from-blue-600 group-hover:to-purple-700 shadow-md shadow-blue-200/50 group-hover:shadow-lg group-hover:shadow-purple-300/50 group-hover:scale-105 transition-all duration-300">
            <BiSearch size={16} className="text-white group-hover:rotate-12 transition-transform duration-300" />
          </div>
          
          <div className="flex-1">
            <span className="text-gray-600 text-sm font-medium group-hover:text-gray-800 transition-colors duration-300">
              Discover something amazing...
            </span>
          </div>
          
          <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-100/80 group-hover:bg-white/90 rounded-md border border-gray-200/50 group-hover:border-gray-300/80 opacity-60 group-hover:opacity-100 transition-all duration-300">
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">⌘</span>
            <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">K</span>
          </div>
        </div>
        
        {/* Bottom accent line */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 group-hover:w-20 transition-all duration-500 rounded-full" />
      </div>
    </div>
  );
};

export default Search;