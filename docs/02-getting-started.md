# 2. Getting Started

This guide explains how to set up and run the PLC Code-First Editor project locally for development or testing.

## Prerequisites

*   **Node.js:** Version 18 or later recommended. (Check with `node -v`)
*   **npm** (usually included with Node.js) or **Bun:** The project uses Bun for faster dependency management and execution, but npm can also be used. (Check with `npm -v` or `bun --version`)
*   **Git:** For cloning the repository.
*   **(Optional) Supabase Account:** For authentication and cloud storage features. You can run the editor without it, but saving/loading files to the cloud will be disabled.

## Setup Instructions

1.  **Clone the Repository:**
    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual Git repo URL
    cd code-first-plc-editor
    ```

2.  **Install Dependencies:**
    *   **Using Bun (Recommended):**
        ```bash
        bun install
        ```
    *   **Using npm:**
        ```bash
        npm install
        ```

3.  **Configure Environment Variables (Optional - for Supabase):**
    *   If you want to use the Supabase integration for authentication and cloud storage:
        *   Create a Supabase project at [supabase.com](https://supabase.com/).
        *   Find your Project URL and Anon Key in your Supabase project settings (API section).
        *   Create a `.env` file in the root of the project directory (`code-first-plc-editor/.env`).
        *   Add the following lines to the `.env` file, replacing the placeholder values:
            ```env
            VITE_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
            VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
            ```
        *   **Important:** You will also need to configure the database schema in Supabase if it's not already set up. Refer to `src/integrations/supabase/types.ts` or specific setup scripts if available (check project root or `supabase/` directory).

4.  **Run the Development Server:**
    *   **Using Bun:**
        ```bash
        bun run dev
        ```
    *   **Using npm:**
        ```bash
        npm run dev
        ```

5.  **Access the Application:**
    *   Open your web browser and navigate to the URL provided by Vite (usually `http://localhost:8080` or a similar address shown in the terminal).

You should now see the PLC Code-First Editor running in your browser. If you haven't configured Supabase, you might be redirected to the `/auth` page or see limitations in file saving/loading features.

[Back to Table of Contents](./README.md)