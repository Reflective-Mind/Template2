/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';
import * as lucide from 'lucide-react';
import * as framerMotion from 'framer-motion';
import ReactDOM from 'react-dom/client';
import * as reactDomLegacy from 'react-dom';
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

// --- ENVIRONMENT CONSTANTS ---
const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '';
const host = typeof window !== 'undefined' ? window.location.hostname : '';
const ENV = {
    isLocal: typeof window !== 'undefined' && isLocalHost(host),
    isProd: typeof window !== 'undefined' && !isLocalHost(host)
};
const DEV_KEY =
    (typeof import.meta !== "undefined" && import.meta.env && (import.meta.env.VITE_DEV_KEY || import.meta.env.VITE_EDITOR_KEY)) ||
    (typeof process !== "undefined" && process.env && (process.env.REACT_APP_DEV_KEY || process.env.REACT_APP_EDITOR_KEY)) ||
    ""; // Optional passcode to unlock dev/edit mode in production

// --- ACCESS CONTROL HELPER ---
// --- ACCESS CONTROL HELPER ---
function getAccessControl(runtimeKey) {
    if (typeof window === 'undefined') return { devEnabled: false, editEnabled: false };

    // 1. Localhost: Always unlocked
    if (ENV.isLocal) return { devEnabled: true, editEnabled: true };

    const params = new URLSearchParams(window.location.search);
    const providedKey = params.get('devKey');
    const effectiveKey = runtimeKey || DEV_KEY;

    // 2. Production: Must match secret key
    if (!effectiveKey || providedKey !== effectiveKey) {
        return { devEnabled: false, editEnabled: false };
    }

    // 3. Flags
    const hasFlag = (key) => {
        const v = params.get(key);
        return v === '1' || v === 'true' || v === 'on';
    };
    const editFlag = hasFlag('edit');
    const devFlag = hasFlag('dev') || editFlag;

    return { devEnabled: devFlag, editEnabled: editFlag };
}

// ----------------------------------------------------------------------
// --- ENGINE CONTRACT (DO NOT REMOVE OR MODIFY WITHOUT ADJUSTING TESTS) ---
// ----------------------------------------------------------------------
// 1. MUST accept AI-generated React pages incorporating external libs.
// 2. Import Normalizer MUST be allowlist-based.
// 3. MUST preserve React, local ('./'), and side-effect imports.
// 4. MUST be Idempotent (normalize(normalize(x)) === normalize(x)).
// 5. If a package is NOT in the allowlist, it MUST be left as 'import ...'.
//    EXCEPTION: 'three' and 'three/examples/*' are explicitly allowed/rewritten.

const runEngineContractTests = (normalizerFn, allowlist, env) => {
    if (!env.isLocal) return;
    const testCases = [
        // A) import * as X
        { input: "import * as THREE from 'three';", expected: "const THREE = require('three');" },
        // B) import X / 3) Preserve React (Should NOT change)
        { input: "import React from 'react';", expected: "import React from 'react';" },
        { input: "import React, { useEffect } from 'react';", expected: "import React, { useEffect } from 'react';" },
        // Legacy ReactDOM (Should rewrite to require)
        { input: "import ReactDOM from 'react-dom';", expected: "const ReactDOM = require('react-dom');" },
        { input: "import { createPortal } from 'react-dom';", expected: "const { createPortal } = require('react-dom');" },
        // 5) Unknown library (Should NOT change)
        { input: "import X from 'some-unknown-pkg';", expected: "import X from 'some-unknown-pkg';" },
        // 5 EXCEPTION) Allowlist library (Should change)
        { input: "import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';", expected: "const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls.js');" },
        // 4) Local file (Should NOT change)
        { input: "import X from './localFile';", expected: "import X from './localFile';" },
        // 4) Side effect (Should NOT change)
        { input: "import 'prismjs/components/prism-jsx';", expected: "import 'prismjs/components/prism-jsx';" },
        // C) Named imports
        { input: "import { clsx } from 'clsx';", expected: "const { clsx } = require('clsx');" },
        // C) Renaming
        { input: "import { A, B as C } from 'clsx';", expected: "const { A, B: C } = require('clsx');" },
        // D) Default + Named
        { input: "import X, { A, B as C } from 'clsx';", expected: "const X = require('clsx'); const { A, B: C } = require('clsx');" },
        // E) Default as alias
        { input: "import { default as X } from 'clsx';", expected: "const X = require('clsx');" }
    ];
    let errors = [];
    testCases.forEach(({ input, expected }, idx) => {
        const result = normalizerFn(input, "test.js", allowlist).trim();
        if (result !== expected.trim()) {
            errors.push(`Case ${idx} failed.
Input: ${input}
Expected: ${expected}
Got:      ${result}`);
        }
        const round2 = normalizerFn(result, "test.js", allowlist).trim();
        if (round2 !== result) {
            errors.push(`Case ${idx} Idempotence failed.
Round 1: ${result}
Round 2: ${round2}`);
        }
    });
    if (errors.length > 0) {
        console.error("ENGINE CONTRACT FAILED");
        errors.forEach((e) => console.error(e));
    } else {
        console.log("Engine Contract: All tests passed.");
    }
};

