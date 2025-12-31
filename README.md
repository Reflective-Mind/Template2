# Luxury Suite Template

A master template for creating new React + Vite + Tauri desktop applications with Tailwind CSS v4 and Babel runtime transpilation.

## Features

- ⚡ **Vite** - Fast build tool and dev server
- ⚛️ **React 19** - Latest React with modern features
- 🎨 **Tailwind CSS v4** - Utility-first CSS framework
- 🪟 **Tauri v2** - Build lightweight desktop apps
- 🔧 **Babel Standalone** - Runtime JSX transpilation
- 🎯 **Lucide React** - Beautiful icon library

## To Start a New Project

1. **Duplicate this folder** - Copy the entire template directory to your new project location
2. **Change name in package.json** - Update the `"name"` field to your project name
3. **Change productName/identifier in tauri.conf.json** - Update:
   - `productName` to your app's display name
   - `identifier` to your app's bundle identifier (e.g., `com.yourcompany.appname`)
4. **Run npm install** - Install all dependencies

## Development

```bash
# Start Vite dev server (web only)
npm run dev

# Start Tauri dev mode (desktop app)
npm run tauri:dev

# Build for production (web)
npm run build

# Build Tauri app
npm run tauri:build
```

## Project Structure

```
.
├── src/              # React source files
├── src-tauri/        # Tauri Rust backend
├── public/           # Static assets
├── index.html        # HTML entry point
├── vite.config.js    # Vite configuration
├── postcss.config.js # PostCSS/Tailwind config
└── package.json      # Dependencies and scripts
```

## Configuration Files

- **package.json** - Project metadata and dependencies
- **src-tauri/tauri.conf.json** - Tauri app configuration
- **postcss.config.js** - Tailwind CSS v4 PostCSS plugin
- **vite.config.js** - Vite build configuration
- **index.html** - Contains Babel standalone for runtime transpilation
