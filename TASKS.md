# Project Task List: PLC Code-First Editor

This document outlines the development tasks for the PLC Code-First Editor project. It is based on the roadmap defined in `docs/09-roadmap.md` and will be updated as progress is made and new tasks are identified.

## Current Focus

*   **Improve Structured Text Parser:** Enhance the parser's ability to understand and represent ST code structure and logic.

## Task Categories

### Parser Improvements

*   [x] Handle block comments (`(* ... *)`).
*   [x] Parse simple assignment statements (`variable := value;`).
*   [x] Enhance parsing of other statement types (Basic IF statement parsing implemented).
*   [x] Implement parsing for `PROGRAM` and `FUNCTION` POU types.
*   [x] Correctly parse method parameters.
*   [~] Add more robust error reporting with specific locations (line and column) - Added column info for nested POU errors.

### PLCopen XML Export

*   [x] Improve representation of parsed statements (especially assignments) within the `<ST>` body in a more compliant way (Implemented CDATA wrapping for assignments and basic IF structure).
*   [x] Add support for exporting `PROGRAM` and `FUNCTION` POUs.
*   [x] Explore options for representing other parsed ST constructs in XML (Implemented recursive ST string generation).

### User Interface (UI) / User Experience (UX)

*   [x] Update `CodeStructure` component to display parsed statements.
*   [x] Implement basic auto-completion in the Monaco editor.
*   [x] Add "Go to Definition" functionality (POU jump implemented; Variable jump implemented; Method/Property jumps still basic).
*   [x] Provide hover information for variables and functions.
*   [x] Refine the file management interface (loading, saving, deleting) - Implemented delete confirmation, sort indicators, toast notifications (via hook), and button loading states.
*   [x] Improve layout responsiveness for smaller screens (Implemented collapsible sidebar using Sheet).

### Backend / Persistence

*   [ ] Review and refine Supabase database schema and RLS policies.
*   [x] Implement functionality to delete saved code snippets.

### Testing

*   [x] Introduce unit tests for the `plcParser.ts` functions.
*   [~] Add integration tests for core features (saving, loading, export) - Added tests for file management hook (usePLCCode) with Supabase mocking.

### Documentation

*   [x] Update `CodeStructure` component to display Programs and Functions.
*   [ ] Keep documentation in the `docs/` directory updated with new features and changes.

## Completed Tasks

*   [x] Initial project analysis.
*   [x] Created initial project documentation in the `docs/` directory.
*   [x] Updated `src/types/plc.ts` to include statement types.
*   [x] Updated `src/utils/plcParser.ts` to handle block comments and parse simple assignments.
*   [x] Added basic parsing for IF statements in `src/utils/plcParser.ts`.
*   [x] Improved PLCopen XML generation for parsed statements (assignments and basic IFs) using CDATA sections.
*   [x] Implemented basic parsing for PROGRAM and FUNCTION POU types in `src/utils/plcParser.ts`.