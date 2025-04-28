# 8. Contributing

We welcome contributions to the PLC Code-First Editor project! Whether it's bug fixes, feature enhancements, documentation improvements, or reporting issues, your help is appreciated.

## How to Contribute

1.  **Reporting Issues:**
    *   If you encounter a bug, have a feature request, or want to suggest an improvement, please check the existing issues on the project's repository (e.g., GitHub Issues) first to see if a similar topic already exists.
    *   If not, create a new issue, providing as much detail as possible:
        *   **For Bugs:** Steps to reproduce, expected behavior, actual behavior, screenshots (if applicable), browser/OS information.
        *   **For Features:** A clear description of the proposed feature and its benefits.
2.  **Code Contributions:**
    *   **Fork the Repository:** Create your own fork of the main project repository.
    *   **Clone Your Fork:** Clone your forked repository to your local machine.
        ```bash
        git clone <your-fork-url>
        cd code-first-plc-editor
        ```
    *   **Create a Branch:** Create a new branch for your changes. Choose a descriptive name (e.g., `fix/parser-error`, `feature/add-ld-support`).
        ```bash
        git checkout -b <branch-name>
        ```
    *   **Make Changes:** Implement your bug fix or feature. Ensure your code adheres to the project's coding style (check ESLint configuration `eslint.config.js`) and conventions.
    *   **Test Your Changes:** Run the development server (`bun run dev` or `npm run dev`) and thoroughly test your modifications. Add unit or integration tests if applicable (currently, the project might lack a formal testing setup).
    *   **Lint Your Code:** Run the linter to check for style issues.
        ```bash
        bun run lint
        # or
        npm run lint
        ```
    *   **Commit Changes:** Commit your changes with a clear and concise commit message. Follow conventional commit message formats if the project uses them (e.g., `fix: Resolve issue with XML export encoding`).
        ```bash
        git add .
        git commit -m "feat: Add support for PROGRAM POU type parsing"
        ```
    *   **Push to Your Fork:** Push your changes to your forked repository.
        ```bash
        git push origin <branch-name>
        ```
    *   **Create a Pull Request (PR):** Go to the main project repository on the web platform (e.g., GitHub) and create a Pull Request from your branch to the main development branch (e.g., `main` or `develop`).
        *   Provide a clear title and description for your PR, explaining the changes and referencing any related issues (e.g., "Closes #123").
    *   **Code Review:** Project maintainers will review your PR. Be prepared to discuss your changes and make adjustments based on feedback.
    *   **Merging:** Once approved, your PR will be merged into the main codebase.

## Development Guidelines

*   **Coding Style:** Follow the existing coding style enforced by ESLint. Run the linter before committing.
*   **Dependencies:** Use Bun (`bun install`) or npm (`npm install`) for managing dependencies. Avoid committing lock files (`bun.lockb`, `package-lock.json`) unless specifically requested.
*   **Branching:** Use feature branches for your work. Keep branches focused on a single issue or feature.
*   **Documentation:** Update relevant documentation (in the `/docs` directory or code comments) if your changes affect usage, architecture, or features.

Thank you for considering contributing to the PLC Code-First Editor!

[Back to Table of Contents](./README.md)