# 4. Features

The PLC Code-First Editor provides the following core features:

## Core Editor

*   **Monaco Editor Integration:** Leverages the powerful Monaco Editor for a familiar and feature-rich coding experience.
*   **Structured Text Syntax Highlighting:** Custom syntax highlighting tailored for IEC 61131-3 Structured Text (ST) enhances code readability.
*   **Real-time Parsing & Error Checking:** The editor continuously parses the ST code as you type, identifying basic structural elements and syntax errors.
*   **Code Structure View:** A dedicated panel displays the parsed structure of the code (Function Blocks, Methods, Properties, Variables), allowing for quick navigation within the file. Clicking an element in the structure view jumps to its definition in the editor.
*   **Error List:** Parsing errors are listed below the editor, and clicking an error navigates to the corresponding line.
*   **Basic Editor Functionality:** Includes standard features like line numbers, code folding, word wrap, find/replace, and automatic layout.
*   **Dark/Light Mode:** Supports toggling between dark and light themes for user preference.

## File Management & Persistence

*   **Cloud Storage (Supabase):** Authenticated users can save their PLC code snippets to the cloud (Supabase database).
*   **File Loading:** Users can load their previously saved code snippets from the cloud.
*   **Auto-Save:** An optional auto-save feature automatically saves changes to the cloud after a short period of inactivity (configurable delay).
*   **Manual Save:** Users can manually save the current code using a button or the `Ctrl+S` / `Cmd+S` keyboard shortcut.
*   **Unsaved Changes Prompt:** Prevents accidental data loss by prompting the user to save or discard changes before opening a new file or loading another existing file (if auto-save is disabled).
*   **Local Storage Persistence:** The currently edited code is saved to the browser's local storage for session persistence, allowing users to refresh the page without losing their work (within the same browser session).
*   **File Naming:** Users can assign a title to their saved code snippets.

## PLC Specific Features

*   **PLCopen XML Export:** Allows exporting the current code structure (POU interface and basic implementation) into a PLCopen XML (TC6_0201) file format. See [PLCopen XML Export](./06-xml-export.md) for details.
*   **Code Snippets/Templates:** A toolbar provides quick access to insert common ST code templates (e.g., FUNCTION_BLOCK structure, IF statements) into the editor.

## User Experience

*   **Authentication:** Secure user authentication is handled via Supabase Auth (Email/Password, potentially others).
*   **Responsive Layout:** The UI adapts reasonably well to different screen sizes, although primarily designed for desktop use.
*   **Keyboard Shortcuts:** Common shortcuts like `Ctrl+S` for saving are implemented. A help dialog displays available shortcuts.
*   **Editor Tour:** An optional guided tour introduces new users to the main features of the editor interface.
*   **Toasts/Notifications:** Provides feedback to the user for actions like saving, loading, or errors using toast notifications.

[Back to Table of Contents](./README.md)