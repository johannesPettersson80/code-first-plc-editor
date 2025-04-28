# 7. Backend Integration (Supabase)

The PLC Code-First Editor utilizes [Supabase](https://supabase.com/) as its backend-as-a-service (BaaS) provider to handle user authentication and cloud persistence for PLC code snippets.

## Components

*   **Supabase Client:** The official `@supabase/supabase-js` library is used in the frontend to interact with the Supabase backend. The client is initialized in `src/integrations/supabase/client.ts` using environment variables.
*   **Environment Variables:**
    *   `VITE_SUPABASE_URL`: The unique URL for your Supabase project.
    *   `VITE_SUPABASE_ANON_KEY`: The public anonymous key for your Supabase project.
    These variables must be configured in a `.env` file at the project root for the integration to work (see [Getting Started](./02-getting-started.md)).
*   **Authentication:**
    *   Supabase Auth is used for user registration and login (currently seems configured for email/password).
    *   The `src/components/AuthProvider.tsx` component likely manages the application's authentication state, interacting with Supabase Auth functions (`signInWithPassword`, `signUp`, `signOut`, `onAuthStateChange`).
    *   The global authentication state (e.g., current user) is managed using a Zustand store (`src/stores/auth.ts`) which is updated by the `AuthProvider`.
    *   UI components related to authentication are likely found in `src/pages/Auth.tsx`.
*   **Database:**
    *   Supabase's underlying Postgres database is used to store user-specific PLC code snippets.
    *   A specific table (e.g., `plc_codes`) is expected in the database schema, likely containing columns for `id`, `user_id`, `title`, `code`, `created_at`, `updated_at`. (The exact schema should be confirmed by checking Supabase project settings or migration files if available).
    *   The custom hook `src/hooks/usePLCCode.ts` encapsulates the logic for interacting with this database table.
    *   [TanStack Query (React Query)](https://tanstack.com/query/latest) is used within `usePLCCode` to manage fetching (`plcCodes` query) and mutations (`savePLCCode`, `updatePLCCode`) for creating and updating code snippets. This provides caching, loading states, and error handling.

## Workflow

1.  **Initialization:** The Supabase client is initialized when the application loads.
2.  **Authentication:** The `AuthProvider` checks the user's authentication status with Supabase. Users are redirected to the `/auth` page if not logged in. Upon successful login/registration, the user session is established, and the user information is stored in the Zustand `authStore`.
3.  **Data Fetching:** When the `PLCEditor` component mounts (or when the user logs in), the `usePLCCode` hook fetches the list of saved PLC code snippets for the authenticated user from the Supabase database using TanStack Query.
4.  **Saving/Updating:** When the user saves (manually or via auto-save), the `usePLCCode` hook triggers a mutation via TanStack Query. This mutation calls the appropriate Supabase client function (`insert` or `update`) to persist the code snippet (title and content) to the database, associated with the current `user_id`.
5.  **Loading:** When the user selects a file to load from the file manager component (likely part of `EditorToolbar`), the corresponding code content is retrieved from the cached data managed by TanStack Query (fetched in step 3) and loaded into the Monaco editor state.

## Setup Considerations

*   A Supabase project needs to be created.
*   The correct environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) must be set.
*   The necessary database table (e.g., `plc_codes`) must exist in the Supabase Postgres database with appropriate columns and Row Level Security (RLS) policies configured. RLS policies are crucial to ensure users can only access and modify their own data. Typically, policies would check if the `auth.uid()` matches the `user_id` column in the table.

[Back to Table of Contents](./README.md)