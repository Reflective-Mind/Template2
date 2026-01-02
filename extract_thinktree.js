
import fs from 'fs';

try {
    const content = fs.readFileSync('src/App.jsx', 'utf8');
    const lines = content.split('\n');
    const targetLineIndex = lines.findIndex(l => l.trim().startsWith('"ThinkTree.js":'));

    if (targetLineIndex !== -1) {
        let rawLine = lines[targetLineIndex].trim();
        // Expected format: "ThinkTree.js": "CONTENT"
        // Remove key: "ThinkTree.js": "
        const prefix = '"ThinkTree.js": "';
        if (rawLine.startsWith(prefix)) {
            let inner = rawLine.substring(prefix.length);

            // Remove trailing suffix. It might be `"` or `",` or `"\r`
            // The line usually ends with `"` if it's the last property?
            // Check the next line to be sure.
            // But let's just find the LAST `"` 
            const lastQuote = inner.lastIndexOf('"');
            if (lastQuote !== -1) {
                inner = inner.substring(0, lastQuote);

                // Now inner is the escaped string content.
                // We need to unescape it.
                // JSON.parse will do it if we wrap it in quotes.
                // But we must be careful if inner already contains unescaped chars (shouldn't if valid JS file).
                const unescaped = JSON.parse('"' + inner + '"');

                fs.writeFileSync('src/ThinkTreeCode.js', unescaped);
                console.log('Successfully extracted ThinkTreeCode.js');
            } else {
                console.error('Could not find closing quote');
            }
        } else {
            console.error('Prefix mismatch');
        }
    } else {
        console.error('Target line not found');
    }
} catch (e) {
    console.error('Error:', e);
}
