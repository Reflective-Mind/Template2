/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as lucide from 'lucide-react';
import * as framerMotion from 'framer-motion';
import ReactDOM from 'react-dom/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const ENV = { 
  isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'), 
  isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
};

// --- GODLIKE ENGINE SOURCE ---
const ENGINE_SOURCE = "function ArchitectWorkshop({ initialFiles, mode = 'edit' }) {\r\n    const [files, setFiles] = useState(initialFiles || { 'App.js': '' });\r\n    const [activeFile, setActiveFile] = useState('App.js');\r\n    const [error, setError] = useState(null);\r\n    const [isEditorOpen, setIsEditorOpen] = useState(false);\r\n    const [showWorkshopUI, setShowWorkshopUI] = useState(false);\r\n    const [copyFeedback, setCopyFeedback] = useState(null);\r\n    const [babelReady, setBabelReady] = useState(false);\r\n\r\n    const previewRef = useRef(null);\r\n    const rootInstance = useRef(null);\r\n    const isMounted = useRef(false);\r\n    const h = React.createElement;\r\n\r\n    useEffect(() => {\r\n        isMounted.current = true;\r\n        if (typeof window !== 'undefined' && !window.Babel) {\r\n            const script = document.createElement('script');\r\n            script.src = 'https://unpkg.com/@babel/standalone/babel.min.js';\r\n            script.async = true;\r\n            script.onload = () => { if (isMounted.current) setBabelReady(true); };\r\n            document.head.appendChild(script);\r\n        } else {\r\n            setBabelReady(true);\r\n        }\r\n        return () => {\r\n            isMounted.current = false;\r\n            if (rootInstance.current) {\r\n                setTimeout(() => { rootInstance.current?.unmount(); rootInstance.current = null; }, 0);\r\n            }\r\n        };\r\n    }, []);\r\n\r\n    useEffect(() => {\r\n        if (babelReady && files && isMounted.current) {\r\n            const timer = setTimeout(() => executeCode(), 100);\r\n            return () => clearTimeout(timer);\r\n        }\r\n    }, [babelReady, files]);\r\n\r\n    const executeCode = () => {\r\n        if (!previewRef.current || !window.Babel || !isMounted.current) return;\r\n        setError(null);\r\n        try {\r\n            if (!rootInstance.current && previewRef.current) rootInstance.current = ReactDOM.createRoot(previewRef.current);\r\n            const transpiledFiles = {};\r\n            Object.keys(files).forEach(filename => {\r\n                let code = files[filename] || \"\";\r\n                if (code.match(/export\\s+default\\s+function/)) {\r\n                    code = code.replace(/export\\s+default\\s+function\\s+(\\w+)/, \"const __default__ = function $1\");\r\n                    code = code.replace(/export\\s+default\\s+function/, \"const __default__ = function\");\r\n                } else if (code.match(/export\\s+default\\s+/)) {\r\n                    code = code.replace(/export\\s+default\\s+/, \"const __default__ = \");\r\n                }\r\n                code = code.replace(/export\\s+const\\s+(\\w+)/g, \"const $1\");\r\n                transpiledFiles[filename] = window.Babel.transform(code, { presets: [\"react\", [\"env\", { modules: false }]] }).code;\r\n            });\r\n            const scope = {\r\n                React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ...lucide,\r\n                require: (path) => {\r\n                    const cleanPath = path.replace(/^\\.\\//, '');\r\n                    if (transpiledFiles[cleanPath]) throw new Error(\"Sync require not fully supported.\");\r\n                    return null;\r\n                }\r\n            };\r\n            let bundle = \"\";\r\n            const sortedKeys = Object.keys(files).sort((a, b) => (a === 'App.js' ? 1 : b === 'App.js' ? -1 : a.localeCompare(b)));\r\n            sortedKeys.forEach(filename => {\r\n                let code = files[filename];\r\n                code = code.replace(/import\\s+.*?from\\s+['\"]\\.\\/.*?['\"];?/g, \"\");\r\n                code = code.replace(/import\\s+.*?from\\s+['\"].*?['\"];?/g, \"\");\r\n                code = code.replace(/export\\s+default\\s+/g, \"\");\r\n                code = code.replace(/export\\s+/g, \"\");\r\n                bundle += \"\\n// --- \" + filename + \" ---\\n\" + code + \"\\n\";\r\n            });\r\n            const transpiledBundle = window.Babel.transform(bundle, { presets: [\"react\", [\"env\", { modules: false }]] }).code;\r\n            const executeBody = `try { ${transpiledBundle} \r\n            const Target = (typeof App !== 'undefined' ? App : (typeof Main !== 'undefined' ? Main : null));\r\n            if (Target) render(React.createElement(Target));\r\n        } catch(e) { throw e; }`;\r\n            const finalScope = { ...scope, render: (c) => { if (isMounted.current && rootInstance.current) rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c)); } };\r\n            new Function(...Object.keys(finalScope), executeBody)(...Object.values(finalScope));\r\n        } catch (err) {\r\n            if (isMounted.current) setError(err.message);\r\n        }\r\n    };\r\n\r\n    useEffect(() => {\r\n        if (mode !== 'edit' || !isEditorOpen) return;\r\n        const handleKeys = (e) => {\r\n            if ((e.metaKey || e.ctrlKey) && e.key === \"Enter\") executeCode();\r\n            if ((e.metaKey || e.ctrlKey) && e.key === \"s\") { e.preventDefault(); saveAsDefault(); }\r\n        };\r\n        window.addEventListener(\"keydown\", handleKeys);\r\n        return () => window.removeEventListener(\"keydown\", handleKeys);\r\n    }, [isEditorOpen, mode, files]);\r\n\r\n    useEffect(() => {\r\n        if (mode === 'edit') {\r\n            const toggle = (e) => { if (e.key === \"F8\") setShowWorkshopUI(p => !p); };\r\n            window.addEventListener(\"keydown\", toggle);\r\n            return () => window.removeEventListener(\"keydown\", toggle);\r\n        }\r\n    }, [mode]);\r\n\r\n    const saveAsDefault = () => {\r\n        const q = \"'\"; const nl = \"\\\\n\";\r\n        const filesJson = JSON.stringify(files, null, 2);\r\n        const newFileContent =\r\n            \"import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';\" + nl +\r\n            \"import * as lucide from 'lucide-react';\" + nl +\r\n            \"import * as framerMotion from 'framer-motion';\" + nl +\r\n            \"import ReactDOM from 'react-dom/client';\" + nl +\r\n            \"import { clsx } from 'clsx';\" + nl +\r\n            \"import { twMerge } from 'tailwind-merge';\" + nl + nl +\r\n            \"const ENV = { \" + nl +\r\n            \"  isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'), \" + nl +\r\n            \"  isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost' \" + nl +\r\n            \"};\" + nl + nl +\r\n            \"/**\" + nl +\r\n            \" * --- THE GODLIKE ENGINE (v2.0) ---\" + nl +\r\n            \" * A self-replicating, multi-file React environment.\" + nl +\r\n            \" */\" + nl +\r\n            \"const ENGINE_SOURCE = \" + JSON.stringify(ENGINE_SOURCE) + \";\" + nl + nl +\r\n            \"// --- HYDRATE ENGINE ---\" + nl +\r\n            \"const ArchitectWorkshop = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'framerMotion', 'lucide', 'clsx', 'twMerge', 'ReactDOM', 'ENGINE_SOURCE', 'return ' + ENGINE_SOURCE)(React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ReactDOM, ENGINE_SOURCE);\" + nl + nl +\r\n            \"// --- ROOT ENTRY ---\" + nl +\r\n            \"export default function RootApp() {\" + nl +\r\n            \"  const initialFiles = \" + filesJson + \";\" + nl +\r\n            \"  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });\" + nl +\r\n            \"}\";\r\n        navigator.clipboard.writeText(newFileContent).then(() => { setCopyFeedback(\"save\"); setTimeout(() => setCopyFeedback(null), 2000); }).catch(err => setError(\"Clipboard failed: \" + err));\r\n    };\r\n    const { Code2, Save, Copy, Check, X, File: FileIcon, Plus, Trash2 } = lucide;\r\n    const { AnimatePresence, motion } = framerMotion;\r\n    return h('div', { className: \"relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white\" },\r\n        h('div', { ref: previewRef, className: \"h-full w-full\" }),\r\n        mode === 'edit' && h(React.Fragment, null,\r\n            h(AnimatePresence, null, showWorkshopUI && h(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, className: \"fixed top-6 right-6 flex items-center gap-2 z-[500]\" },\r\n                h('button', { onClick: () => setIsEditorOpen(true), className: \"p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-amber-500 transition-all active:scale-95 shadow-xl\", title: \"Open Code\" }, h(Code2, { size: 16 })),\r\n                h('button', { onClick: saveAsDefault, className: \"p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-blue-500 transition-all active:scale-95 shadow-xl\", title: \"Copy Full File to Clipboard\" }, copyFeedback === \"save\" ? h(Check, { size: 16, className: \"text-blue-500\" }) : h(Save, { size: 16 }))\r\n            )),\r\n            h(AnimatePresence, null, isEditorOpen && h(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: \"fixed inset-0 z-[600] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-8 lg:p-20\" },\r\n                h(motion.div, { initial: { scale: 0.95, y: 30 }, animate: { scale: 1, y: 0 }, exit: { scale: 0.95, y: 30 }, className: \"w-full max-w-6xl h-full flex flex-col bg-[#080808] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden\" },\r\n                    h('div', { className: \"flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#0a0a0a]\" },\r\n                        h('div', {}, h('h3', { className: \"font-serif italic text-xl text-white tracking-widest uppercase\" }, \"Godlike Engine v2\"), h('p', { className: \"text-[9px] text-amber-500/80 uppercase tracking-[0.3em] font-bold\" }, babelReady ? \"Neural Link Active\" : \"Initializing...\")),\r\n                        h('button', { onClick: () => setIsEditorOpen(false), className: \"text-white/20 hover:text-white transition-colors\" }, h(X, { size: 20 }))\r\n                    ),\r\n                    h('div', { className: \"flex-1 flex overflow-hidden\" },\r\n                        h('div', { className: \"w-48 bg-[#050505] border-r border-white/5 flex flex-col\" },\r\n                            h('div', { className: \"p-4 space-y-2 overflow-y-auto flex-1\" },\r\n                                Object.keys(files).map(filename => h('button', { key: filename, onClick: () => setActiveFile(filename), className: `w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between group ${activeFile === filename ? 'bg-amber-500/10 text-amber-500' : 'text-neutral-500 hover:text-neutral-300'}` }, h('span', { className: \"truncate\" }, filename), filename !== 'App.js' && h(Trash2, { size: 10, className: \"opacity-0 group-hover:opacity-100 hover:text-rose-500\", onClick: (e) => { e.stopPropagation(); const newFiles = { ...files }; delete newFiles[filename]; setFiles(newFiles); if (activeFile === filename) setActiveFile('App.js'); } })))\r\n                            ),\r\n                            h('div', { className: \"p-4 border-t border-white/5\" },\r\n                                h('button', { onClick: () => { const name = prompt(\"Filename?\", \"Component.js\"); if (name && !files[name]) setFiles({ ...files, [name]: \"export default function Component() {\\\\n  return <div>New Component</div>\\\\n}\" }); }, className: \"w-full py-2 flex items-center justify-center gap-2 border border-dashed border-white/10 rounded-lg text-white/20 hover:text-white/60 hover:border-white/20 transition-all text-[10px] uppercase tracking-widest\" }, h(Plus, { size: 10 }), \"New File\")\r\n                            )\r\n                        ),\r\n                        h('div', { className: \"flex-1 flex flex-col bg-[#080808] relative\" },\r\n                            h('textarea', { value: files[activeFile] || \"\", onChange: (e) => setFiles({ ...files, [activeFile]: e.target.value }), spellCheck: \"false\", className: \"flex-1 bg-transparent p-8 font-mono text-xs text-neutral-400 focus:outline-none no-scrollbar leading-relaxed resize-none\", placeholder: \"// Write your React code here...\" }),\r\n                            h('div', { className: \"absolute bottom-6 right-8 flex gap-4\" },\r\n                                h('button', { onClick: () => executeCode(), className: \"px-6 py-2 bg-white text-black rounded-full text-[10px] uppercase font-bold hover:bg-amber-500 transition-all shadow-lg\" }, \"Apply Logic\")\r\n                            )\r\n                        )\r\n                    ),\r\n                    error && h('div', { className: \"p-4 bg-rose-950/20 border-t border-rose-500/20 text-rose-400 text-[10px] font-mono\" }, error)\r\n                )\r\n            )\r\n            )\r\n        )\r\n    );\r\n}\r\n";

