const ENGINE_SOURCE = "function ArchitectWorkshop({ initialFiles }) { return 'Suppose this is React element'; }";

try {
    const ArchitectWorkshop = new Function('ENGINE_SOURCE', 'return ' + ENGINE_SOURCE)(ENGINE_SOURCE);
    console.log("Type of ArchitectWorkshop:", typeof ArchitectWorkshop);
    console.log("Result:", ArchitectWorkshop({ initialFiles: {} }));
} catch (e) {
    console.error("Failed:", e);
}
