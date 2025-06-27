'use client';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Logo = () => {
  const router = useRouter();
  const [isPressed, setIsPressed] = useState(false);

  const handleClick = () => {
    router.push('/');
  };

  return (
    <div 
      onClick={handleClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      className={`
        relative
        cursor-pointer
        transition-all
        duration-200
        ease-out
        hover:scale-105
        active:scale-95
        group
        ${isPressed ? 'scale-95' : ''}
      `}
    >
      {/* Glow effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"></div>
      
      {/* Main logo container */}
      <div className="relative bg-white rounded-xl p-2 shadow-sm group-hover:shadow-lg transition-shadow duration-200 border border-gray-100 group-hover:border-gray-200">
        <Image
          alt="logo"
          className="transition-all duration-200 group-hover:brightness-110"
          height={120}
          width={120}
          src="/images/app.png"
        />
      </div>
      
      {/* Subtle pulse animation */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
    </div>
  );
};

export default Logo;