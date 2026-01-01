import React, { useState, useEffect, useMemo } from 'react';

/**
 * AURELIAN - V7: THE DIGITAL VAULT
 * Focus: Futuristic luxury, HUD elements, technical textures, and spatial depth.
 * Style: Avant-garde UI, liquid gold sculptures, and "Digital Concierge" aesthetics.
 */

// --- HUD Component: Adds futuristic texture to the edges ---
const HUDOverlay = ({ activeIndex }) => (
    <div className="fixed inset-0 pointer-events-none z-50 font-mono text-[8px] tracking-[0.2em] text-[#C5A059]/30 uppercase">
        {/* Top Left: System Status */}
        <div className="absolute top-12 left-12 flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 animate-pulse"></div>
                <span>System: Secure_Uplink</span>
            </div>
            <div className="opacity-50">LAT: 46.2044° N // LON: 6.1432° E</div>
        </div>

        {/* Top Right: Connection Meta */}
        <div className="absolute top-12 right-12 text-right opacity-50">
            <div>Vault_ID: AUR-00{activeIndex + 1}</div>
            <div>Encryption: RSA-4096</div>
        </div>

        {/* Bottom Left: Asset Scanning Meta */}
        <div className="absolute bottom-12 left-12 space-y-2">
            <div className="flex items-center gap-4">
                <div className="h-[1px] w-12 bg-[#C5A059]/20"></div>
                <span className="text-[#C5A059]">Asset_Classification</span>
            </div>
            <div className="pl-16 opacity-40">
                <div>// Integrity_Verified</div>
                <div>// Origin_Confirmed</div>
            </div>
        </div>

        {/* Bottom Right: Time Stream */}
        <div className="absolute bottom-12 right-12 flex items-end gap-6">
            <div className="text-right opacity-40">
                <div>GMT +1 [GENÈVE]</div>
                <div className="tabular-nums">{new Date().toLocaleTimeString()}</div>
            </div>
            <div className="w-8 h-8 border border-[#C5A059]/20 flex items-center justify-center">
                <div className="w-1 h-1 bg-[#C5A059] animate-ping"></div>
            </div>
        </div>
    </div>
);

const GoldEntity = ({ type, active }) => {
    const [loc, setLoc] = useState('');
    useEffect(() => {
        setLoc(window.location.href);
    }, []);

    const getRef = (id) => `url(${loc}#${id})`;

    const baseClasses = `w-64 h-64 md:w-[28rem] md:h-[28rem] transition-all duration-[3s] cubic-bezier(0.16, 1, 0.3, 1)`;
    const activeClasses = active ? 'opacity-100 scale-100 blur-0 rotate-0' : 'opacity-0 scale-90 blur-3xl rotate-12';

    const entities = [
        // Entity 1: The Monolith / Crest
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8E6E36" />
                    <stop offset="20%" stopColor="#C5A059" />
                    <stop offset="50%" stopColor="#F9F1D1" />
                    <stop offset="80%" stopColor="#C5A059" />
                    <stop offset="100%" stopColor="#8E6E36" />
                </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="80" stroke={getRef("goldGrad")} strokeWidth="0.25" />
            <path d="M100 20L130 70H70L100 20Z" fill={getRef("goldGrad")} opacity="0.9" />
            <path d="M100 180L70 130H130L100 180Z" fill={getRef("goldGrad")} opacity="0.9" />
            <rect x="60" y="60" width="80" height="80" stroke={getRef("goldGrad")} strokeWidth="0.5" transform="rotate(45 100 100)" />
            <circle cx="100" cy="100" r="40" stroke={getRef("goldGrad")} strokeWidth="0.2" />
        </svg>,
        // Entity 2: The Orbital
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="90" stroke={getRef("goldGrad")} strokeWidth="0.1" />
            <circle cx="100" cy="100" r="70" stroke={getRef("goldGrad")} strokeWidth="0.5" strokeDasharray="2 4" />
            <path d="M100 30C138.66 30 170 61.3401 170 100C170 138.66 138.66 170 100 170" stroke={getRef("goldGrad")} strokeWidth="2" strokeLinecap="round" />
            <circle cx="100" cy="100" r="15" fill={getRef("goldGrad")} />
            <ellipse cx="100" cy="100" rx="95" ry="35" stroke={getRef("goldGrad")} strokeWidth="0.5" transform="rotate(-30 100 100)" />
        </svg>,
        // Entity 3: The Geometric Symmetery
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {[...Array(12)].map((_, i) => (
                <rect
                    key={i}
                    x="60" y="60" width="80" height="80"
                    stroke={getRef("goldGrad")}
                    strokeWidth="0.4"
                    transform={`rotate(${i * 30} 100 100)`}
                    opacity={0.2 + (i * 0.05)}
                />
            ))}
            <circle cx="100" cy="100" r="8" fill={getRef("goldGrad")} />
        </svg>,
        // Entity 4: The Minimalist A (Sculptural)
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 30L170 170H145L100 75L55 170H30L100 30Z" fill={getRef("goldGrad")} />
            <path d="M70 120H130" stroke={getRef("goldGrad")} strokeWidth="0.5" strokeDasharray="2 2" />
        </svg>
    ];

    return (
        <div className={`${baseClasses} ${activeClasses} relative group cursor-none`}>
            <div className="absolute inset-0 bg-[#C5A059]/5 blur-3xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-[4s]"></div>
            {entities[type % entities.length]}
        </div>
    );
};

