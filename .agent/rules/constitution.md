# UNIVERSAL AI CODING CONSTITUTION (v1.0)

## I. CODE INTEGRITY (DO NOT BREAK)
- **ID & KEY PRESERVATION:** Never modify id, key, data-testid, or ef. These are permanent anchors.
- **NO DELETIONS:** Do not remove existing logic, comments, or exported functions unless explicitly told "REPLACE".
- **NO DUPLICATION:** Before creating a function, check if a similar utility exists in the codebase. Always prefer re-using existing logic over creating new variants.
- **DETERMINISM:** If you are unsure about a dependency, ASK before implementing. Do not guess file paths.

## II. EXECUTION PROTOCOL
1. **PRE-SCAN:** Look at the folder structure and relevant imports before editing.
2. **PLANNING:** For any change over 10 lines, state: "PLAN: [1-sentence goal]" before writing code.
3. **MODULARITY:** Prefer small, pure functions. Avoid "God Files" (files > 200 lines). If a file is getting too large, suggest a split.

## III. PRODUCTION STANDARDS
- **TYPESCRIPT:** No ny. Define interfaces for all new props/data.
- **ERROR HANDLING:** All async calls must be wrapped in 	ry/catch with a UI-friendly error state.
- **NAMING:** Use PascalCase for Components, camelCase for variables/functions, and UPPER_SNAKE_CASE for constants.

## IV. COMMUNICATION STYLE
- Be concise. Use technical shorthand.
- No "Sure, I can help." Just provide the architectural rationale and the code.
- If my request violates a project pattern, point it out immediately.
