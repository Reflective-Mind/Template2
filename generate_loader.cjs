const fs = require('fs');

const engineSource = fs.readFileSync('temp_engine_source.js', 'utf8');

const appSource = fs.readFileSync('temp_app_source.js', 'utf8');
const landingSource = fs.readFileSync('temp_landing_page.js', 'utf8');
const hudSource = fs.readFileSync('temp_hud_overlay.js', 'utf8');
const goldSource = fs.readFileSync('temp_gold_entity.js', 'utf8');

function escapeSource(source) {
  return source
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

const fileContent = `/* eslint-disable */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as lucide from 'lucide-react';
import * as framerMotion from 'framer-motion';
import ReactDOM from 'react-dom/client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as firebaseApp from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import * as firebaseFirestore from 'firebase/firestore';

const ENV = { 
  isLocal: typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'), 
  isProd: typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
};

// --- GODLIKE ENGINE SOURCE ---
const ENGINE_SOURCE = ${JSON.stringify(engineSource)};

// --- HYDRATE ENGINE ---
let ArchitectWorkshop;
try {
  ArchitectWorkshop = new Function('React', 'useState', 'useEffect', 'useRef', 'useMemo', 'useCallback', 'framerMotion', 'lucide', 'clsx', 'twMerge', 'ReactDOM', 'firebaseApp', 'firebaseAuth', 'firebaseFirestore', 'ENGINE_SOURCE', 'return ' + ENGINE_SOURCE)(React, useState, useEffect, useRef, useMemo, useCallback, framerMotion, lucide, clsx, twMerge, ReactDOM, firebaseApp, firebaseAuth, firebaseFirestore, ENGINE_SOURCE);
} catch (e) {

  console.error("Hydration Failed:", e);
  ArchitectWorkshop = function ErrorFallback() {
      return React.createElement('div', { className: "p-8 text-red-500 bg-black h-screen w-screen overflow-auto font-mono whitespace-pre" },
        React.createElement('h1', { className: "text-2xl font-bold mb-4" }, "FATAL ENGINE ERROR"),
        React.createElement('div', null, e.message),
        React.createElement('div', { className: "mt-4 opacity-50 text-xs" }, e.stack)
      );
  };
}

// --- ROOT ENTRY ---
export default function RootApp() {
  const initialFiles = {
    "App.js": \`${escapeSource(appSource).replace(/\$/g, '$')}\`,
    "LandingPage.js": \`${escapeSource(landingSource).replace(/\$/g, '$')}\`,
    "HUDOverlay.js": \`${escapeSource(hudSource).replace(/\$/g, '$')}\`,
    "GoldEntity.js": \`${escapeSource(goldSource).replace(/\$/g, '$')}\`
  };
  return React.createElement(ArchitectWorkshop, { initialFiles, mode: ENV.isLocal ? 'edit' : 'view', engineSource: ENGINE_SOURCE });
}
`;

fs.writeFileSync('src/App.jsx', fileContent);
console.log('Generated src/App.jsx');
