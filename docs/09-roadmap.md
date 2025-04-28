# 9. Roadmap

This document outlines potential future directions and features for the PLC Code-First Editor. This is not an exhaustive list and priorities may change.

## Short-Term Goals (Next Steps)

*   **Improve ST Parser:**
    *   Enhance robustness and error handling.
    *   Add support for parsing basic implementation statements (assignments, simple expressions).
    *   Handle comments more comprehensively (block comments `(*...*)`).
    *   Support `PROGRAM` and `FUNCTION` POU types.
    *   Parse method parameters correctly.
*   **Enhance PLCopen XML Export:**
    *   Represent ST implementation logic more accurately within the `<ST>` body, potentially using CDATA or structured formatting.
    *   Include support for exporting `PROGRAM` and `FUNCTION` POUs.
*   **Refine UI/UX:**
    *   Improve layout responsiveness.
    *   Enhance the file management interface.
    *   Add more context-aware actions in the editor.
*   **Basic Testing Framework:** Introduce unit tests for the parser and potentially integration tests for core features.

## Medium-Term Goals

*   **Code Intelligence:**
    *   Implement basic auto-completion for keywords, variables, and FB instances within the Monaco editor.
    *   Add "Go to Definition" functionality.
    *   Provide hover information (e.g., variable types).
*   **Improved Type System:**
    *   Introduce basic validation for standard IEC data types.
    *   Explore support for user-defined types (DUTs).
*   **Library Management:** Allow defining and referencing reusable Function Blocks or Functions across different files/snippets.
*   **Enhanced Visualization:**
    *   Explore graphical previews or representations of the code structure (e.g., call trees, dependency graphs).
*   **Collaboration Features:**
    *   Leverage Supabase Realtime for basic collaborative editing indicators (e.g., showing who else is viewing/editing a file).

## Long-Term Goals / Vision

*   **Codesys API Integration:**
    *   Connect directly to a Codesys runtime via its API.
    *   Enable downloading/uploading code to a live PLC.
    *   Support online monitoring and debugging features.
*   **Support for Other IEC Languages:**
    *   Explore adding support for Ladder Diagram (LD) or Function Block Diagram (FBD), potentially through graphical libraries or alternative editor views.
*   **Version Control Integration:** Integrate with Git for versioning PLC code snippets directly within the editor.
*   **Advanced Collaboration:** Implement full real-time collaborative editing.
*   **Plugin System:** Allow extending the editor's functionality through a plugin architecture.
*   **Testing & Simulation:** Integrate basic simulation capabilities or connections to external PLC simulation tools.

This roadmap provides a general direction. Contributions and feedback from the community are welcome to help shape the future of the project.

[Back to Table of Contents](./README.md)