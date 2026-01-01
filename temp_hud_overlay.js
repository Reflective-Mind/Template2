import React from 'react';
import * as lucide from 'lucide-react';

export default function HUDOverlay({ activeIndex, time }) {
    return (
        <div className="fixed inset-0 pointer-events-none z-50 font-mono text-[7px] md:text-[8px] tracking-[0.3em] text-[#C5A059]/40 uppercase antialiased">
            {/* Frame */}
            <div className="absolute inset-8 border border-white/[0.03] pointer-events-none">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[#C5A059]/40"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[#C5A059]/40"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[#C5A059]/40"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[#C5A059]/40"></div>
            </div>
            {/* Header */}
            <div className="absolute top-12 left-12 flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <lucide.Cpu className="w-3 h-3 text-[#C5A059] animate-pulse" strokeWidth={1} />
                    <span className="text-white/80 font-semibold tracking-[0.4em]">CORE_LINK: ESTABLISHED</span>
                </div>
                <div className="flex flex-col opacity-50 space-y-1">
                    <div>NODE: GENEVA_IV_SECURE</div>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-[1px] bg-[#C5A059]/20"></div>
                        <span>SIGNAL_STRENGTH: 99.8%</span>
                    </div>
                </div>
            </div>
            <div className="absolute top-12 right-12 text-right">
                <div className="flex items-center justify-end gap-3 mb-1">
                    <span className="text-white/80">VAULT_AUTH: SUCCESS</span>
                    <lucide.Lock className="w-3 h-3 text-[#C5A059]" strokeWidth={1} />
                </div>
                <div className="opacity-40">SESSION_ID: {Math.random().toString(16).slice(2, 10).toUpperCase()}</div>
            </div>
            {/* Coords */}
            <div className="absolute left-12 top-1/2 -translate-y-1/2 space-y-6">
                <div className="flex flex-col items-center gap-4 py-8 border-y border-white/[0.05]">
                    <div className="rotate-90 origin-center whitespace-nowrap opacity-30">COORDINATE_GRID_X</div>
                    <div className="h-12 w-[1px] bg-gradient-to-b from-transparent via-[#C5A059]/40 to-transparent"></div>
                    <div className="rotate-90 origin-center whitespace-nowrap font-bold text-[#C5A059]">46.2044° N</div>
                </div>
            </div>
            {/* Footer */}
            <div className="absolute bottom-12 left-12 right-12 flex justify-between items-end">
                <div className="max-w-[200px] space-y-4">
                    <div className="flex items-center gap-3">
                        <lucide.Target className="w-3 h-3" strokeWidth={1} />
                        <span>ASSET_SCAN_INIT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 opacity-40">
                        <div>OBJ_MAP:</div><div className="text-right">V_ACTIVE</div>
                        <div>THERMAL:</div><div className="text-right">STABLE</div>
                        <div>VOID_REF:</div><div className="text-right">0.00{activeIndex}</div>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-4 text-[10px] tabular-nums font-light text-white/60">
                        <span>{time.toLocaleTimeString()}</span>
                        <div className="w-1 h-1 bg-[#C5A059] rounded-full"></div>
                        <span>30.12.2025</span>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className={`w-[2px] h-1 ${i < (activeIndex + 1) * 5 ? 'bg-[#C5A059]' : 'bg-white/5'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
