/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';
import * as lucide from 'lucide-react';
import * as framerMotion from 'framer-motion';
import ReactDOM from 'react-dom/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';

// --- ENVIRONMENT CONSTANTS ---
const ENV = {
    isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'),
    isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost'
};

// --- GODLIKE ENGINE (v3.0) ---
function ArchitectWorkshop({ initialFiles, mode = "edit" }) {
    const [files, setFiles] = useState(initialFiles || { "App.js": "" });
    const [activeFile, setActiveFile] = useState("App.js");
    const [error, setError] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showWorkshopUI, setShowWorkshopUI] = useState(true);
    const [copyFeedback, setCopyFeedback] = useState(null);
    const [babelReady, setBabelReady] = useState(false);
    const previewRef = useRef(null);
    const rootInstance = useRef(null);
    const isMounted = useRef(false);
    const h = React.createElement;
    useEffect(() => {
        isMounted.current = true;
        if (typeof window !== "undefined" && !window.Babel) {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/@babel/standalone/babel.min.js";
            script.async = true;
            script.onload = () => {
                if (isMounted.current) setBabelReady(true);
            };
            document.head.appendChild(script);
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const tw = document.createElement("script");
                tw.src = "https://cdn.tailwindcss.com";
                tw.async = true;
                document.head.appendChild(tw);
            }
        } else {
            setBabelReady(true);
        }
        return () => {
            isMounted.current = false;
        };
    }, []);
    useEffect(() => {
        if (babelReady && files && isMounted.current) {
            const timer = setTimeout(() => executeCode(), 100);
            return () => clearTimeout(timer);
        }
    }, [babelReady, files]);
    const executeCode = () => {
        if (!previewRef.current || !window.Babel || !isMounted.current) return;
        setError(null);
        try {
            if (!rootInstance.current && previewRef.current) rootInstance.current = ReactDOM.createRoot(previewRef.current);
            const scope = {
                React,
                useState,
                useEffect,
                useRef,
                useMemo,
                useCallback,
                useContext,
                createContext,
                useReducer,
                require: (path) => {
                    if (path === "react") return React;
                    if (path === "react-dom/client") return ReactDOM;
                    if (path === "framer-motion") return framerMotion;
                    if (path === "lucide-react") return lucide;
                    if (path === "clsx") return { clsx };
                    if (path === "tailwind-merge") return { twMerge };
                    if (path === "firebase/app") return firebaseApp;
                    if (path === "firebase/auth") return firebaseAuth;
                    if (path === "firebase/firestore") return firebaseFirestore;
                    if (path.startsWith("./")) {
                        const sanitized = path.replace("./", "");
                        return window.__modules__ && window.__modules__[sanitized] ? window.__modules__[sanitized] : {};
                    }
                    return null;
                }
            };
            window.__modules__ = {};
            let bundle = "";
            Object.keys(files).forEach((f) => {
                const code = files[f];
                const cleanName = f.replace(".js", "");
                try {
                    const transpiled = window.Babel.transform(code, { presets: ["react", "env"], filename: f }).code;
                    bundle += `(function(){ var exports={}; var module={exports:exports}; ${transpiled}; window.__modules__['${f}'] = module.exports; window['${cleanName}'] = module.exports.default || module.exports; })();`;
                } catch (e) {
                    React.createElement("div", {}, e.message);
                }
            });
            const finalScope = { ...scope, files, setFiles, saveAsDefault, render: (c) => rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c)) };
            new Function(...Object.keys(finalScope), `try { ${bundle} const T = (typeof App !== 'undefined' ? App : null); if(T) render(React.createElement(T, {env:{files, updateFiles: setFiles, saveProject: saveAsDefault}})); } catch(e){ throw e; }`)(...Object.values(finalScope));
        } catch (e) {
            setError(e.message);
        }
    };
    const saveAsDefault = () => {
        const nl = "\n";
        const filesJson = JSON.stringify(files, null, 2);
        let engineSourceCode = ArchitectWorkshop.toString();
        engineSourceCode = engineSourceCode.replace(/^[ \t]*_s\(\);[\r\n]*/gm, "");
        engineSourceCode = engineSourceCode.replace(/^[ \t]*_c\s*=[^;]+;[\r\n]*/gm, "");
        engineSourceCode = engineSourceCode.replace(/^[ \t]*\$RefreshReg\$[^;]+;[\r\n]*/gm, "");
        const newFileContent = "/* eslint-disable */" + nl + "import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';" + nl + "import * as lucide from 'lucide-react';" + nl + "import * as framerMotion from 'framer-motion';" + nl + "import ReactDOM from 'react-dom/client';" + nl + "import { clsx } from 'clsx';" + nl + "import { twMerge } from 'tailwind-merge';" + nl + "import * as firebaseApp from 'firebase/app';" + nl + "import * as firebaseAuth from 'firebase/auth';" + nl + "import * as firebaseFirestore from 'firebase/firestore';" + nl + nl + "// --- ENVIRONMENT CONSTANTS ---" + nl + "const ENV = {" + nl + "    isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')," + nl + "    isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost'" + nl + "};" + nl + nl + "// --- GODLIKE ENGINE (v3.0) ---" + nl + engineSourceCode + nl + nl + "// --- ROOT ENTRY ---" + nl + "export default function RootApp() {" + nl + "  const initialFiles = " + filesJson + ";" + nl + "  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });" + nl + "}";
        navigator.clipboard.writeText(newFileContent).then(() => {
            setCopyFeedback("save");
            setTimeout(() => setCopyFeedback(null), 2e3);
        }).catch((err) => setError("Clipboard failed: " + err));
    };
    const copyActiveCode = () => {
        navigator.clipboard.writeText(files[activeFile] || "").then(() => {
            setCopyFeedback("code");
            setTimeout(() => setCopyFeedback(null), 2e3);
        });
    };
    const { Code2, Save, Copy, Check, X, Plus, Trash2 } = lucide;
    const { AnimatePresence, motion } = framerMotion;
    return h(
        "div",
        { className: "relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white" },
        h("div", { ref: previewRef, className: "h-full w-full overflow-y-auto" }),
        mode === "edit" && h(
            React.Fragment,
            null,
            h(AnimatePresence, null, showWorkshopUI && h(
                motion.div,
                { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, className: "fixed top-6 right-6 flex items-center gap-2 z-[500]" },
                h("button", { onClick: () => setIsEditorOpen(true), className: "p-3 bg-black/60 rounded-full" }, h(Code2, { size: 16 })),
                h("button", { onClick: copyActiveCode, className: "p-3 bg-black/60 rounded-full" }, copyFeedback === "code" ? h(Check, { size: 16 }) : h(Copy, { size: 16 })),
                h("button", { onClick: saveAsDefault, className: "p-3 bg-black/60 rounded-full" }, copyFeedback === "save" ? h(Check, { size: 16 }) : h(Save, { size: 16 }))
            )),
            h(AnimatePresence, null, isEditorOpen && h(
                motion.div,
                { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-8 lg:p-20" },
                h(
                    motion.div,
                    { initial: { scale: 0.95 }, animate: { scale: 1 }, exit: { scale: 0.95 }, className: "w-full max-w-6xl h-full flex flex-col bg-[#080808] border border-white/5 rounded-xl overflow-hidden" },
                    h("div", { className: "flex items-center justify-between p-4 bg-[#0a0a0a]" }, h("h3", {}, "Godlike Engine v3.0"), h("button", { onClick: () => setIsEditorOpen(false) }, h(X, { size: 20 }))),
                    h(
                        "div",
                        { className: "flex-1 flex overflow-hidden" },
                        h(
                            "div",
                            { className: "w-48 bg-[#050505] p-4 space-y-2 overflow-y-auto" },
                            Object.keys(files).map((filename) => h("button", { key: filename, onClick: () => setActiveFile(filename), className: `w-full text-left p-2 rounded ${activeFile === filename ? "text-amber-500" : "text-gray-400"}` }, filename))
                        ),
                        h(
                            "div",
                            { className: "flex-1 flex flex-col bg-[#080808]" },
                            h("textarea", { value: files[activeFile] || "", onChange: (e) => setFiles({ ...files, [activeFile]: e.target.value }), className: "flex-1 bg-transparent p-4 font-mono text-xs text-gray-300 resize-none outline-none" })
                        )
                    )
                )
            ))
        )
    );
}

