import React from 'react';

export const RemoveIcon = ({ 
  className = '', 
  width = 24, 
  height = 24, 
  strokeWidth = 2 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={width} 
    height={height} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`icon icon-tabler icons-tabler-outline icon-tabler-circle-minus ${className}`}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M9 12l6 0" />
  </svg>
);

export const AddIcon = ({ 
  className = '', 
  width = 24, 
  height = 24, 
  strokeWidth = 2 
}) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={width} 
    height={height} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={`icon icon-tabler icons-tabler-outline icon-tabler-circle-plus ${className}`}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
    <path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0" />
    <path d="M9 12l6 0" />
    <path d="M12 9l0 6" />
  </svg>
);

export const PlusIcon = ({ 
    className = '', 
    width = 24, 
    height = 24, 
    strokeWidth = 2 
  }) => (
    <svg  xmlns="http://www.w3.org/2000/svg"  
    width="24"  
    height="24" 
    viewBox="0 0 24 24"  
    fill="none"  
    stroke="currentColor"  
    stroke-width="2"  
    stroke-linecap="round"  
    stroke-linejoin="round"  
    class="icon icon-tabler icons-tabler-outline icon-tabler-plus">
        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
        <path d="M12 5l0 14" />
        <path d="M5 12l14 0" />
    </svg>
);

export const MinusIcon = ({ 
    className = '', 
    width = 24, 
    height = 24, 
    strokeWidth = 2 
  }) => (
    <svg  
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="icon icon-tabler icons-tabler-outline icon-tabler-minus">
      <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
      <path d="M5 12l14 0" />
</svg>
);