import React from 'react';

export default function GoldEntity({ type, active }) {
    const baseClasses = `w-72 h-72 md:w-[32rem] md:h-[32rem] transition-all duration-[4s] cubic-bezier(0.16, 1, 0.3, 1)`;
    const activeClasses = active ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-90 blur-3xl';
    const entities = [
        <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="95" stroke="url(#goldGrad)" strokeWidth="0.1" />
            <path d="M100 20L180 100L100 180L20 100L100 20Z" stroke="url(#goldGrad)" strokeWidth="0.5" filter="url(#goldGlow)" />
            <path d="M100 40L160 100L100 160L40 100L100 40Z" fill="url(#goldGrad)" opacity="0.8" />
            <circle cx="100" cy="100" r="30" stroke="url(#goldGrad)" strokeWidth="0.2" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            <ellipse cx="100" cy="100" rx="90" ry="30" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(45 100 100)" />
            <ellipse cx="100" cy="100" rx="90" ry="30" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(-45 100 100)" />
            <circle cx="100" cy="100" r="40" fill="url(#goldGrad)" opacity="0.9" />
            <circle cx="100" cy="100" r="60" stroke="url(#goldGrad)" strokeWidth="0.2" strokeDasharray="1 5" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            {[...Array(6)].map((_, i) => (
                <path key={i} d="M100 100L150 50L100 0L50 50L100 100Z" fill="url(#goldGrad)" opacity={0.3 + (i * 0.1)} transform={`rotate(${i * 60} 100 100)`} />
            ))}
            <rect x="80" y="80" width="40" height="40" stroke="url(#goldGrad)" strokeWidth="1" transform="rotate(45 100 100)" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            <path d="M100 20L170 180H140L100 90L60 180H30L100 20Z" fill="url(#goldGrad)" />
            <path d="M100 20L100 180" stroke="url(#goldGrad)" strokeWidth="0.2" strokeDasharray="4 4" />
            <circle cx="100" cy="140" r="10" stroke="url(#goldGrad)" strokeWidth="1" />
        </svg>
    ];
    return (
        <div className={`${baseClasses} ${activeClasses} relative group`}>
            <div className="absolute inset-0 bg-[#C5A059]/10 blur-[100px] rounded-full scale-50 opacity-50 group-hover:scale-100 transition-transform duration-[5s]"></div>
            {entities[type % entities.length]}
        </div>
    );
}