// --- ROOT ENTRY ---
export default function RootApp() {
    const initialFiles = {
        "App.js": `import c from './c.js';
import b from './b.js';
import a from './a.js';
import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';

// --- PAGE REGISTRY ---
const INITIAL_PAGES = [
    { id: 'c', name: 'c', component: 'c' },
{ id: 'b', name: 'b', component: 'b' },
{ id: 'a', name: 'a', component: 'a' },
];

export default function App({ env }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [pages, setPages] = useState(INITIAL_PAGES);

    useEffect(() => {
        if (env && env.files && env.files['App.js']) {
            const match = env.files['App.js'].match(/const INITIAL_PAGES = (\\[[\\s\\S]*?\\]);/);
            if (match && match[1]) try { setPages(eval(match[1])); } catch (e) {}
        }
    }, [env]);

    // Added Logic: Handle Hash Changes for Legacy buttons
    useEffect(() => {
        const handleHash = () => { if(window.location.hash === '' || window.location.hash === '#') setActivePage('dashboard'); };
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    const navigate = (id) => setActivePage(id);

    const handleAddPage = () => {
        if (!env) return alert("Env not connected");
        const name = prompt("Page Name?");
        if (!name) return;
        const clean = name.replace(/[^a-zA-Z0-9]/g, '');
        const filename = clean + ".js";
        if (env.files[filename]) return;

        const code = \`import React from 'react';
export default function \${clean}() {
  return <div className="p-20 text-white"><h1>\${name}</h1></div>;
}\`;
        
        // Update App.js imports
        let app = env.files['App.js'];
        if (!app.includes(\`import \${clean}\`)) app = \`import \${clean} from './\${filename}';\\n\` + app;
        // Update Registry
        app = app.replace(/const INITIAL_PAGES = \\[\\s*/, \`const INITIAL_PAGES = [\\n    { id: '\${clean.toLowerCase()}', name: '\${name}', component: '\${clean}' },\\n\`);
        
        env.updateFiles({ ...env.files, [filename]: code, 'App.js': app });
    };

    const handleDelete = (id, comp) => {
        if (!confirm("Delete?")) return;
        const filename = comp + ".js";
        let app = env.files['App.js'];
        app = app.replace(new RegExp(\`\\\\{\\\\s*id:\\\\s*'\${id}'[\\\\s\\\\S]*?\\\\},?\`, 'g'), '');
        app = app.replace(new RegExp(\`import\\\\s+\${comp}\\\\s+from\\\\s+['\"]\\\\.\\\\/\${filename}['\"];?\\\\n?\`, 'g'), '');
        const newFiles = { ...env.files, 'App.js': app };
        delete newFiles[filename];
        env.updateFiles(newFiles);
    };

    // --- RENDER ---
    const getComp = (name) => { try { return eval(name); } catch(e) { return null; } };

    if (activePage !== 'dashboard') {
        const p = pages.find(pg => pg.id === activePage);
        const C = p ? getComp(p.component) : null;
        return C ? <><BackButton onClick={() => navigate('dashboard')} /><C /></> : <div className="text-white">404</div>;
    }

    return (
        <div className="min-h-screen bg-[#020202] text-white p-8 font-sans">
             <nav className="flex justify-between items-center mb-20 border-b border-white/10 pb-6">
                 <div><h1 className="text-xl italic font-serif">Aurelian Engine</h1><p className="text-[10px] uppercase tracking-widest text-neutral-500">System V3.0</p></div>
                 <div className="flex gap-4">
                    <button onClick={handleAddPage} className="px-4 py-2 bg-white/5 text-white/40 text-xs border border-white/10 rounded-full hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2"><lucide.Plus size={12}/> New Page</button>
                    <button onClick={() => env.saveProject()} className="px-4 py-2 bg-amber-500/10 text-amber-500 text-xs border border-amber-500/20 rounded-full hover:bg-amber-500 hover:text-black transition-colors">Save Protocol</button>
                 </div>
             </nav>
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-7xl mx-auto">
                 {pages.map(p => (
                     <div key={p.id} onClick={() => navigate(p.id)} className="cursor-pointer bg-[#0A0A0A] border border-white/5 rounded-xl p-4 flex flex-col items-center gap-3 hover:border-amber-500/50 hover:bg-[#0A0A0A] transition-all group relative">
                         <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center text-amber-500/80 group-hover:text-amber-500 group-hover:bg-amber-500/10 transition-all shadow-inner">
                             <lucide.Box size={24} strokeWidth={1.5} />
                         </div>
                         <h3 className="text-xs font-medium tracking-wide text-white/70 group-hover:text-white text-center truncate w-full">{p.name}</h3>
                         
                         <button onClick={(e) => {e.stopPropagation(); handleDelete(p.id, p.component)}} className="absolute top-2 right-2 text-white/5 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><lucide.X size={12} /></button>
                     </div>
                 ))}
             </div>
        </div>
    );
}

export const BackButton = ({ onClick }) => (
    <button onClick={onClick} className="fixed top-8 left-8 z-[100] p-3 bg-black/50 backdrop-blur border border-white/10 rounded-full hover:bg-white hover:text-black transition-all">
        <lucide.ArrowLeft size={20} />
    </button>
);`,
        "a.js": `import React, { useState, useEffect, useMemo } from 'react';

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
  const baseClasses = \`w-64 h-64 md:w-[28rem] md:h-[28rem] transition-all duration-[3s] cubic-bezier(0.16, 1, 0.3, 1)\`;
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
      <circle cx="100" cy="100" r="80" stroke="url(#goldGrad)" strokeWidth="0.25" />
      <path d="M100 20L130 70H70L100 20Z" fill="url(#goldGrad)" opacity="0.9" />
      <path d="M100 180L70 130H130L100 180Z" fill="url(#goldGrad)" opacity="0.9" />
      <rect x="60" y="60" width="80" height="80" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(45 100 100)" />
      <circle cx="100" cy="100" r="40" stroke="url(#goldGrad)" strokeWidth="0.2" />
    </svg>,
    // Entity 2: The Orbital
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="90" stroke="url(#goldGrad)" strokeWidth="0.1" />
      <circle cx="100" cy="100" r="70" stroke="url(#goldGrad)" strokeWidth="0.5" strokeDasharray="2 4" />
      <path d="M100 30C138.66 30 170 61.3401 170 100C170 138.66 138.66 170 100 170" stroke="url(#goldGrad)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="100" cy="100" r="15" fill="url(#goldGrad)" />
      <ellipse cx="100" cy="100" rx="95" ry="35" stroke="url(#goldGrad)" strokeWidth="0.5" transform="rotate(-30 100 100)" />
    </svg>,
    // Entity 3: The Geometric Symmetery
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      {[...Array(12)].map((_, i) => (
        <rect 
          key={i} 
          x="60" y="60" width="80" height="80" 
          stroke="url(#goldGrad)" 
          strokeWidth="0.4" 
          transform={\`rotate(\${i * 30} 100 100)\`} 
          opacity={0.2 + (i * 0.05)}
        />
      ))}
      <circle cx="100" cy="100" r="8" fill="url(#goldGrad)" />
    </svg>,
    // Entity 4: The Minimalist A (Sculptural)
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M100 30L170 170H145L100 75L55 170H30L100 30Z" fill="url(#goldGrad)" />
      <path d="M70 120H130" stroke="url(#goldGrad)" strokeWidth="0.5" strokeDasharray="2 2" />
    </svg>
  ];

  return (
    <div className={\`\${baseClasses} \${activeClasses} relative group cursor-none\`}>
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
    <div className="bg-[#010101] text-white selection:bg-[#C5A059] selection:text-black antialiased overflow-hidden">
      
      {/* Dynamic Grid System */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: \`linear-gradient(to right, #C5A059 1px, transparent 1px), linear-gradient(to bottom, #C5A059 1px, transparent 1px)\`,
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
                className={\`w-full h-full object-cover grayscale transition-all duration-[12s] ease-out \${activeIndex === index ? 'scale-110 opacity-20' : 'scale-100 opacity-0'}\`}
                alt=""
              />
              {/* Animated Scan Line */}
              <div className={\`absolute left-0 w-full h-[1px] bg-[#C5A059]/10 z-20 top-0 \${activeIndex === index ? 'animate-[scanning_8s_infinite]' : 'hidden'}\`}></div>
            </div>

            {/* Centered Golden Sculpture */}
            <div className="relative z-20 flex flex-col items-center">
              <GoldEntity type={index} active={activeIndex === index} />
              
              {/* Asset Title: Integrated HUD Style */}
              <div className={\`mt-16 text-center transition-all duration-1000 delay-500 \${activeIndex === index ? 'opacity-100' : 'opacity-0 translate-y-8'}\`}>
                 <p className="text-[8px] tracking-[0.8em] uppercase text-[#C5A059]/40 mb-2">Vault Entry</p>
                 <h2 className="text-3xl font-serif italic font-light tracking-widest text-white/80">Asset_0{index + 1}</h2>
              </div>
            </div>

            {/* Vertical Progress Component */}
            <div className="absolute left-16 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-4 items-center">
              {ASSETS.map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-4">
                  <div 
                    className={\`w-[1px] transition-all duration-1000 \${i === activeIndex ? 'bg-[#C5A059] h-24' : 'bg-white/5 h-6'}\`}
                  />
                  {i === activeIndex && (
                    <span className="text-[8px] font-mono text-[#C5A059] rotate-90 translate-y-4">P_{i+1}</span>
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

      <style dangerouslySetInnerHTML={{ __html: \`
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
      \`}} />
    </div>
  );
};

export default App;`,
        "b.js": "import React from 'react';\nexport default function b() {\n  return <div className=\"p-20 text-white\"><h1>b</h1></div>;\n}",
        "c.js": "import React from 'react';\nexport default function c() {\n  return <div className=\"p-20 text-white\"><h1>c</h1></div>;\n}"
    };
    return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });
}
