import React, { useState, useEffect } from 'react';
import * as lucide from 'lucide-react';
import LandingPage from './LandingPage.js';

// --- PAGE REGISTRY (SIMULATED DB) ---
// This initial state serves as the fallback or seed.
// Real updates happen via source code modification in handleAddPage/handleDeletePage.
const INITIAL_PAGES = [
    { id: 'landing', name: 'Aurelian Landing', component: 'LandingPage', description: 'The default futuristic 3D showcase.' },
];

export default function App({ env }) {
    // --- ROUTER & STATE ---
    const [activePage, setActivePage] = useState('dashboard');
    const [pages, setPages] = useState(INITIAL_PAGES);

    // --- SYNC PAGES FROM SOURCE ---
    // If we passed an env with files, we can try to parse the TRUE state of INITIAL_PAGES from App.js content
    useEffect(() => {
        if (env && env.files && env.files['App.js']) {
            const appCode = env.files['App.js'];
            const match = appCode.match(/const INITIAL_PAGES = (\[[\s\S]*?\]);/);
            if (match && match[1]) {
                try {
                    // Safety: Evaluate array literal to get current pages
                    // eslint-disable-next-line
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

        // Initial check
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

        // 1. Create New Component File
        // IMPORTANT: We use \\n for actual newlines in the string, because this string is evaluated by the engine.
        // The Engine (executeCode) wraps code in string literals, so we need to be careful.
        // Actually, since we are passing a string to updateFiles, it's just a string in JS memory.
        // The issue was Babel parsing the *content* of that string if it had invalid sequences.

        const newComponentCode = `import React from 'react';
import * as lucide from 'lucide-react';
import { BackButton } from './App.js';

export default function ${componentName}() {
    return (
        <div className="min-h-screen bg-neutral-900 text-white p-8 flex flex-col items-center justify-center">
            <BackButton onClick={() => window.location.hash = ''} /> 
            <h1 className="text-4xl font-bold mb-4">${name}</h1>
            <p className="text-white/50">Start editing ${filename} to build this page.</p>
        </div>
    );
}`;

        // 2. Modify App.js to register this page
        let appCode = env.files['App.js'];

        // Add Import (Top of file)
        const importStmt = `import ${componentName} from './${filename}';\n`;
        if (!appCode.includes(importStmt)) {
            appCode = importStmt + appCode;
        }

        // Add to Registry
        const newPageEntry = `    { id: '${pageId}', name: '${name}', component: '${componentName}', description: 'A new custom page.' },`;
        appCode = appCode.replace(/const INITIAL_PAGES = \[\s*/, `const INITIAL_PAGES = [\n${newPageEntry}\n`);

        // Add to Render Logic (The switch case)
        // We actually need a dynamic renderer or a switch case injection.
        // For V2, let's inject a case into the Router logic if we are using explicit returns.
        // BUT, looking at the code below, we can use a Dynamic Component map if we import efficiently.
        // Since we are adding imports, let's try to make the Router generic below.

        // 3. Update Files Atomically
        env.updateFiles({
            ...env.files,
            [filename]: newComponentCode,
            'App.js': appCode
        });

        alert(`Page '${name}' created! Navigate to dashboard to see it.`);
    };

    const handleDeletePage = (pId, pComp) => {
        if (!env || !confirm("Delete this page and its file?")) return;

        const filename = pComp + ".js";
        let appCode = env.files['App.js'];

        // Remove Registry Entry (Naive regex, be careful)
        // Remove Registry Entry (Multiline safe)
        const lineRegex = new RegExp(`\\{\\s*id:\\s*'${pId}'[\\s\\S]*?\\},?`, 'g');
        appCode = appCode.replace(lineRegex, '');

        // Remove Import (Flexible)
        const importRegex = new RegExp(`import\\s+${pComp}\\s+from\\s+['"]\\.\\/${filename}['"];?\\n?`, 'g');
        appCode = appCode.replace(importRegex, '');

        const newFiles = { ...env.files, 'App.js': appCode };
        delete newFiles[filename];

        env.updateFiles(newFiles);
    };

    const handleSaveProject = () => {
        if (env && env.saveProject) env.saveProject();
    };

    // --- DYNAMIC ROUTER ---
    // We map page IDs to imported components. 
    // Since we are in the same scope, we need the imports to be available.
    // In our generated bundle, all imports at top of App.js are available in scope.
    // We need a map of { 'LandingPage': LandingPage, 'About': About } etc.
    // But `eval` or dynamic lookup by string name in this scope is tricky without a constructed map.

    // TRICK: We will construct the component map dynamically if possible, OR 
    // we use a big switch. 
    // BETTER TRICK: We use `eval(componentName)` inside the render? 
    // No, local variables (imports) aren't always available to eval in strict mode?
    // Actually, in the bundled 'new Function' scope, they are available if defined in the function body.

    const getComponent = (compName) => {
        try {
            // This relies on the import being present and named exactly this.
            // In the "Godlike Engine", top level imports inside the `executeCode` function body are accessible.
            return eval(compName);
        } catch (e) { return null; }
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
        return <div className="p-10 text-white">Page not found or component missing.</div>;
    }

    // --- DASHBOARD VIEW ---
    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans p-8 md:p-16">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-8">
                    <div>
                        <h1 className="text-3xl font-light tracking-wide mb-2">My Website Explorer</h1>
                        <p className="text-white/40 text-sm">Manage and launch your unique React pages.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={handleSaveProject} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-all shadow-lg flex items-center gap-2">
                            <lucide.Save size={14} /> Save Project
                        </button>
                        <div className="px-4 py-2 bg-amber-500/10 text-amber-500 text-xs tracking-widest rounded-full border border-amber-500/20">
                            V2.0 LIVE
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Page Cards */}
                    {pages.map(page => (
                        <div key={page.id} className="group relative bg-[#0A0A0A] border border-white/5 rounded-2xl overflow-hidden hover:border-amber-500/30 transition-all hover:shadow-2xl hover:shadow-amber-500/5">
                            <div className="h-40 bg-gradient-to-br from-neutral-900 to-black flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                                <lucide.LayoutTemplate className="text-white/20 group-hover:text-amber-500/50 transition-colors transform group-hover:scale-110 duration-500" size={48} />
                                {page.id !== 'landing' && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id, page.component); }} className="absolute top-2 right-2 p-2 bg-black/50 text-white/20 hover:text-rose-500 rounded-full transition-colors z-20" title="Delete Page">
                                        <lucide.Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-medium mb-1">{page.name}</h3>
                                <p className="text-white/30 text-xs leading-relaxed mb-6 h-10">{page.description}</p>
                                <button
                                    onClick={() => { navigate(page.id); window.location.hash = page.id; }}
                                    className="w-full py-3 bg-white text-black text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-amber-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <lucide.Play size={10} /> Launch Page
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* Add New Page */}
                    <button
                        onClick={handleAddPage}
                        className="group relative bg-transparent border border-dashed border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all flex flex-col items-center justify-center gap-4 h-[320px] text-white/20 hover:text-white/60"
                    >
                        <div className="p-4 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                            <lucide.Plus size={24} />
                        </div>
                        <span className="text-xs uppercase tracking-widest">Create New Page</span>
                    </button>
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
            className="fixed top-6 left-6 z-[99999] px-4 py-2 bg-black/50 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all group"
        >
            <lucide.ChevronLeft size={12} className="group-hover:-translate-x-1 transition-transform" />
            Dashboard
        </button>
    );
}
// Expose for usage in other isolated blocks
if (typeof window !== 'undefined') window.BackButton = BackButton;