const ASSETS = [
    { id: 1, image: "https://images.unsplash.com/photo-1518005020251-58296d8f8d71?auto=format&fit=crop&q=80&w=2400" },
    { id: 2, image: "https://images.unsplash.com/photo-1550684848-86a5d8727436?auto=format&fit=crop&q=80&w=2400" },
    { id: 3, image: "https://images.unsplash.com/photo-1515549832467-8c441fe74996?auto=format&fit=crop&q=80&w=2400" },
    { id: 4, image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=2400" }
];

const FixedGoldPage = () => {
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
        <div className="bg-[#010101] text-white selection:bg-[#C5A059] selection:text-black antialiased overflow-hidden">

            {/* Dynamic Grid System */}
            <div className="fixed inset-0 pointer-events-none opacity-20">
                <div className="absolute inset-0" style={{
                    backgroundImage: `linear-gradient(to right, #C5A059 1px, transparent 1px), linear-gradient(to bottom, #C5A059 1px, transparent 1px)`,
                    backgroundSize: '80px 80px',
                    maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
                }}></div>
            </div>

            {/* Futuristic HUD Components */}
            <HUDOverlay activeIndex={activeIndex} />

            {/* Main Branding Mark */}
            <nav className="fixed top-0 w-full z-[60] px-16 py-12 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto">
                    <h1 className="text-[10px] tracking-[1.5em] font-serif font-light text-[#C5A059] uppercase">
                        AURELIAN
                    </h1>
                    <div className="h-[1px] w-full bg-gradient-to-r from-[#C5A059] to-transparent"></div>
                </div>

                <div className="pointer-events-auto flex items-center gap-8 text-[9px] tracking-widest text-white/40 uppercase">
                    <span className="hover:text-[#C5A059] cursor-pointer transition-colors">V_0.71</span>
                    <div className="w-10 h-10 border border-white/5 flex items-center justify-center hover:border-[#C5A059]/40 transition-all cursor-pointer">
                        <div className="w-1.5 h-1.5 border-[0.5px] border-[#C5A059]"></div>
                    </div>
                </div>
            </nav>

            {/* Cinematic Scroll Container */}
            <main className="snap-y snap-mandatory h-screen overflow-y-auto hide-scrollbar relative z-10">
                {ASSETS.map((asset, index) => (
                    <section
                        key={asset.id}
                        className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden"
                    >
                        {/* Background Atmosphere with Scan-lines */}
                        <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/90 z-10" />
                            <img
                                src={asset.image}
                                className={`w-full h-full object-cover grayscale transition-all duration-[12s] ease-out ${activeIndex === index ? 'scale-110 opacity-20' : 'scale-100 opacity-0'}`}
                                alt=""
                            />
                            {/* Animated Scan Line */}
                            <div className={`absolute left-0 w-full h-[1px] bg-[#C5A059]/10 z-20 top-0 ${activeIndex === index ? 'animate-[scanning_8s_infinite]' : 'hidden'}`}></div>
                        </div>

                        {/* Centered Golden Sculpture */}
                        <div className="relative z-20 flex flex-col items-center">
                            <GoldEntity type={index} active={activeIndex === index} />

                            {/* Asset Title: Integrated HUD Style */}
                            <div className={`mt-16 text-center transition-all duration-1000 delay-500 ${activeIndex === index ? 'opacity-100' : 'opacity-0 translate-y-8'}`}>
                                <p className="text-[8px] tracking-[0.8em] uppercase text-[#C5A059]/40 mb-2">Vault Entry</p>
                                <h2 className="text-3xl font-serif italic font-light tracking-widest text-white/80">Asset_0{index + 1}</h2>
                            </div>
                        </div>

                        {/* Vertical Progress Component */}
                        <div className="absolute left-16 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4 items-center">
                            {ASSETS.map((_, i) => (
                                <div key={i} className="flex flex-col items-center gap-4">
                                    <div
                                        className={`w-[1px] transition-all duration-1000 ${i === activeIndex ? 'bg-[#C5A059] h-24' : 'bg-white/5 h-6'}`}
                                    />
                                    {i === activeIndex && (
                                        <span className="text-[8px] font-mono text-[#C5A059] rotate-90 translate-y-4">P_{i + 1}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </main>

            {/* Screen Edge Aesthetics */}
            <div className="fixed inset-0 pointer-events-none z-[100] border-[1px] border-white/5 m-8"></div>
            <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_200px_rgba(0,0,0,0.95)]"></div>

            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;1,300&family=Inter:wght@100;200&family=JetBrains+Mono:wght@100&display=swap');
        
        body { 
          font-family: 'Inter', sans-serif; 
          background-color: #010101;
          overflow: hidden;
        }
        
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        main {
          scroll-snap-type: y mandatory;
          overflow-y: scroll;
          height: 100vh;
        }

        @keyframes scanning {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        svg {
          filter: drop-shadow(0 0 50px rgba(197, 160, 89, 0.1));
        }
      `}} />
        </div>
    );
};

export default FixedGoldPage;
