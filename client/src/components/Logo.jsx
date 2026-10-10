import React from 'react';

export default function Logo({ className = "w-10 h-10", alt = "Khitmah Logo" }) {
  return (
    <img 
      src="/logo.svg" 
      alt={alt} 
      className={`${className} object-contain transition-transform`} 
    />
  );
}
