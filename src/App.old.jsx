/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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

/**
 * --- GODLIKE ENGINE (v3.0 - Self-Serializing) ---
 * The engine is now a standard function. It serializes its own source code
 * using .toString() to enable infinite self-replication without string escape issues.
 */
function ArchitectWorkshop({ initialFiles, mode = 'edit' }) {
    const [files, setFiles] = useState(initialFiles || { 'App.js': '' });
    const [activeFile, setActiveFile] = useState('App.js');
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
        if (typeof window !== 'undefined' && !window.Babel) {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
            script.async = true;
            script.onload = () => {
                if (isMounted.current) setBabelReady(true);
            };
            document.head.appendChild(script);

            // Inject Tailwind CDN for JIT support
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const twScript = document.createElement('script');
                twScript.src = 'https://cdn.tailwindcss.com';
                twScript.async = true;
                document.head.appendChild(twScript);
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
                React, useState, useEffect, useRef, useMemo, useCallback,
                useContext: React.useContext,
                createContext: React.createContext,
                useReducer: React.useReducer,
                require: (path) => {
                    if (path === 'react') return React;
                    if (path === 'react-dom/client') return ReactDOM;
                    if (path === 'framer-motion') return framerMotion;
                    if (path === 'lucide-react') return lucide;
                    if (path === 'clsx') return { clsx };
                    if (path === 'tailwind-merge') return { twMerge };
                    if (path === 'firebase/app') return firebaseApp;
                    if (path === 'firebase/auth') return firebaseAuth;
                    if (path === 'firebase/firestore') return firebaseFirestore;

                    // Local Import Handling
                    if (path.startsWith('./')) {
                        const sanitized = path.replace('./', '');
                        const target = files[sanitized] ? sanitized : (files[sanitized + '.js'] ? sanitized + '.js' : null);
                        if (target && window.__modules__ && window.__modules__[target]) return window.__modules__[target];
                        return {};
                    }
                    return null;
                }
            };

            window.__modules__ = {};
            let bundle = "";
            const sortedKeys = Object.keys(files).sort((a, b) => (a === 'App.js' ? -1 : b === 'App.js' ? 1 : a.localeCompare(b)));

            sortedKeys.forEach(filename => {
                let code = files[filename];
                const basename = filename.replace(/\.js$/, '');
                try {
                    const transpiled = window.Babel.transform(code, {
                        presets: ["react", "env"],
                        filename: filename
                    }).code;

                    bundle += `
                   (function() {
                       var exports = {};
                       var module = { exports: exports };
                       try {
                           ${transpiled}
                       } catch(e) { console.error("Error executing module ${filename}:", e); throw e; }
                       var content = module.exports.default || module.exports;
                       if (content) {
                           window.__modules__['${filename}'] = module.exports; 
                           window['${basename}'] = content;
                       }
                   })();
                   `;
                } catch (e) {
                    console.error("Transpilation failed for " + filename, e);
                    throw e;
                }
            });

            const finalScope = {
                ...scope,
                files,
                setFiles,
                saveAsDefault,
                render: (c) => {
                    if (isMounted.current && rootInstance.current) {
                        rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c));
                    }
                }
            };

            // Execution with environment injection
            const executeBody = `try { 
                ${bundle} 
                
                const env = {
                    files,
                    updateFiles: (newFiles) => setFiles(newFiles),
                    saveProject: saveAsDefault
                };

                const Target = (typeof App !== 'undefined' ? App : (typeof Main !== 'undefined' ? Main : null));
                if (Target) render(React.createElement(Target, { env }));
                } catch(e) { throw e; }`;

            new Function(...Object.keys(finalScope), executeBody)(...Object.values(finalScope));
        } catch (err) {
            if (isMounted.current) setError(err.message);
        }
    };

    useEffect(() => {
        if (mode !== 'edit' || !isEditorOpen) return;
        const handleKeys = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") executeCode();
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); saveAsDefault(); }
        };
        window.addEventListener("keydown", handleKeys);
        return () => window.removeEventListener("keydown", handleKeys);
    }, [isEditorOpen, mode, files]);

    useEffect(() => {
        if (mode === 'edit') {
            const toggle = (e) => { if (e.key === "F8") setShowWorkshopUI(p => !p); };
            window.addEventListener("keydown", toggle);
            return () => window.removeEventListener("keydown", toggle);
        }
    }, [mode]);

    const copyActiveCode = () => {
        navigator.clipboard.writeText(files[activeFile] || "").then(() => { setCopyFeedback("code"); setTimeout(() => setCopyFeedback(null), 2000); });
    };

    const saveAsDefault = () => {
        const nl = "\n";
        const filesJson = JSON.stringify(files, null, 2);

        // 1. Get Engine Source directly from the function itself
        const engineSourceCode = ArchitectWorkshop.toString();

        // 2. Construct the full file
        const newFileContent =
            "/* eslint-disable */" + nl +
            "import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';" + nl +
            "import * as lucide from 'lucide-react';" + nl +
            "import * as framerMotion from 'framer-motion';" + nl +
            "import ReactDOM from 'react-dom/client';" + nl +
            "import { clsx } from 'clsx';" + nl +
            "import { twMerge } from 'tailwind-merge';" + nl +
            "import * as firebaseApp from 'firebase/app';" + nl +
            "import * as firebaseAuth from 'firebase/auth';" + nl +
            "import * as firebaseFirestore from 'firebase/firestore';" + nl + nl +
            "// --- ENVIRONMENT CONSTANTS ---" + nl +
            "const ENV = {" + nl +
            "    isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')," + nl +
            "    isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost'" + nl +
            "};" + nl + nl +
            "// --- GODLIKE ENGINE (v3.0) ---" + nl +
            engineSourceCode + nl + nl +
            "// --- ROOT ENTRY ---" + nl +
            "export default function RootApp() {" + nl +
            "  const initialFiles = " + filesJson + ";" + nl +
            "  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });" + nl +
            "}";

        navigator.clipboard.writeText(newFileContent)
            .then(() => { setCopyFeedback("save"); setTimeout(() => setCopyFeedback(null), 2000); })
            .catch(err => setError("Clipboard failed: " + err));
    };

    const { Code2, Save, Copy, Check, X, File: FileIcon, Plus, Trash2 } = lucide;
    const { AnimatePresence, motion } = framerMotion;
    return h('div', { className: "relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white" },
        h('div', { ref: previewRef, className: "h-full w-full overflow-y-auto" }),
        mode === 'edit' && h(React.Fragment, null,
            h(AnimatePresence, null, showWorkshopUI && h(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, className: "fixed top-6 right-6 flex items-center gap-2 z-[500]" },
                h('button', { onClick: () => setIsEditorOpen(true), className: "p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-amber-500 transition-all active:scale-95 shadow-xl", title: "Open Code" }, h(Code2, { size: 16 })),
                h('button', { onClick: copyActiveCode, className: "p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-amber-500 transition-all active:scale-95 shadow-xl", title: "Copy Active Code" }, copyFeedback === "code" ? h(Check, { size: 16, className: "text-amber-500" }) : h(Copy, { size: 16 })),
                h('button', { onClick: saveAsDefault, className: "p-3 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full text-white/40 hover:text-blue-500 transition-all active:scale-95 shadow-xl", title: "Copy Full Project to Clipboard" }, copyFeedback === "save" ? h(Check, { size: 16, className: "text-blue-500" }) : h(Save, { size: 16 }))
            )),
            h(AnimatePresence, null, isEditorOpen && h(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[600] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-8 lg:p-20" },
                h(motion.div, { initial: { scale: 0.95, y: 30 }, animate: { scale: 1, y: 0 }, exit: { scale: 0.95, y: 30 }, className: "w-full max-w-6xl h-full flex flex-col bg-[#080808] border border-white/5 rounded-[2rem] shadow-2xl overflow-hidden" },
                    h('div', { className: "flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#0a0a0a]" },
                        h('div', {}, h('h3', { className: "font-serif italic text-xl text-white tracking-widest uppercase" }, "Godlike Engine v2"), h('p', { className: "text-[9px] text-amber-500/80 uppercase tracking-[0.3em] font-bold" }, babelReady ? "Neural Link Active" : "Initializing...")),
                        h('button', { onClick: () => setIsEditorOpen(false), className: "text-white/20 hover:text-white transition-colors" }, h(X, { size: 20 }))
                    ),
                    h('div', { className: "flex-1 flex overflow-hidden" },
                        h('div', { className: "w-48 bg-[#050505] border-r border-white/5 flex flex-col" },
                            h('div', { className: "p-4 space-y-2 overflow-y-auto flex-1 relative z-10" },
                                Object.keys(files).map(filename => h('button', { key: filename, onClick: () => setActiveFile(filename), className: `w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between group relative z-20 ${activeFile === filename ? 'bg-amber-500/10 text-amber-500' : 'text-neutral-500 hover:text-neutral-300'}` }, h('span', { className: "truncate" }, filename), filename !== 'App.js' && h(Trash2, { size: 10, className: "opacity-0 group-hover:opacity-100 hover:text-rose-500 relative z-30", onClick: (e) => { e.stopPropagation(); const newFiles = { ...files }; delete newFiles[filename]; setFiles(newFiles); if (activeFile === filename) setActiveFile('App.js'); } }))
                                ),
                                h('div', { className: "p-4 border-t border-white/5 relative z-10" },
                                    h('button', { onClick: () => { const name = prompt("Filename?", "Component.js"); if (name && !files[name]) setFiles({ ...files, [name]: "import React from 'react';\nimport { BackButton } from './App.js';\n\nexport default function Component() {\n  return (\n    <div className='min-h-screen bg-neutral-900 text-white p-20'>\n      <BackButton onClick={() => window.location.hash = ''} />\n      <h1 className='text-4xl font-bold'>New Component</h1>\n    </div>\n  );\n}" }); }, className: "w-full py-2 flex items-center justify-center gap-2 border border-dashed border-white/10 rounded-lg text-white/20 hover:text-white/60 hover:border-white/20 transition-all text-[10px] uppercase tracking-widest relative z-20" }, h(Plus, { size: 10 }), "New File")
                                )
                            ),
                            h('div', { className: "flex-1 flex overflow-col bg-[#080808] relative" },
                                h('textarea', { value: files[activeFile] || "", onChange: (e) => setFiles({ ...files, [activeFile]: e.target.value }), spellCheck: "false", className: "flex-1 bg-transparent p-8 font-mono text-xs text-neutral-400 focus:outline-none no-scrollbar leading-relaxed resize-none", placeholder: "// Write your React code here..." }),
                                h('div', { className: "absolute bottom-6 right-8 flex gap-4" },
                                    h('button', { onClick: copyActiveCode, className: "px-6 py-2 bg-neutral-800 text-white rounded-full text-[10px] uppercase font-bold hover:bg-neutral-700 transition-all shadow-lg" }, copyFeedback === "code" ? "Copied" : "Copy Code"),
                                    h('button', { onClick: () => executeCode(), className: "px-6 py-2 bg-white text-black rounded-full text-[10px] uppercase font-bold hover:bg-amber-500 transition-all shadow-lg" }, "Apply Logic")
                                )
                            )
                        ),
                        error && h('div', { className: "p-4 bg-rose-950/20 border-t border-rose-500/20 text-rose-400 text-[10px] font-mono" }, error)
                    )
                )
            )
            ))
    );
}

