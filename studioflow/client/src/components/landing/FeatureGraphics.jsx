import React from 'react';

export const AbstractShape1 = ({ className }) => (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
            </linearGradient>
        </defs>
        <path fill="url(#grad1)" d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.2C83.5,-26.8,87.7,-11.7,85.6,2.4C83.5,16.5,75.1,29.6,65.3,40.6C55.5,51.6,44.3,60.5,31.8,66.8C19.3,73.1,5.5,76.8,-7.8,75.8C-21.1,74.8,-33.9,69.1,-45.3,61.1C-56.7,53.1,-66.7,42.8,-73.8,30.6C-80.9,18.4,-85.1,4.3,-82.7,-8.8C-80.3,-21.9,-71.3,-34,-60.7,-43.6C-50.1,-53.2,-37.9,-60.3,-25.6,-67.8C-13.3,-75.3,-0.9,-83.2,12.9,-85.2C26.7,-87.2,40.4,-83.3,45.7,-76.3Z" transform="translate(100 100)" />
    </svg>
);

export const AbstractShape2 = ({ className }) => (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
        </defs>
        <circle cx="60" cy="100" r="45" fill="url(#grad2)" opacity="0.8" />
        <rect x="90" y="55" width="90" height="90" rx="20" fill="url(#grad2)" opacity="0.6" />
    </svg>
);

export const AbstractShape3 = ({ className }) => (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad3" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
        </defs>
        <path fill="url(#grad3)" d="M42.7,-72.8C54.6,-67.1,63.1,-54.6,70.3,-41.8C77.5,-29,83.4,-15.9,82.6,-3.2C81.8,9.5,74.3,21.8,65.6,33.1C56.9,44.4,47,54.7,35.7,62.3C24.4,69.9,11.7,74.8,-0.4,75.5C-12.5,76.2,-25.8,72.7,-38.3,65.9C-50.8,59.1,-62.5,49,-70.3,36.5C-78.1,24,-82,9.1,-79.8,-4.8C-77.6,-18.7,-69.3,-31.6,-58.9,-41.9C-48.5,-52.2,-36,-59.9,-23.4,-64.9C-10.8,-69.9,1.9,-72.2,14.6,-74.5C27.3,-76.8,40,-79.1,42.7,-72.8Z" transform="translate(100 100)" />
        <circle cx="100" cy="100" r="30" fill="rgba(255,255,255,0.2)" />
    </svg>
);

export const AbstractShape4 = ({ className }) => (
    <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="grad4" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
        </defs>
        <path fill="url(#grad4)" d="M56.8,-63.3C71.3,-52.5,79.5,-32.3,78.3,-13.2C77.1,5.9,66.5,23.9,53.9,38.6C41.3,53.3,26.7,64.7,10.2,68.4C-6.3,72.1,-24.7,68.1,-40.5,57.5C-56.3,46.9,-69.5,29.7,-72.6,10.8C-75.7,-8.1,-68.7,-28.7,-56.3,-41.5C-43.9,-54.3,-26.1,-59.3,-8.9,-59.9C8.3,-60.5,25.5,-56.7,42.3,-74.1" transform="translate(100 100) scale(1.1)" />
        <path stroke="white" strokeWidth="2" fill="none" d="M80,100 L120,100 M100,80 L100,120" opacity="0.5" />
    </svg>
);