// --- HYDRATE ENGINE ---
const ArchitectWorkshop = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'framerMotion', 'lucide', 'clsx', 'twMerge', 'ReactDOM', 'ENGINE_SOURCE', 'return ' + ENGINE_SOURCE)(React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ReactDOM, ENGINE_SOURCE);

// --- ROOT ENTRY ---
export default function RootApp() {
  const initialFiles = {
    "App.js": `/**
 * AURELIAN - V8: THE NEURAL VAULT
 */

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

const HUDOverlay = ({ activeIndex, time }) => (
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
                        <div key={i} className={\`w-[2px] h-1 ${i < (activeIndex + 1) * 5 ? 'bg-[#C5A059]' : 'bg-white/5'}\`}></div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const GoldEntity = ({ type, active }) => {
    const baseClasses = \`w-72 h-72 md:w-[32rem] md:h-[32rem] transition-all duration-[4s] cubic-bezier(0.16, 1, 0.3, 1)\`;
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
                <path key={i} d="M100 100L150 50L100 0L50 50L100 100Z" fill="url(#goldGrad)" opacity={0.3 + (i * 0.1)} transform={\`rotate(${i * 60} 100 100)\`} />
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
        <div className={\`${baseClasses} ${activeClasses} relative group\`}>
            <div className="absolute inset-0 bg-[#C5A059]/10 blur-[100px] rounded-full scale-50 opacity-50 group-hover:scale-100 transition-transform duration-[5s]"></div>
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

const App = () => {
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
        <div className="bg-[#000000] text-white selection:bg-[#C5A059] selection:text-black antialiased overflow-hidden">
            <GlobalDefinitions />
            <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
                <div className="absolute inset-0" style={{
                    backgroundImage: \`linear-gradient(to right, rgba(197, 160, 89, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(197, 160, 89, 0.1) 1px, transparent 1px)\`,
                    backgroundSize: '100px 100px',
                }}></div>
            </div>
            <HUDOverlay activeIndex={activeIndex} time={time} />
            <nav className="fixed top-0 w-full z-[60] px-16 py-12 flex items-center justify-between pointer-events-none">
                <div className="flex flex-col gap-1 pointer-events-auto group">
                    <h1 className="text-[11px] tracking-[1.8em] font-serif font-light text-[#C5A059] uppercase transition-all duration-700 group-hover:tracking-[2em]">AURELIAN</h1>
                    <div className="h-[0.5px] w-full bg-gradient-to-r from-[#C5A059] to-transparent"></div>
                </div>
                <div className="pointer-events-auto flex items-center gap-10 text-[8px] tracking-[0.4em] text-white/30 uppercase font-mono">
                    <div className="flex items-center gap-2 group cursor-pointer hover:text-white transition-colors">
                        <lucide.Globe className="w-3 h-3" strokeWidth={1} />
                        <span>GLO_NET</span>
                    </div>
                    <div className="w-px h-6 bg-white/5"></div>
                    <div className="flex items-center gap-2 group cursor-pointer hover:text-[#C5A059] transition-colors">
                        <lucide.Shield className="w-3 h-3" strokeWidth={1} />
                        <span>SECURE_V7</span>
                    </div>
                </div>
            </nav>
            <main className="snap-y snap-mandatory h-screen overflow-y-auto hide-scrollbar relative z-10">
                {ASSETS.map((asset, index) => (
                    <section key={asset.id} className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
                            <img src={asset.image} className={\`w-full h-full object-cover transition-all duration-[12s] ease-out ${activeIndex === index ? 'scale-105 opacity-20' : 'scale-100 opacity-0 blur-2xl'}\`} alt="" />
                            <div className={\`absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[#C5A059]/5 to-transparent z-20 pointer-events-none ${activeIndex === index ? 'animate-[scanline_10s_infinite_linear]' : ''}\`}></div>
                        </div>
                        <div className="relative z-20 flex flex-col items-center">
                            <GoldEntity type={index} active={activeIndex === index} />
                            <div className={\`mt-20 text-center transition-all duration-[2s] delay-700 ${activeIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}\`}>
                                <div className="flex flex-col items-center gap-4">
                                    <span className="text-[7px] tracking-[1.2em] uppercase text-[#C5A059]/60">Vault Encryption Alpha</span>
                                    <h2 className="text-4xl font-serif italic font-light tracking-[0.2em] text-white/90">Asset_Lookbook_{index + 1}</h2>
                                    <div className="flex gap-16 mt-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[6px] text-white/20 uppercase tracking-widest">Type</span>
                                            <span className="text-[8px] text-[#C5A059] uppercase tracking-widest">Irreplaceable</span>
                                        </div>
                                        <div className="flex flex-col gap-1 text-right">
                                            <span className="text-[6px] text-white/20 uppercase tracking-widest">Status</span>
                                            <span className="text-[8px] text-[#C5A059] uppercase tracking-widest">Vaulted</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-1/4 right-24 opacity-5 pointer-events-none hidden lg:block">
                            <div className="text-[120px] font-serif italic text-white leading-none">0{index + 1}</div>
                        </div>
                    </section>
                ))}
            </main>
            <div className="fixed inset-0 pointer-events-none z-[100] border-[1px] border-white/5 m-12"></div>
            <div className="fixed inset-0 pointer-events-none z-[100] shadow-[inset_0_0_250px_rgba(0,0,0,1)]"></div>
            <style dangerouslySetInnerHTML={{
                __html: \`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;1,300&family=Inter:wght@100;200;400&family=JetBrains+Mono:wght@100;400&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #000000; overflow: hidden; cursor: crosshair; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        main { scroll-snap-type: y mandatory; overflow-y: scroll; height: 100vh; scrollbar-width: none; }
        @keyframes scanline { 0% { transform: translateY(-100%); } 100% { transform: translateY(350%); } }
        svg { filter: drop-shadow(0 0 80px rgba(197, 160, 89, 0.08)); }
      \`}} />
        </div>
    );
};
export default App;
`
  };
  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });
}
