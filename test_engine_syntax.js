import fs from 'fs';

try {
    const engineSource = fs.readFileSync('temp_engine_source.js', 'utf8');

    // In App.jsx: const ENGINE_SOURCE = "content";
    // new Function(..., 'return ' + ENGINE_SOURCE) -> 'return ' + "content"

    // So the body string becomes: return function ArchitectWorkshop...

    const body = 'return ' + engineSource;

    console.log("Testing new Function constructor with engineSource...");
    const fn = new Function('React', body);
    console.log("Function created successfully.");

} catch (e) {
    console.error("Test Failed:", e.message);
    // console.error(e.stack);
}
