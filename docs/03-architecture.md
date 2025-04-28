# 3. Architecture

This document provides an overview of the technical architecture of the PLC Code-First Editor.

## Frontend

The frontend is a single-page application (SPA) built using modern web technologies.

*   **Framework:** [React](https://react.dev/) (v18+) is used for building the user interface components.
*   **Build Tool:** [Vite](https://vitejs.dev/) provides a fast development server and optimized production builds. It uses the [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react) plugin for fast React compilation using SWC.
*   **Language:** [TypeScript](https://www.typescriptlang.org/) is used for static typing, improving code quality and maintainability.
*   **UI Components:** [shadcn/ui](https://ui.shadcn.com/) provides a collection of beautifully designed, accessible, and customizable UI components. It leverages:
    *   [Radix UI](https://www.radix-ui.com/) for unstyled, accessible primitive components.
    *   [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
*   **Routing:** [React Router DOM](https://reactrouter.com/) (v6+) handles client-side routing within the SPA.
*   **State Management:** [Zustand](https://github.com/pmndrs/zustand) is used for simple, scalable global state management (e.g., authentication status). Component-level state is managed using React's built-in `useState` and `useReducer` hooks.
*   **Data Fetching/Caching:** [TanStack Query (React Query)](https://tanstack.com/query/latest) manages asynchronous operations like fetching and updating PLC code snippets from the backend, providing caching, background updates, and request deduplication.
*   **Code Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (the core editor powering VS Code) is embedded to provide a rich text editing experience with features like syntax highlighting.

## Backend / Persistence

The application utilizes [Supabase](https://supabase.com/) as a backend-as-a-service (BaaS) platform.

*   **Authentication:** Supabase Auth handles user registration, login, and session management.
*   **Database:** Supabase Postgres is used to store user data and saved PLC code snippets. The interaction is managed via the Supabase client library (`@supabase/supabase-js`) and abstracted within the `usePLCCode` hook using TanStack Query.
*   **Realtime (Potential):** Supabase offers realtime capabilities, which could be leveraged in the future for collaborative features.

## Core PLC Functionality

*   **Syntax Highlighting:** Custom language configuration and theme are defined for Monaco Editor in `src/utils/plcSyntaxHighlighting.ts` to support structured text (`plcStructuredText` language ID).
*   **Parsing:** A custom parser implemented in `src/utils/plcParser.ts` uses regular expressions to analyze the structured text code. It identifies key structural elements (Function Blocks, Methods, Properties, Variables) and reports basic syntax errors. This parser generates an Abstract Syntax Tree (AST)-like structure (`ParserResult`).
*   **PLCopen XML Export:** The `generatePLCopenXML` function in `src/utils/plcParser.ts` converts the `ParserResult` into a PLCopen XML (TC6_0201) formatted string. While the interface definition is structured correctly, the implementation body is currently a simple text representation.

## Project Structure Overview

```
code-first-plc-editor/
├── public/             # Static assets (favicon, etc.)
├── src/
│   ├── components/     # React components (UI, Editor specific)
│   ├── hooks/          # Custom React hooks (e.g., usePLCCode)
│   ├── integrations/   # Integration with external services (e.g., Supabase)
│   ├── lib/            # Shared utility functions (e.g., cn from shadcn)
│   ├── pages/          # Top-level route components
│   ├── stores/         # Zustand state stores (e.g., auth)
│   ├── styles/         # CSS files
│   ├── types/          # TypeScript type definitions (global, plc)
│   ├── utils/          # Core utilities (plcParser, plcSyntaxHighlighting)
│   ├── App.tsx         # Main application component (routing, providers)
│   ├── main.tsx        # Application entry point
│   └── index.css       # Global styles (Tailwind base)
├── docs/               # Project documentation (Markdown files)
├── supabase/           # Supabase configuration/migrations (if used)
├── .env.example        # Example environment variables
├── .eslintrc.js        # ESLint configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── vite.config.ts      # Vite build configuration
```

[Back to Table of Contents](./README.md)