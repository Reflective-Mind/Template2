/**
 * AURELIAN - V8: THE NEURAL VAULT
 */
import React, { useState, useEffect } from 'react';
import HUDOverlay from './HUDOverlay.js';
import GoldEntity from './GoldEntity.js';

// --- Global Definitions ---
const GlobalDefinitions = () => (
    <svg style={{ height: 0, width: 0, position: 'absolute', visibility: 'hidden' }}>
        <defs>
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8E6E36" />
                <stop offset="20%" stopColor="#C5A059" />
                <stop offset="50%" stopColor="#F9F1D1" />
                <stop offset="80%" stopColor="#C5A059" />
                <stop offset="100%" stopColor="#8E6E36" />
            </linearGradient>
            <filter id="goldGlow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>
    </svg>
);

const ASSETS = [
    { id: 1, image: "https://images.unsplash.com/photo-1518005020251-58296d8f8d71?auto=format&fit=crop&q=80&w=2400" },
    { id: 2, image: "https://images.unsplash.com/photo-1550684848-86a5d8727436?auto=format&fit=crop&q=80&w=2400" },
    { id: 3, image: "https://images.unsplash.com/photo-1515549832467-8c441fe74996?auto=format&fit=crop&q=80&w=2400" },
    { id: 4, image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2400" }
];

export default function LandingPage() {
    const [activeIndex, setActiveIndex] = useState(0);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        const handleScroll = () => {
            const scrollPosition = window.scrollY;
            const windowHeight = window.innerHeight;
            const index = Math.round(scrollPosition / windowHeight);
            if (index !== activeIndex) setActiveIndex(index);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(timer);
        };
    }, [activeIndex]);

    return (
        <div className="bg-[#000000] text-white selection:bg-[#C5A059] selection:text-black antialiased overflow-hidden min-h-screen">
            <GlobalDefinitions />
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(to right, rgba(197, 160, 89, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(197, 160, 89, 0.1) 1px, transparent 1px)`,
                    backgroundSize: '100px 100px',
                }}></div>
            </div>
            <HUDOverlay activeIndex={activeIndex} time={time} />
            <nav className="fixed top-0 w-full z-[60] px-16 py-12 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto group">
                    <h1 className="text-[11px] tracking-[1.8em] font-serif font-light text-[#C5A059] uppercase transition-all duration-700 group-hover:tracking-[2em]">AURELIAN</h1>
                    <div className="h-[0.5px] w-full bg-gradient-to-r from-[#C5A059] to-transparent"></div>
                </div>
            </nav>
            <main className="snap-y snap-mandatory h-screen overflow-y-auto hide-scrollbar relative z-10 w-full">
                {ASSETS.map((asset, index) => (
                    <section key={asset.id} className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
                            <img src={asset.image} className={`w-full h-full object-cover transition-all duration-[12s] ease-out ${activeIndex === index ? 'scale-105 opacity-20' : 'scale-100 opacity-0 blur-2xl'}`} alt="" />
                            <div className={`absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[#C5A059]/5 to-transparent z-20 pointer-events-none ${activeIndex === index ? 'animate-[scanline_10s_infinite_linear]' : ''}`}></div>
                        </div>
                        <div className="relative z-20 flex flex-col items-center">
                            <GoldEntity type={index} active={activeIndex === index} />
                            <div className={`mt-20 text-center transition-all duration-[2s] delay-700 ${activeIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
                                <h2 className="text-4xl font-serif italic font-light tracking-[0.2em] text-white/90">Asset_Lookbook_{index + 1}</h2>
                            </div>
                        </div>
                    </section>
                ))}
            </main>
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;1,300&family=Inter:wght@100;200;400&family=JetBrains+Mono:wght@100;400&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #000000; overflow: hidden; cursor: crosshair; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        main { scroll-snap-type: y mandatory; overflow-y: scroll; height: 100vh; scrollbar-width: none; }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(350%); } }
        svg { filter: drop-shadow(0 0 80px rgba(197, 160, 89, 0.08)); }
      `}} />
        </div>
    );
}
