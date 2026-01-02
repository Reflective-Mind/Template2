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
import * as PrismJS from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import * as ReactSimpleCodeEditor from 'react-simple-code-editor';
import * as ReactMarkdownModule from 'react-markdown';
import thinkTreeSource from './ThinkTreeCode.jsx?raw';

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
    const [showWorkshopUI, setShowWorkshopUI] = useState(false);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "F8") setShowWorkshopUI((prev) => !prev);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);
    const [copyFeedback, setCopyFeedback] = useState(null);
    const [babelReady, setBabelReady] = useState(false);
    const [livePreview, setLivePreview] = useState(true);
    const [needsRun, setNeedsRun] = useState(false);
    const lastExecutedSigRef = useRef("");
    const previewRef = useRef(null);
    const rootInstance = useRef(null);
    const isMounted = useRef(false);
    const transpileCacheRef = useRef(/* @__PURE__ */ new Map());
    const h = React.createElement;
    useEffect(() => {
        if (initialFiles && initialFiles["ThinkTree.js"]) {
            setFiles((prev) => {
                if (prev["ThinkTree.js"] !== initialFiles["ThinkTree.js"]) {
                    console.log("[HMR] Updating ThinkTree.js from source");
                    return { ...prev, "ThinkTree.js": initialFiles["ThinkTree.js"] };
                }
                return prev;
            });
        }
    }, [initialFiles]);
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
        if (babelReady && isMounted.current) {
            const sig = JSON.stringify(files);
            if (livePreview) {
                const timer = setTimeout(() => {
                    executeCode();
                    lastExecutedSigRef.current = sig;
                    setNeedsRun(false);
                }, 100);
                return () => clearTimeout(timer);
            } else if (sig !== lastExecutedSigRef.current) {
                setNeedsRun(true);
            }
        }
    }, [babelReady, files, livePreview]);
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
                    if (path === "prismjs") return PrismJS;
                    if (path === "react-simple-code-editor") return ReactSimpleCodeEditor;
                    if (path === "react-markdown") return ReactMarkdownModule;
                    if (path.startsWith("./")) {
                        const sanitized = path.replace("./", "");
                        return window.__modules__ && window.__modules__[sanitized] ? window.__modules__[sanitized] : {};
                    }
                    return null;
                }
            };
            window.__modules__ = {};
            window.Prism = PrismJS.default || PrismJS;
            let bundle = "";
            Object.keys(files).forEach((f) => {
                const code = files[f];
                const cleanName = f.replace(".js", "");
                const cacheKey = `${f}::${code.length}::${code.substring(0, 50)}`;
                let transpiled;
                if (transpileCacheRef.current.has(cacheKey)) {
                    transpiled = transpileCacheRef.current.get(cacheKey);
                } else {
                    try {
                        transpiled = window.Babel.transform(code, { presets: ["react", "env"], filename: f }).code;
                        transpileCacheRef.current.set(cacheKey, transpiled);
                    } catch (e) {
                        console.error("Compilation Error (" + f + "):", e);
                        throw new Error("Compilation Error in " + f + ": " + e.message);
                    }
                }
                bundle += `(function(){ var exports={}; var module={exports:exports}; ${transpiled}; window.__modules__['${f}'] = module.exports; window['${cleanName}'] = module.exports.default || module.exports; })();`;
            });
            const finalScope = {
                ...scope,
                Prism: PrismJS,
                Editor: ReactSimpleCodeEditor.Editor || ReactSimpleCodeEditor.default || ReactSimpleCodeEditor,
                ReactMarkdown: ReactMarkdownModule.default || ReactMarkdownModule,
                files,
                setFiles,
                saveAsDefault,
                render: (c) => rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c))
            };
            const safeEnv = Object.freeze({
                files: Object.freeze({ ...files }),
                updateFiles: setFiles,
                // Setter is safe (closure)
                saveProject: saveAsDefault
            });
            new Function(...Object.keys(finalScope), `try { ${bundle} const T = (typeof App !== 'undefined' ? App : null); if(T) render(React.createElement(T, {env: ${JSON.stringify(safeEnv)} /* frozen */ })); } catch(e){ throw e; }`)(...Object.values(finalScope));
            if (window.App) {
                rootInstance.current.render(h(React.Fragment, { key: Date.now() }, h(window.App, { env: safeEnv })));
            }
        } catch (e) {
            console.error("Engine Runtime Error:", e);
            setError(e.message);
        }
    };
    const runNow = () => {
        executeCode();
        lastExecutedSigRef.current = JSON.stringify(files);
        setNeedsRun(false);
    };
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!livePreview && (e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                runNow();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [livePreview, files]);
    const saveAsDefault = () => {
        const nl = "\n";
        const filesJson = JSON.stringify(files, null, 2);
        let engineSourceCode = ArchitectWorkshop.toString();
        engineSourceCode = engineSourceCode.replace(/^[ \t]*_s\(\);[\r\n]*/gm, "");
        engineSourceCode = engineSourceCode.replace(/^[ \t]*_c\s*=[^;]+;[\r\n]*/gm, "");
        engineSourceCode = engineSourceCode.replace(/^[ \t]*\$RefreshReg\$[^;]+;[\r\n]*/gm, "");
        const imports = [
            "import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';",
            "import * as lucide from 'lucide-react';",
            "import * as framerMotion from 'framer-motion';",
            "import ReactDOM from 'react-dom/client';",
            "import { clsx } from 'clsx';",
            "import { twMerge } from 'tailwind-merge';",
            "import * as firebaseApp from 'firebase/app';",
            "import * as firebaseAuth from 'firebase/auth';",
            "import * as firebaseFirestore from 'firebase/firestore';",
            // Critical Prism & Editor Imports
            "import * as PrismJS from 'prismjs';",
            "import 'prismjs/components/prism-clike';",
            "import 'prismjs/components/prism-javascript';",
            "import 'prismjs/components/prism-typescript';",
            "import 'prismjs/components/prism-jsx';",
            "import 'prismjs/components/prism-css';",
            "import 'prismjs/components/prism-python';",
            "import 'prismjs/components/prism-json';",
            "import 'prismjs/components/prism-sql';",
            "import 'prismjs/components/prism-markdown';",
            "import * as ReactSimpleCodeEditor from 'react-simple-code-editor';",
            "import * as ReactMarkdownModule from 'react-markdown';",
            "import thinkTreeSource from './ThinkTreeCode.jsx?raw';"
        ].join(nl);
        const newFileContent = "/* eslint-disable */" + nl + imports + nl + nl + "// --- ENVIRONMENT CONSTANTS ---" + nl + "const ENV = {" + nl + "    isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')," + nl + "    isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost'" + nl + "};" + nl + nl + "// --- GODLIKE ENGINE (v3.0) ---" + nl + engineSourceCode + nl + nl + "// --- ROOT ENTRY ---" + nl + "export default function RootApp() {" + nl + "  const initialFiles = " + filesJson + ";" + nl + "  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });" + nl + "}";
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
    const { Code2, Save, Copy, Check, X, Plus, Trash2, Play } = lucide;
    const { AnimatePresence, motion } = framerMotion;
    return h(
        "div",
        { className: "relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white" },
        h("div", { ref: previewRef, className: "h-full w-full overflow-y-auto" }),
        error && h("div", { className: "fixed bottom-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded-lg border border-red-500 z-[9999] font-mono text-xs whitespace-pre-wrap shadow-2xl" }, "RUNTIME ERROR: " + error),
        mode === "edit" && h(
            React.Fragment,
            null,
            h(AnimatePresence, null, showWorkshopUI && h(
                motion.div,
                { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, className: "fixed top-6 right-6 flex items-center gap-2 z-[500]" },
                h("button", { onClick: () => setLivePreview(!livePreview), className: `px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!livePreview ? "bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50" : "bg-black/60 text-white"}` }, livePreview ? "Live" : "Paused"),
                !livePreview && h("button", { onClick: runNow, className: `p-3 rounded-full transition-all ${needsRun ? "bg-amber-500 text-black animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-black/60 text-gray-400 hover:text-white"}` }, h(Play, { size: 16, fill: "currentColor" })),
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
        ),
        !livePreview && needsRun && h("div", { className: "fixed top-20 right-8 px-4 py-2 bg-black/80 text-amber-500 text-xs font-mono border border-amber-500/30 rounded-lg pointer-events-none z-[490]" }, "Preview paused — press Run")
    );
}

const appJsSource = `import ThinkTree from './ThinkTree.js';
import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';

// --- PAGE REGISTRY ---
const INITIAL_PAGES_JSON = \`[
    {
        "id": "home",
        "name": "Home",
        "component": "Home",
        "layer": null,
        "order": 0
    },
    {
        "id": "thinktree",
        "name": "ThinkTree",
        "component": "ThinkTree",
        "layer": "Personal",
        "order": 0
    }
]\`;
const INITIAL_LAYER_ORDER_JSON = \`["Personal"]\`;

const INITIAL_PAGES = JSON.parse(INITIAL_PAGES_JSON);
const INITIAL_LAYER_ORDER = JSON.parse(INITIAL_LAYER_ORDER_JSON);

export default function App({ env }) {
    const [activePage, setActivePage] = useState('home');
    const [pages, setPages] = useState(INITIAL_PAGES);
    const [layerOrder, setLayerOrder] = useState(INITIAL_LAYER_ORDER);
    const [showDevTools, setShowDevTools] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e) => { if (e.key === 'F8') setShowDevTools(prev => !prev); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Sync from Registry
    useEffect(() => {
        if (env && env.files && env.files['App.js']) {
            const matchP = env.files['App.js'].match(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/);
            if (matchP && matchP[1]) { try { setPages(JSON.parse(matchP[1])); } catch (e) {} }
            const matchL = env.files['App.js'].match(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/);
            if (matchL && matchL[1]) { try { setLayerOrder(JSON.parse(matchL[1])); } catch (e) {} }
        }
    }, [env]);

    // Hash Logic
    useEffect(() => {
        const handleHash = () => { if(window.location.hash === '' || window.location.hash === '#') setActivePage('home'); };
        window.addEventListener('hashchange', handleHash);
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    const navigate = (id) => setActivePage(id);

    // --- MANIPULATION ---
    const updateRegistry = (newPages, newLayerOrder) => {
        if (!env) return;
        let app = env.files['App.js'];
        if (newPages) app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        if (newLayerOrder) app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(newLayerOrder, null, 4)}\\\`;\`);
        env.updateFiles({ ...env.files, 'App.js': app });
    };

    const handleAddPage = () => {
        if (!env) return alert("Env not connected");
        const name = prompt("Page Name?");
        if (!name) return;
        const layer = prompt("Layer? (e.g. Personal, Work, Tools)") || "Personal";
        const clean = name.replace(/[^a-zA-Z0-9]/g, '');
        const filename = clean + ".js";
        if (env.files[filename]) return;

        const code = \`import React from 'react';\\nexport default function \${clean}() {\\n  return <div className="h-full w-full p-10 text-white bg-[#0A0A0A] flex items-center justify-center">\\n      <div className="text-center">\\n          <h1 className="text-4xl font-bold mb-4">\${name}</h1>\\n          <p className="text-zinc-500">Edit this file to build your page.</p>\\n      </div>\\n  </div>;\\n}\`;
        
        let app = env.files['App.js'];
        if (!app.includes(\`import \${clean}\`)) app = \`import \${clean} from './\${filename}';\\n\` + app;
        
        const layerPages = pages.filter(p => p.layer === layer);
        const maxOrder = layerPages.length > 0 ? Math.max(...layerPages.map(p => p.order || 0)) : -1;
        const newPageObj = { id: clean.toLowerCase(), name: name, component: clean, layer: layer, order: maxOrder + 1 };
        const newPages = [...pages, newPageObj];
        
        let newLayerOrder = null;
        if (!layerOrder.includes(layer)) newLayerOrder = [...layerOrder, layer];
        
        if (newPages) app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        if (newLayerOrder) app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(newLayerOrder, null, 4)}\\\`;\`);

        env.updateFiles({ ...env.files, [filename]: code, 'App.js': app });
    };

    const handleDelete = (id, comp) => {
        if (!confirm("Delete?")) return;
        if (id === 'home') return alert("Cannot delete home page.");
        const filename = comp + ".js";
        let app = env.files['App.js'];
        app = app.replace(new RegExp(\`import\\\\s+\${comp}\\\\s+from\\\\s+['"]\\\\.\\\\/\${filename}['"];?\\\\n?\`, 'g'), '');
        const newPages = pages.filter(p => p.id !== id);
        app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        const newFiles = { ...env.files, 'App.js': app };
        delete newFiles[filename];
        env.updateFiles(newFiles);
    };

    const moveLayer = (name, dir) => {
        const idx = layerOrder.indexOf(name);
        if (idx === -1) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= layerOrder.length) return;
        const newOrder = [...layerOrder];
        [newOrder[idx], newOrder[newIdx]] = [newOrder[newIdx], newOrder[idx]];
        updateRegistry(null, newOrder);
    };

    const movePage = (id, dir) => {
        const page = pages.find(p => p.id === id);
        if (!page) return;
        const siblings = pages.filter(p => p.layer === page.layer).sort((a,b) => (a.order||0) - (b.order||0));
        const selfIndex = siblings.findIndex(p => p.id === id);
        const targetIndex = selfIndex + dir;
        if (targetIndex < 0 || targetIndex >= siblings.length) return;
        
        const reOrdered = siblings.map((p, i) => ({ ...p, order: i }));
        const sSelf = reOrdered[selfIndex];
        const sTarget = reOrdered[targetIndex];
        sSelf.order = targetIndex;
        sTarget.order = selfIndex;
        
        const finalPages = pages.map(p => {
             const found = reOrdered.find(s => s.id === p.id);
             return found || p;
        });
        updateRegistry(finalPages, null);
    };

    const getComp = (name) => {
        try {
            return window[name] 
                || (window.__modules__ && window.__modules__['App.js'] && window.__modules__['App.js'][name])
                || (window.__modules__ && window.__modules__[name + '.js'] ? (window.__modules__[name + '.js'].default || window.__modules__[name + '.js']) : null);
        } catch(e) { return null; }
    };

    const layers = pages.reduce((acc, p) => {
        if (!p.layer) return acc;
        const l = p.layer;
        if (!acc[l]) acc[l] = [];
        acc[l].push(p);
        return acc;
    }, {});

    const sortedLayerNames = Object.keys(layers).sort((a, b) => {
        const idxA = layerOrder.indexOf(a);
        const idxB = layerOrder.indexOf(b);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.localeCompare(b);
    });

    const ActiveComponent = (() => {
        const p = pages.find(pg => pg.id === activePage) || pages.find(pg => pg.id === 'home');
        return p ? getComp(p.component) : null;
    })();

    return (
        <div className="h-screen w-screen bg-[#020202] text-white font-sans flex flex-col overflow-hidden">
             <nav className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#050505] sticky top-0 z-50 shrink-0 select-none">
                 <div className="flex items-center gap-6">
                     <div onClick={() => navigate('home')} className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 group-hover:scale-105 transition-all outline outline-1 outline-transparent group-hover:outline-amber-500/30"><lucide.Cpu size={18} /></div>
                        <div><h1 className="text-sm font-bold text-gray-200 tracking-tight leading-none group-hover:text-white transition-colors">Aurelian</h1></div>
                     </div>
                     <div className="h-4 w-px bg-white/10 mx-2"></div>
                     <div className="flex items-center gap-4">
                     {sortedLayerNames.map(layerName => {
                            const layerPages = layers[layerName].sort((a,b) => (a.order||0) - (b.order||0));
                            return (
                             <div key={layerName} className="relative group flex items-center gap-1">
                                 {showDevTools && (
                                     <div className="flex flex-col -space-y-1">
                                         <div onClick={(e) => {e.stopPropagation(); moveLayer(layerName, -1)}} className="cursor-pointer hover:text-white text-zinc-600"><lucide.ChevronLeft size={10} /></div>
                                         <div onClick={(e) => {e.stopPropagation(); moveLayer(layerName, 1)}} className="cursor-pointer hover:text-white text-zinc-600"><lucide.ChevronRight size={10} /></div>
                                     </div>
                                 )}
                                 <div className="relative group/btn">
                                     <button className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
                                         {layerName}
                                         <lucide.ChevronDown size={10} className="text-zinc-600 group-hover/btn:text-zinc-400" />
                                     </button>
                                     <div className="absolute top-full left-0 mt-1 min-w-[160px] bg-[#0A0A0A] border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/btn:opacity-100 group-hover/btn:visible transition-all duration-200 z-[100] transform origin-top-left flex flex-col py-1">
                                         {layerPages.map(p => (
                                             <button key={p.id} onClick={() => navigate(p.id)} className={\`text-left w-full px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between \${activePage === p.id ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}\`}>
                                                 <span>{p.name}</span>
                                                 {showDevTools && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col -space-y-1">
                                                             <div onClick={(e) => {e.stopPropagation(); movePage(p.id, -1)}} className="hover:text-blue-400 cursor-pointer"><lucide.ChevronUp size={8}/></div>
                                                             <div onClick={(e) => {e.stopPropagation(); movePage(p.id, 1)}} className="hover:text-blue-400 cursor-pointer"><lucide.ChevronDown size={8}/></div>
                                                        </div>
                                                        {p.id !== 'home' && (
                                                            <div onClick={(e) => {e.stopPropagation(); handleDelete(p.id, p.component)}} className="text-zinc-700 hover:text-red-500 p-1 rounded hover:bg-white/5">
                                                                <lucide.Trash2 size={10} />
                                                            </div>
                                                        )}
                                                    </div>
                                                 )}
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             </div>
                         )
                     })}
                     </div>
                 </div>
                 {showDevTools && <div className="flex gap-2 ml-4 shrink-0">
                    <button onClick={handleAddPage} className="p-1.5 bg-white/5 text-zinc-500 rounded hover:bg-zinc-800 hover:text-white transition-all" title="New Page"><lucide.Plus size={14}/></button>
                    <button onClick={() => env.saveProject()} className="p-1.5 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-all" title="Save Protocol"><lucide.Save size={14}/></button>
                 </div>}
             </nav>
             <main className="flex-1 relative overflow-hidden bg-[#0A0A0A]">
                {ActiveComponent ? <ActiveComponent /> : <div className="flex h-full items-center justify-center text-zinc-600 font-mono text-sm">404: Component Not Found</div>}
             </main>
        </div>
    );
}
export function Home() {
    return (
        <div className="h-full w-full flex flex-col items-center justify-center bg-[#020202] text-white p-10 select-none">
            <div className="flex flex-col items-center justify-center">
                 <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/10">
                    <lucide.Cpu size={32} className="text-zinc-400" />
                 </div>
                 <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Aurelian</h1>
            </div>
        </div>
    );
}
`;

// --- ROOT ENTRY ---
export default function RootApp() {
    const initialFiles = {
        "App.js": appJsSource,
        "ThinkTree.js": thinkTreeSource,
        "ThinkTreeCode.jsx": thinkTreeSource
    };
    return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });
}