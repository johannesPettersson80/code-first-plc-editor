# 5. PLC Language Support (Structured Text)

The editor currently focuses on supporting a subset of the IEC 61131-3 Structured Text (ST) language, primarily for defining Function Blocks (FBs). The syntax highlighting and parser (`src/utils/plcParser.ts`) are designed to recognize the following constructs:

## Supported Constructs

*   **Function Block Declaration:**
    ```iecst
    FUNCTION_BLOCK MyFunctionBlock
        // Variable declarations
        // Method/Property declarations
        // Implementation (currently not parsed in detail)
    END_FUNCTION_BLOCK
    ```
*   **Variable Declaration Sections:**
    *   `VAR ... END_VAR`: Local variables within the FB.
    *   `VAR_INPUT ... END_VAR`: Input variables.
    *   `VAR_OUTPUT ... END_VAR`: Output variables.
    *   `VAR_IN_OUT ... END_VAR`: Input/Output variables.
    *   `VAR_TEMP ... END_VAR`: Temporary variables (primarily within Methods).
*   **Variable Declarations:**
    ```iecst
    VariableName : DataType; // Basic declaration
    AnotherVar : INT := 10; // Declaration with initial value
    YetAnother : BOOL; // Comment associated with variable
    ```
    *   The parser extracts the variable name, data type, initial value (if present), and comment (if present on the same line).
    *   Data types are treated as strings (e.g., `BOOL`, `INT`, `STRING`, custom types) and are not validated against a predefined list.
*   **Method Declaration:**
    ```iecst
    METHOD MyMethod : ReturnType
        VAR_TEMP
            tempVar : INT;
        END_VAR

        // Implementation code (treated as a block)
    END_METHOD
    ```
    *   Parses method name and return type.
    *   Recognizes `VAR_TEMP` sections for local method variables.
    *   The implementation code between the declaration/`VAR` sections and `END_METHOD` is captured as a single string block but not parsed internally.
    *   *Note: Method parameters are currently NOT explicitly parsed by the main loop but might be handled by specific regex if included directly in the METHOD line (needs verification against `plcParser.ts` logic).*
*   **Property Declaration:**
    ```iecst
    PROPERTY MyProperty : DataType
        // Getter/Setter implementation (treated as a block)
    END_PROPERTY
    ```
    *   Parses property name and data type.
    *   Recognizes `GET` and `SET` keywords within the property block to determine if it has a getter or setter.
    *   The implementation code is captured as a single string block.
*   **Comments:**
    *   Single-line comments starting with `//` are partially supported, primarily when associated with variable declarations on the same line. Full block comments (`(* ... *)`) might not be fully handled by the current regex-based parser.

## Limitations & Current Scope

*   **Implementation Parsing:** The parser primarily focuses on the *declarative* parts of the ST code (FB structure, variables, method/property signatures). The actual implementation logic within methods, properties, or the main FB body is **not** parsed or validated in detail. It's treated largely as opaque blocks of text.
*   **Complex Expressions/Statements:** The parser does not understand complex ST expressions, control flow statements (IF, CASE, FOR, WHILE), function calls, or assignments within the implementation blocks.
*   **Data Type Validation:** Data types are not validated against the IEC standard or user-defined types.
*   **Library/Namespace Support:** No support for libraries, namespaces, or `USES` clauses.
*   **Error Checking:** Error checking is basic and mainly catches structural issues like unclosed blocks or malformed declarations based on the regex patterns. It does not perform semantic analysis.
*   **Other POUs:** Currently only `FUNCTION_BLOCK` is explicitly parsed. `PROGRAM` or `FUNCTION` POUs are not specifically handled.

The current language support is sufficient for defining the structure of Function Blocks and their interfaces, which enables the core editing and PLCopen XML export features for the POU structure. Deeper parsing and validation of implementation logic are potential areas for future improvement.

[Back to Table of Contents](./README.md)