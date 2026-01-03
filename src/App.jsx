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
const DEV_KEY = ""; // Optional passcode to unlock dev/edit mode in production

// --- ACCESS CONTROL HELPER ---
function getAccessControl() {
    if (typeof window === 'undefined') return { devEnabled: false, editEnabled: false };
    
    // 1. Localhost: Always unlocked
    if (ENV.isLocal) return { devEnabled: true, editEnabled: true };

    // 2. Production with empty key: Open Access
    if (ENV.isProd && DEV_KEY === "") {
        return { devEnabled: true, editEnabled: true };
    }

    const params = new URLSearchParams(window.location.search);
    const providedKey = params.get('devKey');

    // 3. Production: Must match secret key
    if (!DEV_KEY || providedKey !== DEV_KEY) {
        return { devEnabled: false, editEnabled: false };
    }

    // 4. Flags
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
        { input: "import * as THREE from 'three';", expected: "const THREE = require('three');" },
        { input: "import React from 'react';", expected: "import React from 'react';" },
        { input: "import React, { useEffect } from 'react';", expected: "import React, { useEffect } from 'react';" },
        { input: "import ReactDOM from 'react-dom';", expected: "const ReactDOM = require('react-dom');" },
        { input: "import { createPortal } from 'react-dom';", expected: "const { createPortal } = require('react-dom');" },
        { input: "import X from 'some-unknown-pkg';", expected: "import X from 'some-unknown-pkg';" },
        { input: "import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';", expected: "const { OrbitControls } = require('three/examples/jsm/controls/OrbitControls.js');" },
        { input: "import X from './localFile';", expected: "import X from './localFile';" },
        { input: "import 'prismjs/components/prism-jsx';", expected: "import 'prismjs/components/prism-jsx';" },
        { input: "import { clsx } from 'clsx';", expected: "const { clsx } = require('clsx');" },
        { input: "import { A, B as C } from 'clsx';", expected: "const { A, B: C } = require('clsx');" },
        { input: "import X, { A, B as C } from 'clsx';", expected: "const X = require('clsx'); const { A, B: C } = require('clsx');" },
        { input: "import { default as X } from 'clsx';", expected: "const X = require('clsx');" }
    ];
    let errors = [];
    testCases.forEach(({ input, expected }, idx) => {
        const result = normalizerFn(input, "test.js", allowlist).trim();
        if (result !== expected.trim()) {
            errors.push(`Case ${idx} failed.\nInput: ${input}\nExpected: ${expected}\nGot:      ${result}`);
        }
        const round2 = normalizerFn(result, "test.js", allowlist).trim();
        if (round2 !== result) {
            errors.push(`Case ${idx} Idempotence failed.\nRound 1: ${result}\nRound 2: ${round2}`);
        }
    });
    if (errors.length > 0) {
        console.error("ENGINE CONTRACT FAILED");
        errors.forEach((e) => console.error(e));
    } else {
        console.log("Engine Contract: All tests passed.");
    }
};



// --- EMBEDDED SOURCES ---
const file_AddedPage_js = `import React from 'react';
export default function AddedPage() {
  return <div className="h-full w-full p-10 text-white bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Added Page</h1>
          <p className="text-zinc-500">Edit this file to build your page.</p>
      </div>
  </div>;
}`;
const file_AddedPage2_js = `import React from 'react';
export default function AddedPage2() {
  return <div className="h-full w-full p-10 text-white bg-[#0A0A0A] flex items-center justify-center">
      <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Added Page 2</h1>
          <p className="text-zinc-500">Edit this file to build your page.</p>
      </div>
  </div>;
}`;
const appJsSource = `import AddedPage2 from './AddedPage2';
import { BRAND_NAME, BrandMark } from './Brand';
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
    },
    {
        "id": "addedpage2",
        "name": "Added Page 2",
        "component": "AddedPage2",
        "layer": "Added Layer 2",
        "order": 0,
        "file": "AddedPage2.js"
    }
]\`;
const INITIAL_LAYER_ORDER_JSON = \`[
    "Added Layer",
    "Added Layer 2"
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
export default function RootApp() {
    const initialFiles = {
        "AddedPage.js": file_AddedPage_js,
        "AddedPage2.js": file_AddedPage2_js,
        "App.js": appJsSource,
        "Brand.js": brandJsSource,
        "Home.js": homeJsSource,
    };
    const { devEnabled, editEnabled } = getAccessControl();
    return React.createElement(ArchitectWorkshop, { initialFiles, mode: editEnabled ? 'edit' : 'view', locked: !devEnabled, devKey: DEV_KEY });
}