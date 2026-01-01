export default function ArchitectWorkshop({ initialFiles, mode = 'edit' }) {
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
        console.log("ArchitectWorkshop: Mounted");
        if (typeof window !== 'undefined' && !window.Babel) {
            console.log("ArchitectWorkshop: Loading Babel...");
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
            script.async = true;
            script.onload = () => {
                console.log("ArchitectWorkshop: Babel Loaded");
                if (isMounted.current) setBabelReady(true);
            };
            document.head.appendChild(script);
        } else {
            console.log("ArchitectWorkshop: Babel already present");
            setBabelReady(true);
        }
        return () => {
            isMounted.current = false;
            if (rootInstance.current) {
                setTimeout(() => { rootInstance.current?.unmount(); rootInstance.current = null; }, 0);
            }
        };
    }, []);

    useEffect(() => {
        console.log("ArchitectWorkshop: State Update", { babelReady, files: !!files, isMounted: isMounted.current });
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
            const transpiledFiles = {};
            Object.keys(files).forEach(filename => {
                let code = files[filename] || "";
                if (code.match(/export\s+default\s+function/)) {
                    code = code.replace(/export\s+default\s+function\s+(\w+)/, "const __default__ = function $1");
                    code = code.replace(/export\s+default\s+function/, "const __default__ = function");
                } else if (code.match(/export\s+default\s+/)) {
                    code = code.replace(/export\s+default\s+/, "const __default__ = ");
                }
                code = code.replace(/export\s+const\s+(\w+)/g, "const $1");
                transpiledFiles[filename] = window.Babel.transform(code, { presets: ["react", ["env", { modules: false }]] }).code;
            });
            const scope = {
                React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ...lucide,
                require: (path) => {
                    const cleanPath = path.replace(/^\.\//, '');
                    if (transpiledFiles[cleanPath]) throw new Error("Sync require not fully supported.");
                    return null;
                }
            };
            let bundle = "";
            const sortedKeys = Object.keys(files).sort((a, b) => (a === 'App.js' ? 1 : b === 'App.js' ? -1 : a.localeCompare(b)));
            sortedKeys.forEach(filename => {
                let code = files[filename];
                code = code.replace(/import\s+.*?from\s+['"]\.\/.*?['"];?/g, "");
                code = code.replace(/import\s+.*?from\s+['"].*?['"];?/g, "");
                code = code.replace(/export\s+default\s+/g, "");
                code = code.replace(/export\s+/g, "");
                bundle += "\n// --- " + filename + " ---\n" + code + "\n";
            });
            const transpiledBundle = window.Babel.transform(bundle, { presets: ["react", ["env", { modules: false }]] }).code;
            const executeBody = `try { ${transpiledBundle} 
            const Target = (typeof App !== 'undefined' ? App : (typeof Main !== 'undefined' ? Main : null));
            if (Target) render(React.createElement(Target));
        } catch(e) { throw e; }`;
            const finalScope = { ...scope, render: (c) => { if (isMounted.current && rootInstance.current) rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c)); } };
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
        const q = "'"; const nl = "\\n";
        const filesJson = JSON.stringify(files, null, 2);
        const newFileContent =
            "import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';" + nl +
            "import * as lucide from 'lucide-react';" + nl +
            "import * as framerMotion from 'framer-motion';" + nl +
            "import ReactDOM from 'react-dom/client';" + nl +
            "import { clsx } from 'clsx';" + nl +
            "import { twMerge } from 'tailwind-merge';" + nl + nl +
            "const ENV = { " + nl +
            "  isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'), " + nl +
            "  isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost' " + nl +
            "};" + nl + nl +
            "/**" + nl +
            " * --- THE GODLIKE ENGINE (v2.0) ---" + nl +
            " * A self-replicating, multi-file React environment." + nl +
            " */" + nl +
            "const ENGINE_SOURCE = " + JSON.stringify(ENGINE_SOURCE) + ";" + nl + nl +
            "// --- HYDRATE ENGINE ---" + nl +
            "const ArchitectWorkshop = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'framerMotion', 'lucide', 'clsx', 'twMerge', 'ReactDOM', 'ENGINE_SOURCE', 'return ' + ENGINE_SOURCE)(React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ReactDOM, ENGINE_SOURCE);" + nl + nl +
            "// --- ROOT ENTRY ---" + nl +
            "export default function RootApp() {" + nl +
            "  const initialFiles = " + filesJson + ";" + nl +
            "  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view' });" + nl +
            "}";
        navigator.clipboard.writeText(newFileContent).then(() => { setCopyFeedback("save"); setTimeout(() => setCopyFeedback(null), 2000); }).catch(err => setError("Clipboard failed: " + err));
    };
    const { Code2, Save, Copy, Check, X, File: FileIcon, Plus, Trash2 } = lucide;
    const { AnimatePresence, motion } = framerMotion;
    return h('div', { className: "relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white" },
        h('div', { ref: previewRef, className: "h-full w-full" }),
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
                            h('div', { className: "p-4 space-y-2 overflow-y-auto flex-1" },
                                Object.keys(files).map(filename => h('button', { key: filename, onClick: () => setActiveFile(filename), className: `w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition-all flex items-center justify-between group ${activeFile === filename ? 'bg-amber-500/10 text-amber-500' : 'text-neutral-500 hover:text-neutral-300'}` }, h('span', { className: "truncate" }, filename), filename !== 'App.js' && h(Trash2, { size: 10, className: "opacity-0 group-hover:opacity-100 hover:text-rose-500", onClick: (e) => { e.stopPropagation(); const newFiles = { ...files }; delete newFiles[filename]; setFiles(newFiles); if (activeFile === filename) setActiveFile('App.js'); } })))
                            ),
                            h('div', { className: "p-4 border-t border-white/5" },
                                h('button', { onClick: () => { const name = prompt("Filename?", "Component.js"); if (name && !files[name]) setFiles({ ...files, [name]: "export default function Component() {\\n  return <div>New Component</div>\\n}" }); }, className: "w-full py-2 flex items-center justify-center gap-2 border border-dashed border-white/10 rounded-lg text-white/20 hover:text-white/60 hover:border-white/20 transition-all text-[10px] uppercase tracking-widest" }, h(Plus, { size: 10 }), "New File")
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
        );
}
