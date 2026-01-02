
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

try {
    const filePath = 'src/App.jsx';
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Add import
    if (!content.includes("import thinkTreeSource")) {
        // Try to insert after the last import block
        // Locate "import * as firebaseFirestore" which is line 10
        const importMarker = "import * as firebaseFirestore";
        const importIndex = content.indexOf(importMarker);

        if (importIndex !== -1) {
            const endOfLine = content.indexOf('\n', importIndex);
            // Insert after
            const insertion = "\nimport thinkTreeSource from './ThinkTreeCode.js?raw';";
            content = content.slice(0, endOfLine + 1) + "import thinkTreeSource from './ThinkTreeCode.js?raw';" + content.slice(endOfLine + 1);
        } else {
            // Fallback
            content = "import thinkTreeSource from './ThinkTreeCode.js?raw';\n" + content;
        }
    }

    // 2. Replace ThinkTree.js value
    const lines = content.split('\n');
    const targetIndex = lines.findIndex(l => l.trim().startsWith('"ThinkTree.js":'));

    if (targetIndex !== -1) {
        // Check indentation of original line
        const originalLine = lines[targetIndex];
        const indentation = originalLine.match(/^\s*/)[0];

        // Replace
        lines[targetIndex] = `${indentation}"ThinkTree.js": thinkTreeSource`;
        console.log("Replaced ThinkTree.js line.");
    } else {
        console.warn("Could not find ThinkTree.js line to replace.");
    }

    fs.writeFileSync(filePath, lines.join('\n'));
    console.log("Successfully updated App.jsx");

} catch (e) {
    console.error("Error updating App.jsx:", e);
}