const AURELIAN_ENGINE_SOURCE = `
function ArchitectWorkshop({ initialFiles, mode = "edit", locked = false, devKey: propsDevKey }) {
    const [files, setFiles] = useState(initialFiles || { "App.js": "" });
    const [activeFile, setActiveFile] = useState("App.js");
    const [error, setError] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showWorkshopUI, setShowWorkshopUI] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "F8") {
                setShowWorkshopUI((prev) => !prev);
                if (locked) {
                    setToastMsg("Workshop View-Only (LOCKED).");
                    setTimeout(() => setToastMsg(null), 2e3);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, locked]);
    const [copyFeedback, setCopyFeedback] = useState(null);
    const [showGithubDialog, setShowGithubDialog] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [githubConfig, setGithubConfig] = useState({
        repo: "Reflective-Mind/Template2",
        branch: "main",
        filePath: "src/engine.generated.jsx",
        commitMessage: "Update MindVara site"
    });
    const [babelReady, setBabelReady] = useState(false);
    const [livePreview, setLivePreview] = useState(true);
    const [needsRun, setNeedsRun] = useState(false);
    const safeEnv = useMemo(() => ({
        toolkit: { open: showWorkshopUI, mode },
        updateFiles: (cb) => {
            if (mode === 'edit') setFiles(prev => {
                const next = cb(prev);
                return next;
            });
        },
        saveProject: saveAsDefault,
        devKey: propsDevKey
    }), [showWorkshopUI, mode, propsDevKey]);
    const [threeReady, setThreeReady] = useState(typeof window !== "undefined" && !!window.THREE);
    const pendingAutoRunRef = useRef(false);
    const lastExecutedSigRef = useRef("");
    const prevLivePreviewRef = useRef(true);
    const previewRef = useRef(null);
    const rootInstance = useRef(null);
    const isMounted = useRef(false);
    const transpileCacheRef = useRef(/* @__PURE__ */ new Map());
    const contractTested = useRef(false);
    const h = React.createElement;
    useEffect(() => {
        if (initialFiles) {
            setFiles((prev) => {
                const next = { ...prev };
                let changed = false;
                Object.keys(initialFiles).forEach((f) => {
                    if (initialFiles[f] && initialFiles[f] !== prev[f]) {
                        console.log("[HMR] Updating " + f + " from source");
                        next[f] = initialFiles[f];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [initialFiles]);
    useEffect(() => {
        isMounted.current = true;
        if (typeof window !== "undefined") {
            window.__ensureAurelianFonts = () => {
                if (document.getElementById("aurelian-font-space-grotesk")) return;
                const link = document.createElement("link");
                link.id = "aurelian-font-space-grotesk";
                link.rel = "stylesheet";
                link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&display=swap";
                document.head.appendChild(link);
            };
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const tw = document.createElement("script");
                tw.src = "https://cdn.tailwindcss.com";
                tw.async = true;
                document.head.appendChild(tw);
            }
            if (!window.THREE && !document.querySelector('script[src*="three.min.js"]')) {
                const three = document.createElement("script");
                three.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
                three.async = true;
                three.onload = () => {
                    setThreeReady(true);
                    if (pendingAutoRunRef.current) {
                        pendingAutoRunRef.current = false;
                        setTimeout(() => executeCode(), 100);
                    }
                };
                document.head.appendChild(three);
            } else if (window.THREE && !threeReady) {
                setThreeReady(true);
            }
        }
        if (typeof window !== "undefined" && !window.Babel) {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/@babel/standalone/babel.min.js";
            script.async = true;
            script.onload = () => {
                if (isMounted.current) setBabelReady(true);
            };
            document.head.appendChild(script);
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
            if (livePreview && !isEditorOpen) {
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
    }, [babelReady, files, livePreview, isEditorOpen, showWorkshopUI, mode]);
    const normalizeImports = (source, filename, allowlist) => {
        if (filename.endsWith(".css") || filename.endsWith(".json")) return source;
        const isRewritable = (path) => {
            if (path.startsWith("./") || path.startsWith("../")) return false;
            if (["react", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"].includes(path)) return false;
            if (allowlist.includes(path)) return true;
            if (path === "three" || path.startsWith("three/examples/")) return true;
            return false;
        };
        let code = source;
        code = code.replace(/from\\s*['"]\\.\\/([^ '"]+)\\.js['"]/g, "from './$1'");
        const sub = (pattern, replacer) => {
            code = code.replace(pattern, replacer);
        };
        sub(/import\\s+(\\w+)\\s*,\\s*\\{([\\s\\S]*?)\\}\\s+from\\s+['"]([^'"]+)['"];?/g, (m, defName, named, path) => {
            if (!isRewritable(path)) return m;
            const namedBody = named.split(",").map((s) => {
                const part = s.trim();
                if (part.includes(" as ")) {
                    const [imp, alias] = part.split(" as ").map((x) => x.trim());
                    return \`\${imp}: \${alias}\`;
                }
                return part;
            }).join(", ");
            return \`const \${defName} = require('\${path}'); const { \${namedBody} } = require('\${path}');\`;
        });
        sub(/import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s+['"]([^'"]+)['"];?/g, (m, alias, path) => {
            if (!isRewritable(path)) return m;
            return \`const \${alias} = require('\${path}');\`;
        });
        sub(/import\\s+\\{([\\s\\S]*?)\\}\\s+from\\s+['"]([^'"]+)['"];?/g, (m, body, path) => {
            if (!isRewritable(path)) return m;
            const parts = body.split(",").map((s) => s.trim()).filter(Boolean);
            if (parts.length === 1 && parts[0].includes(" as ") && parts[0].split(" as ")[0].trim() === "default") {
                const alias = parts[0].split(" as ")[1].trim();
                return \`const \${alias} = require('\${path}');\`;
            }
            const mapped = parts.map((s) => {
                if (s.includes(" as ")) {
                    const [imp, alias] = s.split(" as ").map((x) => x.trim());
                    return \`\${imp}: \${alias}\`;
                }
                return s;
            }).join(", ");
            return \`const { \${mapped} } = require('\${path}');\`;
        });
        sub(/import\\s+(\\w+)\\s+from\\s+['"]([^'"]+)['"];?/g, (m, name, path) => {
            if (!isRewritable(path)) return m;
            return \`const \${name} = require('\${path}');\`;
        });
        return code;
    };
    const executeCode = () => {
        if (!window.Babel || !isMounted.current) return;
        if (!previewRef.current) {
            pendingAutoRunRef.current = false;
            return;
        }
        setError(null);
        try {
            if (!rootInstance.current && previewRef.current) rootInstance.current = ReactDOM.createRoot(previewRef.current);
            const wrapFn = (fn, named = {}) => Object.assign((...args) => fn(...args), { default: fn, ...named });
            const wrapComp = (Comp, named = {}) => Object.assign((props) => React.createElement(Comp, props), { default: Comp, ...named });
            const clsxCompat = wrapFn(clsx, { clsx });
            const twMergeCompat = wrapFn(twMerge, { twMerge });
            const RMarkdown = ReactMarkdownModule.default || ReactMarkdownModule;
            const rMarkdownCompat = wrapComp(RMarkdown);
            const CodeEditorComp = ReactSimpleCodeEditor.default || ReactSimpleCodeEditor;
            const rEditorCompat = wrapComp(CodeEditorComp, { Editor: CodeEditorComp });
            const PrismRuntime = PrismJS.default || PrismJS;
            const prismCompat = { ...PrismRuntime, default: PrismRuntime };
            const DEPENDENCIES = {
                "react": React,
                "react-dom/client": ReactDOM,
                "framer-motion": framerMotion,
                "lucide-react": lucide,
                "clsx": clsxCompat,
                "tailwind-merge": twMergeCompat,
                "firebase/app": firebaseApp,
                "firebase/auth": firebaseAuth,
                "firebase/firestore": firebaseFirestore,
                "prismjs": prismCompat,
                "react-simple-code-editor": rEditorCompat,
                "react-markdown": rMarkdownCompat,
                "three": window.THREE,
                "react-dom": reactDomLegacy
                // Legacy for createPortal etc.
            };
            const allowlist = Object.keys(DEPENDENCIES);
            if (ENV.isLocal && !contractTested.current) {
                runEngineContractTests(normalizeImports, allowlist, ENV);
                contractTested.current = true;
            }
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
                useLayoutEffect,
                require: (path) => {
                    if (DEPENDENCIES[path]) return DEPENDENCIES[path];
                    if (path === "three") {
                        if (window.THREE) return window.THREE;
                        pendingAutoRunRef.current = true;
                        throw new Error("Three.js is still loading. It will auto-run when ready.");
                    }
                    if (path.startsWith("three/examples/")) {
                        if (!window.THREE) {
                            pendingAutoRunRef.current = true;
                            throw new Error("Three.js must verify before loading helpers. Auto-running shortly...");
                        }
                        const injectThreeHelper = (name, url, checkFn) => {
                            if (checkFn()) return;
                            if (!document.querySelector(\`script[src="\${url}"]\`)) {
                                const s = document.createElement("script");
                                s.src = url;
                                s.async = true;
                                s.onload = () => {
                                    if (livePreview) setTimeout(() => executeCode(), 100);
                                };
                                document.head.appendChild(s);
                                pendingAutoRunRef.current = true;
                                throw new Error(\`Loading \${name}... Auto-running when ready.\`);
                            }
                            if (!checkFn()) {
                                pendingAutoRunRef.current = true;
                                throw new Error(\`Waiting for \${name} to initialize...\`);
                            }
                        };
                        if (path.includes("OrbitControls")) {
                            injectThreeHelper("OrbitControls", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", () => window.THREE && window.THREE.OrbitControls);
                            return { OrbitControls: window.THREE.OrbitControls };
                        }
                        if (path.includes("GLTFLoader")) {
                            injectThreeHelper("GLTFLoader", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js", () => window.THREE && window.THREE.GLTFLoader);
                            return { GLTFLoader: window.THREE.GLTFLoader };
                        }
                        if (path.includes("RGBELoader")) {
                            injectThreeHelper("RGBELoader", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js", () => window.THREE && window.THREE.RGBELoader);
                            return { RGBELoader: window.THREE.RGBELoader };
                        }
                        throw new Error(\`Unsupported Three example: \${path}. Supported: OrbitControls, GLTFLoader, RGBELoader.\`);
                    }
                    if (path.startsWith("./")) {
                        const base = path.replace("./", "");
                        const candidates = [
                            base,
                            \`\${base}.js\`,
                            \`\${base}.jsx\`,
                            \`\${base}.ts\`,
                            \`\${base}.tsx\`,
                            \`\${base}/index.js\`,
                            \`\${base}/index.jsx\`,
                            \`\${base}/index.ts\`,
                            \`\${base}/index.tsx\`
                        ];
                        const found = candidates.find((c) => window.__modules__ && window.__modules__[c]);
                        return found ? window.__modules__[found] : {};
                    }
                    throw new Error(\`Module '\${path}' not supported in this sandbox. Supported: \${Object.keys(DEPENDENCIES).join(", ")}\`);
                }
            };
            window.__modules__ = {};
            window.Prism = PrismRuntime;
            const stripExt = (name) => name.replace(/\\.(js|jsx|ts|tsx)$/, "");
            let bundle = "";
            const sortedFiles = Object.keys(files).sort((a, b) => {
                if (a === "App.js" && b !== "App.js") return 1;
                if (b === "App.js" && a !== "App.js") return -1;
                return a.localeCompare(b);
            });
            sortedFiles.forEach((f) => {
                let code = files[f];
                code = normalizeImports(code, f, allowlist);
                const cleanName = stripExt(f);
                const cacheKey = f + "::" + code;
                let transpiled;
                if (transpileCacheRef.current.has(cacheKey)) {
                    transpiled = transpileCacheRef.current.get(cacheKey);
                } else {
                    try {
                        const isTs = f.endsWith(".ts") || f.endsWith(".tsx");
                        const presets = isTs ? ["react", "env", "typescript"] : ["react", "env"];
                        transpiled = window.Babel.transform(code, { presets, filename: f }).code;
                        transpileCacheRef.current.set(cacheKey, transpiled);
                    } catch (e) {
                        console.error("Compilation Error (" + f + "):", e);
                        throw new Error("Compilation Error in " + f + ": " + e.message);
                    }
                }
                bundle += \`(function(){ var exports={}; var module={exports:exports}; \${transpiled}; window.__modules__['\${f}'] = module.exports; window['\${cleanName}'] = module.exports.default || module.exports; })();\`;
            });
            const safeEnv = Object.freeze({
                files: Object.freeze({ ...files }),
                devKey: propsDevKey,
                toolkit: { open: showWorkshopUI, mode },
                updateFiles: (nextOrFn) => setFiles((prev) => typeof nextOrFn === "function" ? nextOrFn(prev) : nextOrFn),
                saveProject: saveAsDefault
            });
            const finalScope = {
                ...scope,
                Prism: PrismRuntime,
                Editor: CodeEditorComp,
                ReactMarkdown: ReactMarkdownModule.default || ReactMarkdownModule,
                files,
                setFiles,
                saveAsDefault,
                render: (c) => rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c)),
                safeEnv
            };
            const errorHandler = (evt) => {
                setError(evt.message || "Runtime Error");
                return true;
            };
            const rejectionHandler = (evt) => {
                setError("Unhandled Promise Rejection: " + (evt.reason ? evt.reason.message || evt.reason : "Unknown"));
            };
            window.addEventListener("error", errorHandler);
            window.addEventListener("unhandledrejection", rejectionHandler);
            try {
                new Function(...Object.keys(finalScope), \`try { \${bundle} const T = (typeof App !== 'undefined' ? App : null); if(T) { try { render(React.createElement(T, {env: safeEnv})); } catch(e) { throw e; } } } catch(e){ throw e; }\`)(...Object.values(finalScope));
            } catch (e) {
                setError(e.message);
            } finally {
                window.removeEventListener("error", errorHandler);
                window.removeEventListener("unhandledrejection", rejectionHandler);
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
    }, [livePreview, runNow]);
    const openEditor = () => {
        prevLivePreviewRef.current = livePreview;
        setLivePreview(false);
        setIsEditorOpen(true);
    };
    const closeEditor = () => {
        setLivePreview(prevLivePreviewRef.current);
        setIsEditorOpen(false);
    };
    const generateProtocolSource = () => {
        const nl = "\\n";
        let engineSourceCode = AURELIAN_ENGINE_SOURCE;
        const imports = [
            "import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';",
            "import * as lucide from 'lucide-react';",
            "import * as framerMotion from 'framer-motion';",
            "import ReactDOM from 'react-dom/client';",
            "import * as reactDomLegacy from 'react-dom';",
            "import { clsx } from 'clsx';",
            "import { twMerge } from 'tailwind-merge';",
            "import * as firebaseApp from 'firebase/app';",
            "import * as firebaseAuth from 'firebase/auth';",
            "import * as firebaseFirestore from 'firebase/firestore';",
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
            "import * as ReactMarkdownModule from 'react-markdown';"
        ].join(nl);
        const esc = (s) => (s || "").replace(/\\\\/g, "\\\\\\\\").replace(/\`/g, "\\\\\`").replace(/\\\${/g, "\\\\\${");
        const sortedKeys = Object.keys(files).sort();
        let embeddedBlock = "
`;
function ArchitectWorkshop({ initialFiles, mode = "edit", locked = false, devKey: propsDevKey }) {
    const [files, setFiles] = useState(initialFiles || { "App.js": "" });
    const [activeFile, setActiveFile] = useState("App.js");
    const [error, setError] = useState(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [showWorkshopUI, setShowWorkshopUI] = useState(false);
    const [toastMsg, setToastMsg] = useState(null);
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "F8") {
                setShowWorkshopUI((prev) => !prev);
                if (locked) {
                    setToastMsg("Workshop View-Only (LOCKED).");
                    setTimeout(() => setToastMsg(null), 2e3);
                }
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode]);
    const [copyFeedback, setCopyFeedback] = useState(null);
    const [showGithubDialog, setShowGithubDialog] = useState(false);
    const [pushing, setPushing] = useState(false);
    const [githubConfig, setGithubConfig] = useState({
        repo: "Reflective-Mind/Template2",
        branch: "main",
        filePath: "src/engine.generated.jsx",
        commitMessage: "Update MindVara site"
    });
    const [babelReady, setBabelReady] = useState(false);
    const [livePreview, setLivePreview] = useState(true);
    const [needsRun, setNeedsRun] = useState(false);
    const safeEnv = useMemo(() => ({
        toolkit: { open: showWorkshopUI, mode },
        updateFiles: (cb) => {
            if (mode === 'edit') setFiles(prev => {
                const next = cb(prev);
                return next;
            });
        },
        saveProject: saveAsDefault,
        devKey: propsDevKey
    }), [showWorkshopUI, mode, propsDevKey]);
    const [threeReady, setThreeReady] = useState(typeof window !== "undefined" && !!window.THREE);
    const pendingAutoRunRef = useRef(false);
    const lastExecutedSigRef = useRef("");
    const prevLivePreviewRef = useRef(true);
    const previewRef = useRef(null);
    const rootInstance = useRef(null);
    const isMounted = useRef(false);
    const transpileCacheRef = useRef(/* @__PURE__ */ new Map());
    const contractTested = useRef(false);
    const h = React.createElement;
    useEffect(() => {
        if (initialFiles) {
            setFiles((prev) => {
                const next = { ...prev };
                let changed = false;
                Object.keys(initialFiles).forEach((f) => {
                    if (initialFiles[f] && initialFiles[f] !== prev[f]) {
                        console.log("[HMR] Updating " + f + " from source");
                        next[f] = initialFiles[f];
                        changed = true;
                    }
                });
                return changed ? next : prev;
            });
        }
    }, [initialFiles]);
    useEffect(() => {
        isMounted.current = true;
        if (typeof window !== "undefined") {
            window.__ensureAurelianFonts = () => {
                if (document.getElementById("aurelian-font-space-grotesk")) return;
                const link = document.createElement("link");
                link.id = "aurelian-font-space-grotesk";
                link.rel = "stylesheet";
                link.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700&display=swap";
                document.head.appendChild(link);
            };
            if (!document.querySelector('script[src*="tailwindcss"]')) {
                const tw = document.createElement("script");
                tw.src = "https://cdn.tailwindcss.com";
                tw.async = true;
                document.head.appendChild(tw);
            }
            if (!window.THREE && !document.querySelector('script[src*="three.min.js"]')) {
                const three = document.createElement("script");
                three.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
                three.async = true;
                three.onload = () => {
                    setThreeReady(true);
                    if (pendingAutoRunRef.current) {
                        pendingAutoRunRef.current = false;
                        setTimeout(() => executeCode(), 100);
                    }
                };
                document.head.appendChild(three);
            } else if (window.THREE && !threeReady) {
                setThreeReady(true);
            }
        }
        if (typeof window !== "undefined" && !window.Babel) {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/@babel/standalone/babel.min.js";
            script.async = true;
            script.onload = () => {
                if (isMounted.current) setBabelReady(true);
            };
            document.head.appendChild(script);
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
            if (livePreview && !isEditorOpen) {
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
    }, [babelReady, files, livePreview, isEditorOpen, showWorkshopUI, mode]);
    const normalizeImports = (source, filename, allowlist) => {
        if (filename.endsWith(".css") || filename.endsWith(".json")) return source;
        const isRewritable = (path) => {
            if (path.startsWith("./") || path.startsWith("../")) return false;
            if (["react", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"].includes(path)) return false;
            if (allowlist.includes(path)) return true;
            if (path === "three" || path.startsWith("three/examples/")) return true;
            return false;
        };
        let code = source;
        code = code.replace(/from\s*['"]\.\/([^ '"]+)\.js['"]/g, "from './$1'");
        const sub = (pattern, replacer) => {
            code = code.replace(pattern, replacer);
        };
        sub(/import\s+(\w+)\s*,\s*\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?/g, (m, defName, named, path) => {
            if (!isRewritable(path)) return m;
            const namedBody = named.split(",").map((s) => {
                const part = s.trim();
                if (part.includes(" as ")) {
                    const [imp, alias] = part.split(" as ").map((x) => x.trim());
                    return `${imp}: ${alias}`;
                }
                return part;
            }).join(", ");
            return `const ${defName} = require('${path}'); const { ${namedBody} } = require('${path}');`;
        });
        sub(/import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, (m, alias, path) => {
            if (!isRewritable(path)) return m;
            return `const ${alias} = require('${path}');`;
        });
        sub(/import\s+\{([\s\S]*?)\}\s+from\s+['"]([^'"]+)['"];?/g, (m, body, path) => {
            if (!isRewritable(path)) return m;
            const parts = body.split(",").map((s) => s.trim()).filter(Boolean);
            if (parts.length === 1 && parts[0].includes(" as ") && parts[0].split(" as ")[0].trim() === "default") {
                const alias = parts[0].split(" as ")[1].trim();
                return `const ${alias} = require('${path}');`;
            }
            const mapped = parts.map((s) => {
                if (s.includes(" as ")) {
                    const [imp, alias] = s.split(" as ").map((x) => x.trim());
                    return `${imp}: ${alias}`;
                }
                return s;
            }).join(", ");
            return `const { ${mapped} } = require('${path}');`;
        });
        sub(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g, (m, name, path) => {
            if (!isRewritable(path)) return m;
            return `const ${name} = require('${path}');`;
        });
        return code;
    };
    const executeCode = () => {
        if (!window.Babel || !isMounted.current) return;
        if (!previewRef.current) {
            pendingAutoRunRef.current = false;
            return;
        }
        setError(null);
        try {
            if (!rootInstance.current && previewRef.current) rootInstance.current = ReactDOM.createRoot(previewRef.current);
            const wrapFn = (fn, named = {}) => Object.assign((...args) => fn(...args), { default: fn, ...named });
            const wrapComp = (Comp, named = {}) => Object.assign((props) => React.createElement(Comp, props), { default: Comp, ...named });
            const clsxCompat = wrapFn(clsx, { clsx });
            const twMergeCompat = wrapFn(twMerge, { twMerge });
            const RMarkdown = ReactMarkdownModule.default || ReactMarkdownModule;
            const rMarkdownCompat = wrapComp(RMarkdown);
            const CodeEditorComp = ReactSimpleCodeEditor.default || ReactSimpleCodeEditor;
            const rEditorCompat = wrapComp(CodeEditorComp, { Editor: CodeEditorComp });
            const PrismRuntime = PrismJS.default || PrismJS;
            const prismCompat = { ...PrismRuntime, default: PrismRuntime };
            const DEPENDENCIES = {
                "react": React,
                "react-dom/client": ReactDOM,
                "framer-motion": framerMotion,
                "lucide-react": lucide,
                "clsx": clsxCompat,
                "tailwind-merge": twMergeCompat,
                "firebase/app": firebaseApp,
                "firebase/auth": firebaseAuth,
                "firebase/firestore": firebaseFirestore,
                "prismjs": prismCompat,
                "react-simple-code-editor": rEditorCompat,
                "react-markdown": rMarkdownCompat,
                "three": window.THREE,
                "react-dom": reactDomLegacy
                // Legacy for createPortal etc.
            };
            const allowlist = Object.keys(DEPENDENCIES);
            if (ENV.isLocal && !contractTested.current) {
                runEngineContractTests(normalizeImports, allowlist, ENV);
                contractTested.current = true;
            }
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
                useLayoutEffect,
                require: (path) => {
                    if (DEPENDENCIES[path]) return DEPENDENCIES[path];
                    if (path === "three") {
                        if (window.THREE) return window.THREE;
                        pendingAutoRunRef.current = true;
                        throw new Error("Three.js is still loading. It will auto-run when ready.");
                    }
                    if (path.startsWith("three/examples/")) {
                        if (!window.THREE) {
                            pendingAutoRunRef.current = true;
                            throw new Error("Three.js must verify before loading helpers. Auto-running shortly...");
                        }
                        const injectThreeHelper = (name, url, checkFn) => {
                            if (checkFn()) return;
                            if (!document.querySelector(`script[src="${url}"]`)) {
                                const s = document.createElement("script");
                                s.src = url;
                                s.async = true;
                                s.onload = () => {
                                    if (livePreview) setTimeout(() => executeCode(), 100);
                                };
                                document.head.appendChild(s);
                                pendingAutoRunRef.current = true;
                                throw new Error(`Loading ${name}... Auto-running when ready.`);
                            }
                            if (!checkFn()) {
                                pendingAutoRunRef.current = true;
                                throw new Error(`Waiting for ${name} to initialize...`);
                            }
                        };
                        if (path.includes("OrbitControls")) {
                            injectThreeHelper("OrbitControls", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js", () => window.THREE && window.THREE.OrbitControls);
                            return { OrbitControls: window.THREE.OrbitControls };
                        }
                        if (path.includes("GLTFLoader")) {
                            injectThreeHelper("GLTFLoader", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js", () => window.THREE && window.THREE.GLTFLoader);
                            return { GLTFLoader: window.THREE.GLTFLoader };
                        }
                        if (path.includes("RGBELoader")) {
                            injectThreeHelper("RGBELoader", "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/RGBELoader.js", () => window.THREE && window.THREE.RGBELoader);
                            return { RGBELoader: window.THREE.RGBELoader };
                        }
                        throw new Error(`Unsupported Three example: ${path}. Supported: OrbitControls, GLTFLoader, RGBELoader.`);
                    }
                    if (path.startsWith("./")) {
                        const base = path.replace("./", "");
                        const candidates = [
                            base,
                            `${base}.js`,
                            `${base}.jsx`,
                            `${base}.ts`,
                            `${base}.tsx`,
                            `${base}/index.js`,
                            `${base}/index.jsx`,
                            `${base}/index.ts`,
                            `${base}/index.tsx`
                        ];
                        const found = candidates.find((c) => window.__modules__ && window.__modules__[c]);
                        return found ? window.__modules__[found] : {};
                    }
                    throw new Error(`Module '${path}' not supported in this sandbox. Supported: ${Object.keys(DEPENDENCIES).join(", ")}`);
                }
            };
            window.__modules__ = {};
            window.Prism = PrismRuntime;
            const stripExt = (name) => name.replace(/\.(js|jsx|ts|tsx)$/, "");
            let bundle = "";
            const sortedFiles = Object.keys(files).sort((a, b) => {
                if (a === "App.js" && b !== "App.js") return 1;
                if (b === "App.js" && a !== "App.js") return -1;
                return a.localeCompare(b);
            });
            sortedFiles.forEach((f) => {
                let code = files[f];
                code = normalizeImports(code, f, allowlist);
                const cleanName = stripExt(f);
                const cacheKey = f + "::" + code;
                let transpiled;
                if (transpileCacheRef.current.has(cacheKey)) {
                    transpiled = transpileCacheRef.current.get(cacheKey);
                } else {
                    try {
                        const isTs = f.endsWith(".ts") || f.endsWith(".tsx");
                        const presets = isTs ? ["react", "env", "typescript"] : ["react", "env"];
                        transpiled = window.Babel.transform(code, { presets, filename: f }).code;
                        transpileCacheRef.current.set(cacheKey, transpiled);
                    } catch (e) {
                        console.error("Compilation Error (" + f + "):", e);
                        throw new Error("Compilation Error in " + f + ": " + e.message);
                    }
                }
                bundle += `(function(){ var exports={}; var module={exports:exports}; ${transpiled}; window.__modules__['${f}'] = module.exports; window['${cleanName}'] = module.exports.default || module.exports; })();`;
            });
            const safeEnv = Object.freeze({
                files: Object.freeze({ ...files }),
                devKey: propsDevKey,
                toolkit: { open: showWorkshopUI, mode },
                updateFiles: (nextOrFn) => setFiles((prev) => typeof nextOrFn === "function" ? nextOrFn(prev) : nextOrFn),
                saveProject: saveAsDefault
            });
            const finalScope = {
                ...scope,
                Prism: PrismRuntime,
                Editor: CodeEditorComp,
                ReactMarkdown: ReactMarkdownModule.default || ReactMarkdownModule,
                files,
                setFiles,
                saveAsDefault,
                render: (c) => rootInstance.current.render(h(React.Fragment, { key: Date.now() }, c)),
                safeEnv
            };
            const errorHandler = (evt) => {
                setError(evt.message || "Runtime Error");
                return true;
            };
            const rejectionHandler = (evt) => {
                setError("Unhandled Promise Rejection: " + (evt.reason ? evt.reason.message || evt.reason : "Unknown"));
            };
            window.addEventListener("error", errorHandler);
            window.addEventListener("unhandledrejection", rejectionHandler);
            try {
                new Function(...Object.keys(finalScope), `try { ${bundle} const T = (typeof App !== 'undefined' ? App : null); if(T) { try { render(React.createElement(T, {env: safeEnv})); } catch(e) { throw e; } } } catch(e){ throw e; }`)(...Object.values(finalScope));
            } catch (e) {
                setError(e.message);
            } finally {
                window.removeEventListener("error", errorHandler);
                window.removeEventListener("unhandledrejection", rejectionHandler);
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
    }, [livePreview, runNow]);
    const openEditor = () => {
        prevLivePreviewRef.current = livePreview;
        setLivePreview(false);
        setIsEditorOpen(true);
    };
    const closeEditor = () => {
        setLivePreview(prevLivePreviewRef.current);
        setIsEditorOpen(false);
    };
    const generateProtocolSource = () => {
        const nl = "\n";
        let engineSourceCode = AURELIAN_ENGINE_SOURCE;
        const imports = [
            "import React, { useState, useEffect, useRef, useMemo, useCallback, useContext, createContext, useReducer, useLayoutEffect } from 'react';",
            "import * as lucide from 'lucide-react';",
            "import * as framerMotion from 'framer-motion';",
            "import ReactDOM from 'react-dom/client';",
            "import * as reactDomLegacy from 'react-dom';",
            "import { clsx } from 'clsx';",
            "import { twMerge } from 'tailwind-merge';",
            "import * as firebaseApp from 'firebase/app';",
            "import * as firebaseAuth from 'firebase/auth';",
            "import * as firebaseFirestore from 'firebase/firestore';",
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
            "import * as ReactMarkdownModule from 'react-markdown';"
        ].join(nl);
        const esc = (s) => (s || "").replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\${/g, "\\${");
        const sortedKeys = Object.keys(files).sort();
        let embeddedBlock = "// --- EMBEDDED SOURCES ---" + nl;
        let initFilesProps = "";
        sortedKeys.forEach((key) => {
            let varName = "file_" + key.replace(/[^a-zA-Z0-9]/g, "_");
            if (key === "App.js") varName = "appJsSource";
            if (key === "Home.js") varName = "homeJsSource";
            if (key === "Brand.js") varName = "brandJsSource";
            let sourceCode = files[key] || "";
            if (/\.(js|jsx|ts|tsx)$/.test(key)) {
                let baseName = key.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_]/g, "");
                if (baseName && /^[a-z]/.test(baseName)) {
                    baseName = baseName.charAt(0).toUpperCase() + baseName.slice(1);
                }
                if (baseName) {
                    sourceCode = sourceCode.replace(/(export\s+default\s+function\s*)(?:[a-zA-Z0-9_$]+)?(\s*\()/, () => `export default function ${baseName}(`);
                }
            }
            embeddedBlock += `const ${varName} = \`${esc(sourceCode)}\`;` + nl;
            initFilesProps += `        "${key}": ${varName},` + nl;
        });
        const runEngineContractTestsString = [
            "const runEngineContractTests = (normalizerFn, allowlist, env) => {",
            "    if (!env.isLocal) return;",
            "    const testCases = [",
            "        { input: \"import * as THREE from 'three';\", expected: \"const THREE = require('three');\" },",
            "        { input: \"import React from 'react';\", expected: \"import React from 'react';\" },",
            "        { input: \"import React, { useEffect } from 'react';\", expected: \"import React, { useEffect } from 'react';\" },",
            "        { input: \"import ReactDOM from 'react-dom';\", expected: \"const ReactDOM = require('react-dom');\" },",
            "        { input: \"import { createPortal } from 'react-dom';\", expected: \"const { createPortal } = require('react-dom');\" },",
            "        { input: \"import X from 'some-unknown-pkg';\", expected: \"import X from 'some-unknown-pkg';\" },",
            "        { input: \"import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';\", expected: \"const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls.js');\" },",
            "        { input: \"import X from './localFile';\", expected: \"import X from './localFile';\" },",
            "        { input: \"import 'prismjs/components/prism-jsx';\", expected: \"import 'prismjs/components/prism-jsx';\" },",
            "        { input: \"import { clsx } from 'clsx';\", expected: \"const { clsx } = require('clsx');\" },",
            "        { input: \"import { A, B as C } from 'clsx';\", expected: \"const { A, B: C } = require('clsx');\" },",
            "        { input: \"import X, { A, B as C } from 'clsx';\", expected: \"const X = require('clsx'); const { A, B: C } = require('clsx');\" },",
            "        { input: \"import { default as X } from 'clsx';\", expected: \"const X = require('clsx');\" }",
            "    ];",
            "    let errors = [];",
            "    testCases.forEach(({ input, expected }, idx) => {",
            "        const result = normalizerFn(input, \"test.js\", allowlist).trim();",
            "        if (result !== expected.trim()) {",
            "            errors.push(\`Case \${idx} failed.\\nInput: \${input}\\nExpected: \${expected}\\nGot:      \${result}\`);",
            "        }",
            "        const round2 = normalizerFn(result, \"test.js\", allowlist).trim();",
            "        if (round2 !== result) {",
            "            errors.push(\`Case \${idx} Idempotence failed.\\nRound 1: \${result}\\nRound 2: \${round2}\`);",
            "        }",
            "    });",
            "    if (errors.length > 0) {",
            "        console.error(\"ENGINE CONTRACT FAILED\");",
            "        errors.forEach((e) => console.error(e));",
            "    } else {",
            "        console.log(\"Engine Contract: All tests passed.\");",
            "    }",
            "};"
        ].join(nl);

        const newFileContent = "/* eslint-disable */" + nl + imports + nl + nl + "// --- ENVIRONMENT CONSTANTS ---" + nl + "const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '';" + nl + "const host = typeof window !== 'undefined' ? window.location.hostname : '';" + nl + "const ENV = {" + nl + "    isLocal: typeof window !== 'undefined' && isLocalHost(host)," + nl + "    isProd: typeof window !== 'undefined' && !isLocalHost(host)" + nl + "};" + nl + "const DEV_KEY =" + nl + "    (typeof import.meta !== \\\"undefined\\\" && import.meta.env && (import.meta.env.VITE_DEV_KEY || import.meta.env.VITE_EDITOR_KEY)) ||" + nl + "    (typeof process !== \\\"undefined\\\" && process.env && (process.env.REACT_APP_DEV_KEY || process.env.REACT_APP_EDITOR_KEY)) ||" + nl + "    \\\"\\\"; // Optional passcode to unlock dev/edit mode in production" + nl + nl + "// --- ACCESS CONTROL HELPER ---" + nl + "function getAccessControl(runtimeKey) {\n    if (typeof window === 'undefined') return { devEnabled: false, editEnabled: false };\n    \n    // 1. Localhost: Always unlocked\n    if (ENV.isLocal) return { devEnabled: true, editEnabled: true };\n\n    const params = new URLSearchParams(window.location.search);\n    const providedKey = params.get('devKey');\n    const effectiveKey = runtimeKey || DEV_KEY;\n\n    // 2. Production: Must match secret key\n    if (!effectiveKey || providedKey !== effectiveKey) {\n        return { devEnabled: false, editEnabled: false };\n    }\n\n    // 3. Flags\n    const hasFlag = (key) => {\n        const v = params.get(key);\n        return v === '1' || v === 'true' || v === 'on';\n    };\n    const editFlag = hasFlag('edit');\n    const devFlag = hasFlag('dev') || editFlag;\n\n    return { devEnabled: devFlag, editEnabled: editFlag };\n}" + nl + nl + "// ----------------------------------------------------------------------" + nl + "// --- ENGINE CONTRACT (DO NOT REMOVE OR MODIFY WITHOUT ADJUSTING TESTS) ---" + nl + "// ----------------------------------------------------------------------" + nl + "// 1. MUST accept AI-generated React pages incorporating external libs." + nl + "// 2. Import Normalizer MUST be allowlist-based." + nl + "// 3. MUST preserve React, local ('./'), and side-effect imports." + nl + "// 4. MUST be Idempotent (normalize(normalize(x)) === normalize(x))." + nl + "// 5. If a package is NOT in the allowlist, it MUST be left as 'import ...'." + nl + "//    EXCEPTION: 'three' and 'three/examples/*' are explicitly allowed/rewritten." + nl + nl + runEngineContractTestsString + nl + nl + engineSourceCode + nl + nl + embeddedBlock + nl + "// --- ROOT ENTRY ---" + nl + "export default function RootApp({ devKey }) {" + nl + "    const initialFiles = {" + nl + initFilesProps + "    };" + nl + "    const { devEnabled, editEnabled } = getAccessControl(devKey || DEV_KEY);" + nl + "    return React.createElement(ArchitectWorkshop, { initialFiles, mode: editEnabled ? 'edit' : 'view', locked: !devEnabled, devKey: devKey || DEV_KEY });" + nl + "}";
        return newFileContent;
    };

    function saveAsDefault() {
        const content = generateProtocolSource();
        navigator.clipboard.writeText(content).then(() => {
            setCopyFeedback("save");
            setTimeout(() => setCopyFeedback(null), 2e3);
        }).catch((err) => setError("Clipboard failed: " + err));
    }

    const handlePushToGithub = async () => {
        setPushing(true);
        try {
            const content = generateProtocolSource();
            const res = await fetch('/api/pushToGithub', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repo: githubConfig.repo,
                    branch: githubConfig.branch,
                    filePath: githubConfig.filePath,
                    commitMessage: githubConfig.commitMessage,
                    fileContent: content
                })
            });
            const data = await res.json();
            if (data.ok) {
                setToastMsg("Pushed to GitHub successfully!");
                setShowGithubDialog(false);
            } else {
                setError("GitHub Push Failed: " + data.error);
            }
        } catch (e) {
            setError("Network Error: " + e.message);
        } finally {
            setPushing(false);
            setTimeout(() => setToastMsg(null), 3e3);
        }
    };
    const copyActiveCode = () => {
        navigator.clipboard.writeText(files[activeFile] || "").then(() => {
            setCopyFeedback("code");
            setTimeout(() => setCopyFeedback(null), 2e3);
        });
    };
    const { Code2, Save, Copy, Check, X, Plus, Trash2, Play, UploadCloud } = lucide;
    const { AnimatePresence, motion } = framerMotion;
    return h(
        "div",
        { className: "relative h-screen w-screen bg-[#020202] font-sans overflow-hidden text-white" },
        h("div", { ref: previewRef, className: "h-full w-full overflow-y-auto" }),
        error && h("div", { className: "fixed bottom-4 left-4 right-4 bg-red-900/90 text-white p-4 rounded-lg border border-red-500 z-[9999] font-mono text-xs whitespace-pre-wrap shadow-2xl" }, "RUNTIME ERROR: " + error),
        toastMsg && h("div", { className: "fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 z-[9000] font-mono text-xs shadow-xl animate-pulse" }, toastMsg),
        h(
            React.Fragment,
            null,
            h(AnimatePresence, null, showWorkshopUI && h(
                motion.div,
                { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, className: "fixed top-6 right-6 flex items-center gap-2 z-[500]" },
                mode === "edit" && h("button", { onClick: () => setLivePreview(!livePreview), className: `px-3 py-1.5 rounded-full text-xs font-bold transition-all ${!livePreview ? "bg-amber-500/20 text-amber-500 ring-1 ring-amber-500/50" : "bg-black/60 text-white"}` }, livePreview ? "Live" : "Paused"),
                !livePreview && mode === "edit" && h("button", { onClick: runNow, className: `p-3 rounded-full transition-all ${needsRun ? "bg-amber-500 text-black animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.5)]" : "bg-black/60 text-gray-400 hover:text-white"}` }, h(Play, { size: 16, fill: "currentColor" })),
                mode === "edit" && h(
                    React.Fragment,
                    null,
                    h("button", {
                        onClick: () => {
                            if (typeof window !== "undefined" && window.__AURELIAN_ADD_PAGE__) {
                                window.__AURELIAN_ADD_PAGE__();
                            } else {
                                setToastMsg("Add Page: App.js setup required.");
                                setTimeout(() => setToastMsg(null), 3e3);
                            }
                        },
                        className: "p-3 bg-black/60 rounded-full"
                    }, h(Plus, { size: 16 })),
                    h("button", { onClick: openEditor, className: "p-3 bg-black/60 rounded-full" }, h(Code2, { size: 16 })),
                    h("button", { onClick: copyActiveCode, className: "p-3 bg-black/60 rounded-full" }, copyFeedback === "code" ? h(Check, { size: 16 }) : h(Copy, { size: 16 })),
                    h("button", { onClick: saveAsDefault, className: "p-3 bg-black/60 rounded-full" }, copyFeedback === "save" ? h(Check, { size: 16 }) : h(Save, { size: 16 })),
                    h("button", { onClick: () => setShowGithubDialog(true), className: "p-3 bg-black/60 rounded-full" }, h(UploadCloud, { size: 16 }))
                ),
                locked && h("div", { className: "px-2 py-1 bg-white/5 rounded text-[10px] text-zinc-500 uppercase tracking-widest font-semibold" }, "LOCKED")
            )),
            h(AnimatePresence, null, showGithubDialog && h(
                motion.div,
                { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[700] bg-black/80 flex items-center justify-center p-4" },
                h("div", { className: "bg-[#111] border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4" },
                    h("h3", { className: "text-lg font-bold text-white flex items-center gap-2" }, h(UploadCloud, { size: 20 }), "Push to GitHub"),
                    h("div", { className: "space-y-3" },
                        h("div", null,
                            h("label", { className: "block text-xs text-gray-400 mb-1" }, "Repository (owner/repo)"),
                            h("input", {
                                value: githubConfig.repo,
                                onChange: e => setGithubConfig(p => ({ ...p, repo: e.target.value })),
                                placeholder: "username/repo",
                                className: "w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                            })
                        ),
                        h("div", null,
                            h("label", { className: "block text-xs text-gray-400 mb-1" }, "Branch"),
                            h("input", {
                                value: githubConfig.branch,
                                onChange: e => setGithubConfig(p => ({ ...p, branch: e.target.value })),
                                className: "w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                            })
                        ),
                        h("div", null,
                            h("label", { className: "block text-xs text-gray-400 mb-1" }, "File Path"),
                            h("input", {
                                value: githubConfig.filePath,
                                onChange: e => setGithubConfig(p => ({ ...p, filePath: e.target.value })),
                                className: "w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                            })
                        ),
                        h("div", null,
                            h("label", { className: "block text-xs text-gray-400 mb-1" }, "Commit Message"),
                            h("input", {
                                value: githubConfig.commitMessage,
                                onChange: e => setGithubConfig(p => ({ ...p, commitMessage: e.target.value })),
                                className: "w-full bg-black border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                            })
                        )
                    ),
                    h("div", { className: "flex justify-end gap-2 mt-4" },
                        h("button", { onClick: () => setShowGithubDialog(false), className: "px-4 py-2 text-sm text-gray-400 hover:text-white" }, "Cancel"),
                        h("button", {
                            onClick: handlePushToGithub,
                            disabled: pushing || !githubConfig.repo,
                            className: `px-4 py-2 text-sm bg-white text-black font-bold rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`
                        }, pushing ? "Pushing..." : "Push Now")
                    )
                )
            )),
            h(AnimatePresence, null, isEditorOpen && mode === "edit" && h(
                motion.div,
                { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, className: "fixed inset-0 z-[600] bg-black/80 flex items-center justify-center p-8 lg:p-20" },
                h(
                    motion.div,
                    { initial: { scale: 0.95 }, animate: { scale: 1 }, exit: { scale: 0.95 }, className: "w-full max-w-6xl h-full flex flex-col bg-[#080808] border border-white/5 rounded-xl overflow-hidden" },
                    h(
                        "div",
                        { className: "flex items-center justify-between p-4 bg-[#0a0a0a]" },
                        h("h3", {}, "Godlike Engine v3.0"),
                        h(
                            "div",
                            { className: "flex items-center gap-2" },
                            h("button", { onClick: runNow, className: "px-3 py-1.5 bg-amber-500/10 text-amber-500 rounded text-xs hover:bg-amber-500/20" }, "Run"),
                            h("button", { onClick: closeEditor }, h(X, { size: 20 }))
                        )
                    ),
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
                            h("textarea", {
                                value: files[activeFile] || "",
                                onChange: (e) => {
                                    const val = e.target.value;
                                    setFiles((prev) => ({ ...prev, [activeFile]: val }));
                                },
                                autoFocus: true,
                                spellCheck: false,
                                onPaste: () => {
                                },
                                className: "flex-1 bg-transparent p-4 font-mono text-xs text-gray-300 resize-none outline-none whitespace-pre overflow-auto leading-relaxed"
                            })
                        )
                    )
                )
            ))
        ),
        !livePreview && needsRun && h("div", { className: "fixed top-20 right-8 px-4 py-2 bg-black/80 text-amber-500 text-xs font-mono border border-amber-500/30 rounded-lg pointer-events-none z-[490]" }, "Preview paused — press Run")
    );
}

// --- EMBEDDED SOURCES ---
const brandJsSource = `import React from 'react';

export const BRAND_NAME = "MindVara";
export const BRAND_TAGLINE = "A place to think";

export function BrandMark(props) {
  return (
    <svg
      width={props.size || 24}
      height={props.size || 24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}
`;
const file_AddedPage_js = `import React from 'react';
export default function AddedPage() {
  return <div className="h-full w-full p-10 text-white bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Added Page</h1>
          <p className="text-zinc-500">Edit this file to build your page.</p>
      </div>
  </div>;
}`;
const appJsSource = `import { BRAND_NAME, BrandMark } from './Brand';
import AddedPage from './AddedPage';
import React, { useState, useEffect, useMemo } from 'react';
import * as lucide from 'lucide-react';

// --- PAGE REGISTRY ---
// --- PAGE REGISTRY ---
const INITIAL_PAGES_JSON = \`[
    {
        "id": "__home__",
        "name": "Home",
        "component": "Home",
        "layer": "__system__",
        "order": -1,
        "file": "Home.js"
    },
    {
        "id": "addedpage",
        "name": "Added Page",
        "component": "AddedPage",
        "layer": "Added Layer",
        "order": 0,
        "file": "AddedPage.js"
    }
]\`;
const INITIAL_LAYER_ORDER_JSON = \`[
    "Added Layer"
]\`;
const INITIAL_DEFAULT_PAGE_ID = "__home__";

const INITIAL_PAGES = JSON.parse(INITIAL_PAGES_JSON);
const INITIAL_LAYER_ORDER = JSON.parse(INITIAL_LAYER_ORDER_JSON);

export default function App({ env }) {
    const [activePage, setActivePage] = useState(INITIAL_DEFAULT_PAGE_ID);
    const [pages, setPages] = useState(INITIAL_PAGES);
    const [layerOrder, setLayerOrder] = useState(INITIAL_LAYER_ORDER);
    
    // Unified Dev Tools: Derived from Engine state
    const showDevTools = env && env.toolkit ? (env.toolkit.open && env.toolkit.mode === 'edit') : false;

    const layers = useMemo(() => {
        const map = {};
        for (const p of pages) {
            const layer = p.layer || "Personal";
            if (!map[layer]) map[layer] = [];
            map[layer].push(p);
        }
        return map;
    }, [pages]);

    const sortedLayerNames = useMemo(() => {
        const names = Object.keys(layers);
        const out = [];
        // Filter out __system__ completely from UI
        
        // add layerOrder entries that exist in layers
        for (const l of layerOrder || []) {
            if (l !== "__system__" && layers[l] && !out.includes(l)) out.push(l);
        }

        // add any remaining layers not in out
        for (const l of names) {
            if (l !== "__system__" && !out.includes(l)) out.push(l);
        }
        return out;
    }, [layers, layerOrder]);

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
    // Unified Hash Logic
    useEffect(() => {
        const onHashChange = () => {
             const h = window.location.hash;
             const id = h.replace('#', '') || INITIAL_DEFAULT_PAGE_ID;
             const exists = pages.some(p => p.id === id);
             const target = exists ? id : INITIAL_DEFAULT_PAGE_ID;
             
             if (!exists && h !== '') window.location.hash = '';

             setActivePage(current => current === target ? current : target);
        };
        
        onHashChange(); // Sync on mount/update
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, [pages]);

    const navigate = (id) => {
        if (id === INITIAL_DEFAULT_PAGE_ID) {
            window.location.hash = '';
            setActivePage(INITIAL_DEFAULT_PAGE_ID);
        } else {
            window.location.hash = id;
            setActivePage(id);
        }
    };
    
    // --- HELPERS ---
    const sanitizeLayerOrder = (pgs, order) => {
        const active = new Set(pgs.map(p => p.layer || "Personal"));
        // filter existing order to only active layers
        const result = (order || []).filter(l => l !== "__system__" && active.has(l));
        // If order is empty but we have active layers, fallback to the first active one
        if (result.length === 0 && active.size > 0) {
            const first = Array.from(active).find(l => l !== "__system__");
            if (first) result.push(first);
        }
        return result;
    };

    const getImportRemovalRegexes = (page) => {
        const escape = (s) => s.replace(/[.*+?^|{}()[\\]\\\\]/g, '\\\\$&');
        const patterns = [];
        // 1. Component based: ./Comp and ./Comp.js
        patterns.push(new RegExp(\`^\\\\s*import\\\\s+\${escape(page.component)}\\\\s+from\\\\s+['"]\\\\.\\\\/\${escape(page.component)}(?:\\\\.js)?['"];?\\\\s*\\\\r?\\\\n\`, 'gm'));
        // 2. File based import path (if different)
        if (page.file) {
             const base = page.file.replace(/\\.[^/.]+$/, "");
             if (base !== page.component) {
                 patterns.push(new RegExp(\`^\\\\s*import\\\\s+\${escape(page.component)}\\\\s+from\\\\s+['"]\\\\.\\\\/\${escape(base)}(?:\\\\.js)?['"];?\\\\s*\\\\r?\\\\n\`, 'gm'));
             }
        }
        return patterns;
    };
    
    // Self-heal stale layers in App.js source on load
    useEffect(() => {
        if (!env || !env.toolkit || env.toolkit.mode !== 'edit' || !env.files || !env.files['App.js']) return;
        const appSrc = env.files['App.js'];
        const pMatch = appSrc.match(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/);
        const lMatch = appSrc.match(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/);
        if (pMatch && lMatch) {
            try {
                 const pgs = JSON.parse(pMatch[1]);
                 const ord = JSON.parse(lMatch[1]);
                 const cleanOrd = sanitizeLayerOrder(pgs, ord);
                 if (JSON.stringify(ord) !== JSON.stringify(cleanOrd)) {
                     const newApp = appSrc.replace(lMatch[0], \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(cleanOrd, null, 4)}\\\`;\`);
                     env.updateFiles(prev => ({ ...prev, 'App.js': newApp }));
                 }
            } catch (e) { console.error("Self-heal failed", e); }
        }
    }, [env]);

    // --- MANIPULATION ---
    const updateRegistry = (newPages, newLayerOrder) => {
        if (!env) return;
        let app = env.files['App.js'];
        if (newPages) app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        
        if (newLayerOrder) {
             // Always sanitize before writing
             const effectivePages = newPages || pages; 
             const cleanOrder = sanitizeLayerOrder(effectivePages, newLayerOrder);
             app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(cleanOrder, null, 4)}\\\`;\`);
        }
        env.updateFiles(prev => ({ ...prev, 'App.js': app }));
    };

    const handleDeleteLayer = (layerName) => {
        if (layerName === '__system__') return alert("Cannot delete system layer.");
        if (!confirm(\`Delete layer "\${layerName}" and ALL its pages?\`)) return;
        
        // 1. Find all pages in this layer
        const pagesToDelete = pages.filter(p => p.layer === layerName);

        // Security check: Never delete a layer containing Home
        if (pagesToDelete.some(p => p.id === '__home__')) return alert("Cannot delete a layer containing the System Home page.");
        
        // 2. Remove imports for these pages
        let app = env.files['App.js'];
        
        pagesToDelete.forEach(page => {
             getImportRemovalRegexes(page).forEach(regex => {
                 app = app.replace(regex, '');
             });
        });

        // 3. Update Registry (remove pages, remove layer)
        // 3. Update Registry (remove pages, remove layer)
        const newPages = pages.filter(p => p.layer !== layerName);
        // Use sanitizer to determine robust order (prevents forcing "Personal" if invalid)
        // Ensure layerOrder is treated safely if undefined
        const newLayerOrder = sanitizeLayerOrder(newPages, (layerOrder || []).filter(l => l !== layerName));

        // 4. Update App.js JSON
        app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(newLayerOrder, null, 4)}\\\`;\`);

        // 5. Delete actual files
        // 6. Push update
        env.updateFiles(prev => {
             const next = { ...prev, 'App.js': app };
             pagesToDelete.forEach(p => {
                 const f = p.file || (p.component + ".js");
                 if (next[f]) delete next[f];
             });
             return next;
        });

        // 7. Go Home if active page was deleted
        if (pagesToDelete.some(p => p.id === activePage)) {
            navigate('__home__');
        }
    };

    const handleAddPage = () => {
        if (!env) return alert("Env not connected");
        const name = prompt("Page Name?");
        if (!name) return;
        
        let safeBase = name.trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (!safeBase) safeBase = "Page";
        // Enforce PascalCase
        safeBase = safeBase.charAt(0).toUpperCase() + safeBase.slice(1);
        if (/^[0-9]/.test(safeBase)) safeBase = "Page" + safeBase;
        
        // Single canonical base for both file and component to avoid mismatches
        const compName = safeBase;
        const filename = safeBase + ".js";

        // Generate unique Stable ID
        let baseId = safeBase.toLowerCase();
        let id = baseId;
        let counter = 2;
        while (pages.some(p => p.id === id)) {
            id = \`\${baseId}-\${counter}\`;
            counter++;
        }
        
        const layer = prompt("Layer? (e.g. Personal, Work, Tools)") || "Personal";

        if (env.files[filename]) return alert("File already exists");

        const code = \`import React from 'react';\\nexport default function \${compName}() {\\n  return <div className="h-full w-full p-10 text-white bg-[#0A0A0A] flex items-center justify-center">\\n      <div className="text-center">\\n          <h1 className="text-4xl font-bold mb-4">\${name}</h1>\\n          <p className="text-zinc-500">Edit this file to build your page.</p>\\n      </div>\\n  </div>;\\n}\`;
        
        let app = env.files['App.js'];
        if (!app.includes(\`import \${compName}\`)) app = \`import \${compName} from './\${compName}';\\n\` + app;
        
        const layerPages = pages.filter(p => p.layer === layer);
        const maxOrder = layerPages.length > 0 ? Math.max(...layerPages.map(p => p.order || 0)) : -1;
        
        // Add file: filename to registry
        const newPageObj = { id: id, name: name, component: compName, layer: layer, order: maxOrder + 1, file: filename };
        const newPages = [...pages, newPageObj];
        
        let newLayerOrder = null;
        if (!(layerOrder || []).includes(layer)) newLayerOrder = [...(layerOrder || []), layer];
        
        if (newPages) app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        if (newLayerOrder) app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(newLayerOrder, null, 4)}\\\`;\`);

        env.updateFiles(prev => ({ ...prev, [filename]: code, 'App.js': app }));
    };

    const handleDelete = (id, comp) => {
        if (!confirm("Delete?")) return;
        
        const page = pages.find(p => p.id === id);
        if (!page) return;

        if (id === '__home__' || page.layer === '__system__' || page.file === 'Home.js') {
            return alert("Cannot delete system page.");
        }
        
        // Use implicit filename if missing (legacy support) or explicit file
        const filename = page.file || (comp + ".js");
        
        let app = env.files['App.js'];
        
        // Escape regex helper to safely remove import line
        // Escape regex helper to safely remove import line
        getImportRemovalRegexes(page).forEach(regex => {
             app = app.replace(regex, '');
        });
        
        const newPages = pages.filter(p => p.id !== id);
        
        // Sanitize Layer Order (remove empty layers if not Personal)
        const newLayerOrder = sanitizeLayerOrder(newPages, layerOrder);
        
        app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);
        app = app.replace(/const INITIAL_LAYER_ORDER_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_LAYER_ORDER_JSON = \\\`\${JSON.stringify(newLayerOrder, null, 4)}\\\`;\`);
        
        env.updateFiles(prev => {
            const next = { ...prev, 'App.js': app };
            delete next[filename];
            return next;
        });

        if (activePage === id) {
             navigate(INITIAL_DEFAULT_PAGE_ID);
        }
    };
    
    const handleDuplicatePage = (page) => {
        if (!env) return;
        const baseName = page.name + " Copy";
        const name = prompt("New Page Name?", baseName);
        if (!name) return;

        let safeBase = name.trim().replace(/[^a-zA-Z0-9_]/g, '');
        if (!safeBase) safeBase = "Page";
        // Enforce PascalCase
        safeBase = safeBase.charAt(0).toUpperCase() + safeBase.slice(1);
        if (/^[0-9]/.test(safeBase)) safeBase = "Page" + safeBase;
        
        const compName = safeBase;
        const filename = safeBase + ".js";
        
        // ID Generation
        let baseId = safeBase.toLowerCase();
        let id = baseId;
        let counter = 2;
        while (pages.some(p => p.id === id)) {
             id = \`\${baseId}-\${counter}\`;
             counter++;
        }
        
        if (env.files[filename]) return alert("Target file already exists (duplicate name?)");
        
        // Source content
        const srcFile = page.file || (page.component + ".js");
        let srcCode = env.files[srcFile];
        if (!srcCode) return alert("Source file not found");
        
        // Replace component name in code
        // Simple regex replace for 'export default function OldName' -> 'export default function NewName'
        srcCode = srcCode.replace(new RegExp(\`export\\\\s+default\\\\s+function\\\\s+\${page.component}\`), \`export default function \${compName}\`);
        
        // Update App.js imports
        let app = env.files['App.js'];
        if (!app.includes(\`import \${compName}\`)) app = \`import \${compName} from './\${compName}';\\n\` + app;

        // Add to registry
        // Fix: Append to end of layer to avoid order collision
        const layerPages = pages.filter(p => p.layer === page.layer);
        const maxOrder = layerPages.length > 0 ? Math.max(...layerPages.map(p => p.order || 0)) : -1;

        const newPageObj = { id, name, component: compName, layer: page.layer, order: maxOrder + 1, file: filename };
        const newPages = [...pages, newPageObj];
        
        if (newPages) app = app.replace(/const INITIAL_PAGES_JSON = \`([\\s\\S]*?)\`;/, \`const INITIAL_PAGES_JSON = \\\`\${JSON.stringify(newPages, null, 4)}\\\`;\`);

        // Save
        env.updateFiles(prev => ({ ...prev, [filename]: srcCode, 'App.js': app }));
    };

    const moveLayer = (name, dir) => {
        if (name === '__system__') return;
        const safeOrder = layerOrder || [];
        if (!Array.isArray(safeOrder)) return;

        const idx = safeOrder.indexOf(name);
        if (idx === -1) return;
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= safeOrder.length) return;
        const newOrder = [...safeOrder];
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
        
        // Deterministic reorder: swap sequence and normalize ALL to 0..n-1
        const sequence = siblings.map(p => p.id);
        [sequence[selfIndex], sequence[targetIndex]] = [sequence[targetIndex], sequence[selfIndex]];
        
        const finalPages = pages.map(p => {
             if (p.layer === page.layer) {
                 const newIdx = sequence.indexOf(p.id);
                 if (newIdx !== -1) return { ...p, order: newIdx };
             }
             return p;
        });
        updateRegistry(finalPages, null);
    };

    const getModuleByFile = (fileName) => {
        if (!fileName || !window.__modules__) return null;
        const s = String(fileName);
        let cleanName = s.startsWith("./") ? s.slice(2) : s;
        while (cleanName.startsWith("/")) {
            cleanName = cleanName.slice(1);
        }
        const normalized = cleanName;
        if (window.__modules__[normalized]) return window.__modules__[normalized];
        const exts = ['', '.js', '.jsx', '.ts', '.tsx'];
        for (const ext of exts) {
            const k = normalized.endsWith(ext) ? normalized : normalized + ext;
            if (window.__modules__[k]) return window.__modules__[k];
        }
        return null;
    };

    const resolveComponent = (page) => {
        if (!page) return null;
        
        // 1. File based (Preferred)
        if (page.file && page.file !== 'App.js') {
            const m = getModuleByFile(page.file);
            if (m) return m.default || m;
        }
        
        // 2. Window global (Legacy)
        if (window[page.component]) return window[page.component];
        
        // 3. Search modules by name (Fallback)
        if (window.__modules__) {
             for (const m of Object.values(window.__modules__)) {
                 const exp = m && (m.default || m);
                 if (typeof exp === 'function' && exp.name === page.component) return exp;
             }
        }
        return null;
    };

    const resolveHome = () => {
         const homePage = pages.find(p => p.id === '__home__');
         const viaPage = resolveComponent(homePage);
         if (viaPage) return viaPage;
         
         // Hard Fallback to Home.js if registry/object invalid
         const m = getModuleByFile('Home.js');
         return m ? (m.default || m) : null;
    };

    // Bridge for Architect Workshop
    useEffect(() => {
        if (showDevTools) {
             window.__AURELIAN_ADD_PAGE__ = handleAddPage;
        } else {
             delete window.__AURELIAN_ADD_PAGE__;
        }
        return () => { delete window.__AURELIAN_ADD_PAGE__; };
    }, [showDevTools, handleAddPage]);

    const ActiveComponent = (() => {
        const page = pages.find(pg => pg.id === activePage);
        return resolveComponent(page) || resolveHome() || null;
    })();

    return (
        <div className="h-screen w-screen bg-[#020202] text-white font-sans flex flex-col overflow-hidden">
             <nav className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#050505] sticky top-0 z-50 shrink-0 select-none">
                 <div className="flex items-center gap-6">
                     <div onClick={() => navigate('__home__')} className="flex items-center gap-3 cursor-pointer group">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500/20 group-hover:scale-105 transition-all outline outline-1 outline-transparent group-hover:outline-amber-500/30"><BrandMark size={18} /></div>
                        <div><h1 className="text-sm font-bold text-gray-200 tracking-tight leading-none group-hover:text-white transition-colors">{BRAND_NAME}</h1></div>
                     </div>
                     <div className="h-4 w-px bg-white/10 mx-2"></div>
                     <div className="flex items-center gap-4">
                     {sortedLayerNames.map(layerName => {
                            const layerPages = (layers[layerName] || []).slice().sort((a,b) => (a.order||0) - (b.order||0));
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
                                         {showDevTools && (
                                            <div onClick={(e) => { e.stopPropagation(); handleDeleteLayer(layerName); }} className="px-4 py-1.5 border-b border-white/5 text-[10px] text-red-500 hover:bg-red-500/10 cursor-pointer flex items-center gap-2">
                                                <lucide.Trash2 size={10} />
                                                <span>DELETE LAYER</span>
                                            </div>
                                         )}
                                         {layerPages.map(p => (
                                             <button key={p.id} onClick={() => navigate(p.id)} className={\`text-left w-full px-4 py-2 text-xs font-medium transition-colors flex items-center justify-between \${activePage === p.id ? 'text-blue-400 bg-blue-500/10' : 'text-zinc-400 hover:text-white hover:bg-white/5'}\`}>
                                                 <span>{p.name}</span>
                                                 {showDevTools && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex flex-col -space-y-1">
                                                             <div onClick={(e) => {e.stopPropagation(); movePage(p.id, -1)}} className="hover:text-blue-400 cursor-pointer"><lucide.ChevronUp size={8}/></div>
                                                             <div onClick={(e) => {e.stopPropagation(); movePage(p.id, 1)}} className="hover:text-blue-400 cursor-pointer"><lucide.ChevronDown size={8}/></div>
                                                        </div>
                                                        <div onClick={(e) => {e.stopPropagation(); handleDelete(p.id, p.component)}} className="text-zinc-700 hover:text-red-500 p-1 rounded hover:bg-white/5">
                                                            <lucide.Trash2 size={10} />
                                                        </div>
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
                    {activePage !== '__home__' && (
                        <button onClick={() => {
                            const p = pages.find(pg => pg.id === activePage);
                            if (!p) return;
                            handleDuplicatePage(p);
                        }} className="p-1.5 bg-white/5 text-zinc-500 rounded hover:bg-zinc-800 hover:text-white transition-all" title="Duplicate Current Page"><lucide.Copy size={14}/></button>
                    )}
                    <button onClick={() => env.saveProject()} className="p-1.5 bg-amber-500/10 text-amber-600 rounded hover:bg-amber-500/20 transition-all" title="Save Protocol"><lucide.Save size={14}/></button>
                 </div>}
             </nav>
             <main className="flex-1 relative overflow-hidden bg-[#0A0A0A]">
                {ActiveComponent ? <ActiveComponent /> : <div className="flex h-full items-center justify-center text-zinc-600 font-mono text-sm">404: Component Not Found</div>}
             </main>
        </div>
    );
}
`;
const homeJsSource = `import { BRAND_NAME, BRAND_TAGLINE } from './Brand';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// --- Shaders ---

const vertexShader = \`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
\`;

const fragmentShader = \`
  uniform float iTime;
  uniform vec2 iResolution;
  varying vec2 vUv;

  // Simplex noise function
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  void main() {
    vec2 uv = vUv;
    // Slower, heavier movement for a "molten" feel
    float noise = snoise(uv * 1.2 + iTime * 0.08); 
    
    // Aurelian Palette (Gold, Deep Bronze, Void)
    vec3 color1 = vec3(0.02, 0.01, 0.00);      // Deep Brown/Black Void
    vec3 color2 = vec3(0.25, 0.15, 0.05);      // Dark Bronze/Oxidized Gold
    vec3 color3 = vec3(0.8, 0.5, 0.1);         // Molten Gold/Amber Glow
    
    float mixer = smoothstep(-0.8, 0.8, noise);
    vec3 finalColor = mix(color1, color2, mixer);
    
    // Add soft volumetric glow "blooms"
    float bloom = snoise(uv * 0.4 - iTime * 0.04);
    // Sharper bloom for metallic reflection look
    finalColor = mix(finalColor, color3, clamp(pow(bloom, 3.0) * 0.6, 0.0, 1.0));
    
    // Subtle grain
    float grain = fract(sin(dot(uv.xy ,vec2(12.9898,78.233))) * 43758.5453);
    finalColor += grain * 0.02;

    gl_FragColor = vec4(finalColor, 1.0);
  }
\`;

// --- Styles & Assets ---

// The SVG cursor encoded for CSS
const CURSOR_URL = \`url("data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='a' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23ffffff'/%3E%3Cstop offset='30%25' stop-color='%23fbbf24'/%3E%3Cstop offset='60%25' stop-color='%2378350f'/%3E%3Cstop offset='100%25' stop-color='%23000000'/%3E%3C/linearGradient%3E%3Cfilter id='b' x='-50%25' y='-50%25' width='200%25' height='200%25'%3E%3CfeDropShadow dx='1' dy='1' stdDeviation='1.5' flood-color='rgba(0,0,0,0.6)'/%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M3 1L18 13.5L12 14.5L16.5 22L13.5 23L9 15.5L3 21V1Z' fill='url(%23a)' stroke='rgba(255, 215, 0, 0.4)' stroke-width='1' filter='url(%23b)'/%3E%3C/svg%3E") 3 1, auto\`;

const NOISE_SVG = \`url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")\`;

export default function Home() {
  const mountRef = useRef(null);

  useEffect(() => {
    window.__ensureAurelianFonts?.();
    if (!mountRef.current) return;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    mountRef.current.appendChild(renderer.domElement);

    // --- Shader Material ---
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // --- Animation Loop ---
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      material.uniforms.iTime.value = performance.now() / 1000;
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Handling ---
    const handleResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // --- Cleanup ---
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden bg-[#050200] text-white"
      style={{ 
        cursor: CURSOR_URL,
        fontFamily: "'Space Grotesk', sans-serif" 
      }}
    >
      <style>{\`
        @keyframes textShimmer {
            0%, 100% { background-position: 0% 0%; }
            50% { background-position: 100% 100%; }
        }

        @keyframes textFloat {
            0%, 100% { transform: translateY(0px) rotate(0.001deg); }
            50% { transform: translateY(-15px) rotate(-0.001deg); }
        }

        .title-shader {
            font-size: clamp(4rem, 16vw, 14rem);
            font-weight: 700;
            line-height: 0.8;
            letter-spacing: -0.05em;
            text-transform: uppercase;
            text-align: center;
            background: linear-gradient(
                175deg, 
                #ffffff 0%, 
                #fcd34d 15%,
                #b45309 45%,
                #ffffff 50%,
                #451a03 55%,
                #fbbf24 85%,
                #000000 100%
            );
            background-size: 200% 200%;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: textShimmer 18s ease-in-out infinite, textFloat 12s ease-in-out infinite;
            filter: drop-shadow(0 20px 60px rgba(0, 0, 0, 1));
        }
      \`}</style>

      {/* Overlays */}
      <div 
        className="fixed inset-0 z-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(10, 5, 0, 0.4) 40%, rgba(0,0,0,1) 100%)' }}
      />
      <div 
        className="fixed inset-0 z-10 pointer-events-none opacity-[0.12] mix-blend-overlay"
        style={{ backgroundImage: NOISE_SVG }}
      />

      {/* Main Content */}
      <div className="relative z-20 w-full h-full flex flex-col justify-center items-center pointer-events-none">
        <h1 className="title-shader">
          {BRAND_NAME}
        </h1>
        <p className="text-zinc-500 font-mono mt-6 tracking-[0.5em] text-xs uppercase opacity-60">{BRAND_TAGLINE}</p>
      </div>

      {/* WebGL Canvas Container */}
      <div 
        ref={mountRef} 
        className="fixed top-0 left-0 z-0 w-full h-full"
      />
    </div>
  );
}`;

// --- ROOT ENTRY ---
export default function RootApp({ devKey }) {
    const initialFiles = {
        "Brand.js": brandJsSource,
        "AddedPage.js": file_AddedPage_js,
        "App.js": appJsSource,
        "Home.js": homeJsSource,
    };
    const { devEnabled, editEnabled } = getAccessControl(devKey);
    return React.createElement(ArchitectWorkshop, { initialFiles, mode: editEnabled ? 'edit' : 'view', locked: !devEnabled, devKey: devKey || DEV_KEY });
}