// --- ROOT ENTRY ---
export default function RootApp() {
    const initialFiles = {
        "App.js": `import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import LandingPage from './LandingPage.js';

// --- PAGE REGISTRY ---
const INITIAL_PAGES = [
    { id: 'landing', name: 'Aurelian Landing', component: 'LandingPage', description: 'The default futuristic 3D showcase.' },
];

export default function App({ env }) {
    // --- ROUTER & STATE ---
    const [activePage, setActivePage] = useState('dashboard');
    const [pages, setPages] = useState(INITIAL_PAGES);

    // --- SYNC PAGES FROM SOURCE ---
    useEffect(() => {
        if (env && env.files && env.files['App.js']) {
            const appCode = env.files['App.js'];
            const match = appCode.match(/const INITIAL_PAGES = (\\[[\\s\\S]*?\\]);/);
            if (match && match[1]) {
                try {
                    const parsed = eval(match[1]);
                    setPages(parsed);
                } catch (e) { console.error("Failed to parse registry:", e); }
            }
        }
    }, [env]);

    // --- HASH ROUTER ---
    useEffect(() => {
        const handleHash = () => {
            const hash = window.location.hash.replace('#', '').toLowerCase();
            if (!hash) setActivePage('dashboard');
            else setActivePage(hash);
        };
        handleHash();
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    // --- ACTIONS ---
    const navigate = (pageId) => setActivePage(pageId);

    const handleAddPage = () => {
        if (!env) { alert("Engine Environment not connected."); return; }
        const name = prompt("Enter Page Name (e.g., 'About Us'):");
        if (!name) return;
        const rawName = name.replace(/[^a-zA-Z0-9]/g, '');
        const filename = rawName + ".js";
        const componentName = rawName;
        const pageId = rawName.toLowerCase();

        if (env.files[filename]) { alert("Page already exists!"); return; }

        const newComponentCode = \`import React from 'react';
import * as lucide from 'lucide-react';
import { BackButton } from './App.js';

export default function \${componentName}() {
    return (
        <div className="min-h-screen bg-black text-white p-8 flex flex-col items-center justify-center font-sans">
            <div className="absolute inset-0 bg-neutral-900/20" />
            <BackButton onClick={() => window.location.hash = ''} /> 
            <h1 className="text-6xl font-serif italic text-[#C5A059] mb-4 tracking-widest">\${name}</h1>\n            <p className="text-white/40 font-mono text-xs tracking-[0.2em] uppercase">Start editing \${filename}</p>
        </div>
    );
}\`;

        let appCode = env.files['App.js'];
        const importStmt = \`import \${componentName} from './\${filename}';\\n\`;
        if (!appCode.includes(importStmt)) appCode = importStmt + appCode;

        const newPageEntry = \`    { id: '\${pageId}', name: '\${name}', component: '\${componentName}', description: 'A new custom vault entry.' },\`;
        appCode = appCode.replace(/const INITIAL_PAGES = \\[\\s*/, \`const INITIAL_PAGES = [\\n\${newPageEntry}\\n\`);

        env.updateFiles({
            ...env.files,
            [filename]: newComponentCode,
            'App.js': appCode
        });
    };

    const handleDeletePage = (pId, pComp) => {
        if (!env || !confirm("Delete this page?")) return;
        const filename = pComp + ".js";
        let appCode = env.files['App.js'];
        const lineRegex = new RegExp(\`\\\\{\\\\s*id:\\\\s*'\${pId}'[\\\\s\\\\S]*?\\\\},?\`, 'g');
        appCode = appCode.replace(lineRegex, '');
        const importRegex = new RegExp(\`import\\\\s+\${pComp}\\\\s+from\\\\s+['"]\\\\.\\\\/\${filename}['"];?\\\\n?\`, 'g');
        appCode = appCode.replace(importRegex, '');
        const newFiles = { ...env.files, 'App.js': appCode };
        delete newFiles[filename];
        env.updateFiles(newFiles);
    };

    const handleSaveProject = () => {
        if (env && env.saveProject) env.saveProject();
    };

    const getComponent = (compName) => {
        try { return eval(compName); } catch (e) { return null; }
    };

    if (activePage !== 'dashboard') {
        const page = pages.find(p => p.id === activePage);
        const PageComponent = page ? getComponent(page.component) : null;
        if (PageComponent) {
            return (
                <>
                    <BackButton onClick={() => navigate('dashboard')} />
                    <PageComponent />
                </>
            );
        }
        return <div className="p-10 text-white">Page not found.</div>;
    }

    // --- DASHBOARD VIEW (V3 AURELIAN) ---
    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-[#C5A059] selection:text-black relative overflow-hidden">
            {/* Atmospheric Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#1a1a1a] via-[#000000] to-[#000000]"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            </div>

            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 px-8 py-6 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border border-[#C5A059]/20 flex items-center justify-center transform hover:rotate-45 transition-transform duration-700">
                        <div className="w-2 h-2 bg-[#C5A059] rounded-full shadow-[0_0_15px_#C5A059]"></div>
                    </div>
                    <div>
                        <h1 className="text-lg font-serif italic tracking-wider text-white">Aurelian Engine</h1>
                        <p className="text-[9px] text-white/30 uppercase tracking-[0.3em]">System V.3.0</p>
                    </div>
                </div>
                <button 
                    onClick={handleSaveProject} 
                    className="group px-6 py-2 bg-[#C5A059]/10 border border-[#C5A059]/20 hover:bg-[#C5A059] hover:text-black transition-all rounded-full flex items-center gap-2"
                >
                    <lucide.Save size={14} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Save Protocol</span>
                </button>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-8 pt-32 pb-20">
                <div className="mb-20 space-y-4">
                    <p className="text-[#C5A059] font-mono text-xs tracking-[0.2em] uppercase">/// Accessing Mainframe</p>
                    <h2 className="text-5xl md:text-7xl font-serif font-light text-white tracking-wide">
                        Construct Your <span className="italic text-white/50">Legacy</span>
                    </h2>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {/* Create New Card */}
                    <button 
                        onClick={handleAddPage}
                        className="group relative h-80 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center gap-6 hover:border-[#C5A059]/50 hover:bg-[#C5A059]/5 transition-all duration-500"
                    >
                        <div className="p-5 rounded-full bg-white/5 group-hover:bg-[#C5A059] group-hover:text-black transition-colors duration-500">
                            <lucide.Plus size={24} />
                        </div>
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-white/40 group-hover:text-[#C5A059]">Initialize New Asset</span>
                    </button>

                    {/* Page Cards */}
                    {pages.map(page => (
                        <div key={page.id} className="group relative h-80 bg-[#080808] border border-white/5 rounded-xl overflow-hidden hover:border-[#C5A059]/30 transition-all duration-500 hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            
                            {/* Card Content */}
                            <div className="relative h-full p-8 flex flex-col">
                                <div className="flex justify-between items-start">
                                    <lucide.Workflow className="text-white/20 group-hover:text-[#C5A059] transition-colors" size={24} />
                                    {page.id !== 'landing' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id, page.component); }} className="text-white/10 hover:text-red-500 transition-colors pointer-events-auto z-50">
                                            <lucide.Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-auto space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-serif italic text-white mb-2">{page.name}</h3>
                                        <p className="text-xs text-white/40 font-light leading-relaxed">{page.description}</p>
                                    </div>
                                    <button 
                                        onClick={() => { navigate(page.id); window.location.hash = page.id; }}
                                        className="w-full py-4 border-t border-white/10 flex items-center justify-between text-xs font-mono uppercase tracking-widest text-white/60 hover:text-[#C5A059] transition-colors group/btn"
                                    >
                                        Isolate Sequence 
                                        <lucide.ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- UTILITIES ---
export function BackButton({ onClick }) {
    return (
        <button
            onClick={onClick}
            className="fixed top-8 left-8 z-[100] group flex items-center gap-3 px-5 py-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-full hover:border-[#C5A059]/50 transition-all"
        >
            <lucide.ChevronLeft size={14} className="text-white/60 group-hover:text-[#C5A059] transition-colors" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60 group-hover:text-white">Return to Hub</span>
        </button>
    );
}
// Expose for usage in other isolated blocks
if (typeof window !== 'undefined') window.BackButton = BackButton;
`,
        "LandingPage.js": `/**
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
            </nav>
            <main className="snap-y snap-mandatory h-screen overflow-y-auto hide-scrollbar relative z-10 w-full">
                {ASSETS.map((asset, index) => (
                    <section key={asset.id} className="relative h-screen w-full snap-start flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 z-0">
                            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black z-10" />
                            <img src={asset.image} className={\`w-full h-full object-cover transition-all duration-[12s] ease-out \${activeIndex === index ? 'scale-105 opacity-20' : 'scale-100 opacity-0 blur-2xl'}\`} alt="" />
                            <div className={\`absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[#C5A059]/5 to-transparent z-20 pointer-events-none \${activeIndex === index ? 'animate-[scanline_10s_infinite_linear]' : ''}\`}></div>
                        </div>
                        <div className="relative z-20 flex flex-col items-center">
                            <GoldEntity type={index} active={activeIndex === index} />
                            <div className={\`mt-20 text-center transition-all duration-[2s] delay-700 \${activeIndex === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}\`}>
                                <h2 className="text-4xl font-serif italic font-light tracking-[0.2em] text-white/90">Asset_Lookbook_{index + 1}</h2>
                            </div>
                        </div>
                    </section>
                ))}
            </main>
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
}
`,
        "HUDOverlay.js": `import React from 'react';
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
                            <div key={i} className={\`w-[2px] h-1 \${i < (activeIndex + 1) * 5 ? 'bg-[#C5A059]' : 'bg-white/5'}\`}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
`,
        "GoldEntity.js": `import React from 'react';

export default function GoldEntity({ type, active }) {
    // --- FIX START: Absolute URL Reference for Gradients ---
    const [loc, setLoc] = React.useState('');
    React.useEffect(() => { setLoc(window.location.href); }, []);
    
    const getRef = (id) => "url(" + loc + "#" + id + ")";
    // --- FIX END ---

    const baseClasses = \`w-72 h-72 md:w-[32rem] md:h-[32rem] transition-all duration-[4s] cubic-bezier(0.16, 1, 0.3, 1)\`;
    const activeClasses = active ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-90 blur-3xl';
    const entities = [
        <svg viewBox="0 0 200 200" fill="none">
            <circle cx="100" cy="100" r="95" stroke={getRef("goldGrad")} strokeWidth="0.1" />
            <path d="M100 20L180 100L100 180L20 100L100 20Z" stroke={getRef("goldGrad")} strokeWidth="0.5" filter={getRef("goldGlow")} />
            <path d="M100 40L160 100L100 160L40 100L100 40Z" fill={getRef("goldGrad")} opacity="0.8" />
            <circle cx="100" cy="100" r="30" stroke={getRef("goldGrad")} strokeWidth="0.2" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            <ellipse cx="100" cy="100" rx="90" ry="30" stroke={getRef("goldGrad")} strokeWidth="0.5" transform="rotate(45 100 100)" />
            <ellipse cx="100" cy="100" rx="90" ry="30" stroke={getRef("goldGrad")} strokeWidth="0.5" transform="rotate(-45 100 100)" />
            <circle cx="100" cy="100" r="40" fill={getRef("goldGrad")} opacity="0.9" />
            <circle cx="100" cy="100" r="60" stroke={getRef("goldGrad")} strokeWidth="0.2" strokeDasharray="1 5" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            {[...Array(6)].map((_, i) => (
                <path key={i} d="M100 100L150 50L100 0L50 50L100 100Z" fill={getRef("goldGrad")} opacity={0.3 + (i * 0.1)} transform={\`rotate(\${i * 60} 100 100)\`} />
            ))}
            <rect x="80" y="80" width="40" height="40" stroke={getRef("goldGrad")} strokeWidth="1" transform="rotate(45 100 100)" />
        </svg>,
        <svg viewBox="0 0 200 200" fill="none">
            <path d="M100 20L170 180H140L100 90L60 180H30L100 20Z" fill={getRef("goldGrad")} />
            <path d="M100 20L100 180" stroke={getRef("goldGrad")} strokeWidth="0.2" strokeDasharray="4 4" />
            <circle cx="100" cy="140" r="10" stroke={getRef("goldGrad")} strokeWidth="1" />
        </svg>
    ];
    return (
        <div className={\`\${baseClasses} \${activeClasses} relative group\`}>
            <div className="absolute inset-0 bg-[#C5A059]/10 blur-[100px] rounded-full scale-50 opacity-50 group-hover:scale-100 transition-transform duration-[5s]\"></div>
            {entities[type % entities.length]}
        </div>
    );
}
`
    };
    return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });
}
