import { PLCFunctionBlock, PLCMethod, PLCProperty, PLCVariable, ParseError, ParserResult, PLCAssignmentStatement, PLCStatement, PLCIfStatement, PLCProgram, PLCFunction } from "../types/plc";

export function parsePLCCode(code: string): ParserResult {
  const lines = code.split('\n');
  const result: ParserResult = {
    functionBlocks: [],
    programs: [], // Initialize programs array
    functions: [], // Initialize functions array
    errors: []
  };

  // Track current parsing state
  let currentFunctionBlock: PLCFunctionBlock | null = null;
  let currentProgram: PLCProgram | null = null; // Track current program
  let currentFunction: PLCFunction | null = null; // Track current function
  let currentMethod: PLCMethod | null = null;
  let currentProperty: PLCProperty | null = null;
  let currentVarSection: PLCVariable['scope'] | null = null;
  let bracketDepth = 0;
  let inImplementation = false;
  let implementationBuffer = '';
  let inBlockComment = false; // Track block comments state across lines

  // Track current parsing state for IF statements
  let currentIfStatement: PLCIfStatement | null = null; // The current IF statement being parsed
  let currentIfBlockType: 'then' | 'elsif' | 'else' | null = null; // The current block within the IF statement
  let ifStatementStack: PLCIfStatement[] = []; // Stack to handle nested IFs

  // Regular expressions for parsing
  const fbRegex = /FUNCTION_BLOCK\s+([A-Za-z][A-Za-z0-9_]*)/;
  const programRegex = /PROGRAM\s+([A-Za-z][A-Za-z0-9_]*)/; // PROGRAM declaration
  const functionRegex = /FUNCTION\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\(\s*(.*)\s*\))?\s*:\s*([A-Za-z][A-Za-z0-9_]*)/; // FUNCTION declaration
  const methodRegex = /METHOD\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\(\s*(.*)\s*\))?\s*:\s*([A-Za-z][A-Za-z0-9_]*)/;
  const propertyRegex = /PROPERTY\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)/;
  const getSetRegex = /(GET|SET)/;
  const varSectionRegex = /^\s*(VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR_TEMP|VAR)/; // Match from start, prioritize longer keywords
  const endVarRegex = /END_VAR/;
  // Updated regex to capture name(1), type(2), optional initial value(3), and optional comment (everything after semicolon)(4)
  const varDeclarationRegex = /\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)\s*(?::=\s*(.+?))?\s*;(?:\s*(.*))?/;
  const endFunctionBlockRegex = /END_FUNCTION_BLOCK/;
  const endProgramRegex = /END_PROGRAM/; // END_PROGRAM
  const endFunctionRegex = /END_FUNCTION/; // END_FUNCTION
  const endMethodRegex = /END_METHOD/;
  const blockCommentStartRegex = /\(\*/g; // Use global flag
  const blockCommentEndRegex = /\*\)/g; // Use global flag
  const assignmentRegex = /^\s*([A-Za-z][A-Za-z0-9_]*)\s*:=\s*(.+?)\s*;/; // Simple assignment
  const ifRegex = /^\s*IF\s+(.+)\s+THEN/i; // IF THEN
  const elsifRegex = /^\s*ELSIF\s+(.+)\s+THEN/i; // ELSIF THEN
  const elseRegex = /^\s*ELSE/i; // ELSE
  const endifRegex = /^\s*END_IF/i; // END_IF
  // Removed blockCommentOnlyRegex as we'll use startsWith/endsWith

  for (let i = 0; i < lines.length; i++) {
    const originalLine = lines[i]; // Keep original line for potential comment extraction
    let line = originalLine; // Use let for modifications
    const lineNumber = i + 1;

    try {
      // --- Comment Handling ---
      // We need comments for variable declarations, so we don't strip them globally here anymore.
      // Instead, regexes that need to ignore comments will handle them,
      // and the variable regex will specifically capture them.
      // We still need to handle multi-line block comments correctly.

      let lineWithoutBlockComments = '';
      let currentPos = 0;
      if (inBlockComment) { // If we were already inside a block comment from the previous line
          const endCommentIndex = line.indexOf('*)');
          if (endCommentIndex !== -1) {
              inBlockComment = false;
              currentPos = endCommentIndex + 2; // Start processing after the comment ends
          } else {
              continue; // Whole line is inside a block comment, skip it
          }
      }

      while (currentPos < line.length) {
          const startCommentIndex = line.indexOf('(*', currentPos);
          if (startCommentIndex !== -1) {
              // Add text before the comment start
              lineWithoutBlockComments += line.substring(currentPos, startCommentIndex);
              const endCommentIndex = line.indexOf('*)', startCommentIndex + 2);
              if (endCommentIndex !== -1) {
                  // Block comment ends on the same line
                  currentPos = endCommentIndex + 2; // Move past the comment
              } else {
                  // Block comment continues to the next line
                  inBlockComment = true;
                  currentPos = line.length; // Stop processing this line
              }
          } else {
              // No more block comments found on this line
              lineWithoutBlockComments += line.substring(currentPos);
              currentPos = line.length; // Exit loop
          }
      }

      // Now remove single-line comments from the block-comment-free version
      const singleCommentIndex = lineWithoutBlockComments.indexOf('//');
      let processedLine = (singleCommentIndex !== -1)
          ? lineWithoutBlockComments.substring(0, singleCommentIndex)
          : lineWithoutBlockComments;

      processedLine = processedLine.trim(); // Trim whitespace after removing comments
      if (processedLine === '' && !inBlockComment) continue; // Skip lines that are now empty unless we entered a block comment

      // Use processedLine for most matching, but originalLine for var declarations
      line = processedLine; // Default to using the processed line

      // --- End Comment Handling ---

      // --- Check for END keywords FIRST ---
      const endMethodMatch = line.match(endMethodRegex);
      const endPropertyMatch = line.match(/END_PROPERTY/);
      const endFunctionBlockMatch = line.match(endFunctionBlockRegex);
      const endProgramMatch = line.match(endProgramRegex);
      const endFunctionMatch = line.match(endFunctionRegex);
      const endVarMatch = line.match(endVarRegex);

      if (endVarMatch && currentVarSection) { // Only end VAR if we are in one
          currentVarSection = null;
          continue;
      }
      if (endMethodMatch && currentMethod) {
        // Logic for ending method (handling implementation buffer, resetting state)
        if (!inImplementation && currentMethod) {
           currentMethod.implementation = implementationBuffer;
           implementationBuffer = '';
           currentMethod = null;
        } else if (inImplementation && bracketDepth === 0 && !currentIfStatement) {
             currentMethod.implementation = implementationBuffer;
             implementationBuffer = '';
             currentMethod = null;
             inImplementation = false;
        }
        continue;
      }
      if (endPropertyMatch && currentProperty) {
           // Logic for ending property
           if (!inImplementation && currentProperty) {
               currentProperty.implementation += implementationBuffer;
               implementationBuffer = '';
               currentProperty = null;
           } else if (inImplementation && bracketDepth === 0 && !currentIfStatement) {
                currentProperty.implementation += implementationBuffer;
                implementationBuffer = '';
                currentProperty = null;
                inImplementation = false;
           }
           continue;
       }
       if (endFunctionBlockMatch && currentFunctionBlock) {
           // Logic for ending function block
           const fbLineNumber = currentFunctionBlock.lineNumber; // Store line number before resetting
           currentFunctionBlock = null;
           currentMethod = null;
           currentProperty = null;
           currentVarSection = null;
           implementationBuffer = '';
           inImplementation = false;
           bracketDepth = 0;
           if (ifStatementStack.length > 0) {
                const unclosedIf = ifStatementStack[0];
                result.errors.push({
                    message: 'Unclosed IF statement(s) at end of Function Block',
                    lineNumber: unclosedIf.lineNumber, // Report error at the IF line
                    columnStart: 1
                });
                ifStatementStack = [];
                currentIfStatement = null;
                currentIfBlockType = null;
           }
           continue;
       }
       if (endProgramMatch && currentProgram) {
           // Logic for ending program
           const progLineNumber = currentProgram.lineNumber;
           currentProgram = null;
           currentVarSection = null;
           implementationBuffer = '';
           inImplementation = false;
           bracketDepth = 0;
            if (ifStatementStack.length > 0) {
                 const unclosedIf = ifStatementStack[0];
                 result.errors.push({
                     message: 'Unclosed IF statement(s) at end of Program',
                     lineNumber: unclosedIf.lineNumber,
                     columnStart: 1
                 });
                 ifStatementStack = [];
                 currentIfStatement = null;
                 currentIfBlockType = null;
            }
           continue;
       }
       if (endFunctionMatch && currentFunction) {
           // Logic for ending function
           const funcLineNumber = currentFunction.lineNumber;
           currentFunction = null;
           currentVarSection = null;
           implementationBuffer = '';
           inImplementation = false;
           bracketDepth = 0;
            if (ifStatementStack.length > 0) {
                 const unclosedIf = ifStatementStack[0];
                 result.errors.push({
                     message: 'Unclosed IF statement(s) at end of Function',
                     lineNumber: unclosedIf.lineNumber,
                     columnStart: 1
                 });
                 ifStatementStack = [];
                 currentIfStatement = null;
                 currentIfBlockType = null;
            }
           continue;
       }
      // --- End of END keyword checks ---


      // Check for POU declarations (Function Block, Program, Function)
      const fbMatch = line.match(fbRegex);
      const programMatch = line.match(programRegex);
      const functionMatch = line.match(functionRegex);

      if (fbMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Function Block)',
            lineNumber,
            columnStart: originalLine.search(fbRegex) + 1 // Use originalLine for accurate column
          });
          continue;
        }

        currentFunctionBlock = {
          name: fbMatch[1],
          variables: [],
          methods: [],
          properties: [],
          statements: [], // Initialize FB body statements array
          lineNumber
        };

        result.functionBlocks.push(currentFunctionBlock);
        continue;
      } else if (programMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Program)',
            lineNumber,
            columnStart: originalLine.search(programRegex) + 1 // Use originalLine for accurate column
          });
          continue;
        }

        currentProgram = {
          name: programMatch[1],
          variables: [],
          statements: [], // Initialize program body statements
          lineNumber
        };

        result.programs.push(currentProgram);
        continue;
      } else if (functionMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Function)',
            lineNumber,
            columnStart: originalLine.search(functionRegex) + 1 // Use originalLine for accurate column
          });
          continue;
        }

        const functionName = functionMatch[1];
        const paramString = functionMatch[2] || '';
        const returnType = functionMatch[3];

        currentFunction = {
          name: functionName,
          returnType,
          parameters: parseParameters(paramString), // Function parameters are like VAR_INPUT
          localVariables: [], // VAR_TEMP within function
          statements: [], // Initialize function body statements
          lineNumber
        };

        result.functions.push(currentFunction);
        continue;
      }

      // Check for method declaration (only within Function Blocks)
      const methodMatch = line.match(methodRegex);
      if (methodMatch && currentFunctionBlock && !inImplementation) {
        const methodName = methodMatch[1];
        const paramString = methodMatch[2] || '';
        const returnType = methodMatch[3];

        currentMethod = {
          name: methodName,
          returnType,
          parameters: parseParameters(paramString),
          localVariables: [],
          implementation: '',
          statements: [], // Initialize statements array for method
          lineNumber
        };

        currentFunctionBlock.methods.push(currentMethod);
        continue;
      }

      // Check for property declaration (only within Function Blocks)
      const propertyMatch = line.match(propertyRegex);
      if (propertyMatch && currentFunctionBlock && !inImplementation) {
        const propertyName = propertyMatch[1];
        const propertyType = propertyMatch[2];

        currentProperty = {
          name: propertyName,
          type: propertyType,
          hasGetter: false,
          hasSetter: false,
          implementation: '',
          statements: [], // Initialize statements array for property
          lineNumber
        };

        currentFunctionBlock.properties.push(currentProperty);
        continue;
      }

      // Check for GET/SET in property (only within Properties)
      const getSetMatch = line.match(getSetRegex);
      if (getSetMatch && currentProperty) {
        if (getSetMatch[1] === 'GET') {
          currentProperty.hasGetter = true;
        } else if (getSetMatch[1] === 'SET') {
          currentProperty.hasSetter = true;
        }
        continue;
      }

      // Check for variable sections
      const varSectionMatch = line.match(varSectionRegex);
      if (varSectionMatch && (currentFunctionBlock || currentProgram || currentFunction)) {
        currentVarSection = varSectionMatch[1] as PLCVariable['scope']; // Update state
        continue;
      }

      // Parse variable declarations (Needs the original line to capture comments)
      if (currentVarSection && (currentFunctionBlock || currentProgram || currentFunction)) {

        // Use the 'processedLine' which has comments stripped by the main logic earlier.
        // If it's empty, the original line was only comments or whitespace.
        if (line === '') { // 'line' here refers to 'processedLine' from the earlier block
             continue; // Skip comment-only or empty lines
        }

        // If 'processedLine' is not empty, attempt to match a variable declaration
        // using the 'originalLine' to capture potential comments.
        const varDeclarationMatch = originalLine.match(varDeclarationRegex);

        if (varDeclarationMatch) {
          // Successfully matched a variable declaration
          const name = varDeclarationMatch[1];
          const type = varDeclarationMatch[2];
          const initialValue = varDeclarationMatch[3]?.trim(); // Trim potential whitespace
          // Capture everything after the semicolon as the raw comment string (group 4)
          let rawComment = varDeclarationMatch[4];
          let processedComment: string | undefined = undefined;

          if (rawComment) {
              rawComment = rawComment.trim();
              if (rawComment.startsWith('//')) {
                  processedComment = rawComment.substring(2).trim(); // Remove '//' and trim
              } else if (rawComment.startsWith('(*') && rawComment.endsWith('*)')) {
                  processedComment = rawComment.substring(2, rawComment.length - 2).trim(); // Remove '(*' and '*)' and trim
              } else {
                   // Handle cases like multiple comments or unexpected format - maybe just keep raw?
                   // For now, let's assume the most common formats are handled above.
                   // If it's not a standard comment format, maybe it shouldn't be treated as a comment?
                   // Let's assign the trimmed raw string if it doesn't match known markers,
                   // although this might capture unintended things.
                   // A stricter approach might be preferable later.
                   processedComment = rawComment; // Keep as is if markers aren't standard
              }
          }


          const variable: PLCVariable = {
            name,
            type,
            scope: currentVarSection,
            lineNumber, // Assign the current line number
            // Only add comment property if a processed comment exists and is not empty
            ...(processedComment && { comment: processedComment }),
          };

          if (initialValue !== undefined) { // Check for undefined explicitly
            variable.initialValue = initialValue;
          }

          // Add variable to the correct POU or method
          if (currentMethod && currentVarSection === 'VAR_TEMP') {
            currentMethod.localVariables.push(variable);
          } else if (currentFunction && currentVarSection === 'VAR_TEMP') { // VAR_TEMP in Function
             currentFunction.localVariables.push(variable);
          }
          else if (currentFunctionBlock) {
            currentFunctionBlock.variables.push(variable);
          } else if (currentProgram) {
            currentProgram.variables.push(variable);
          } else if (currentFunction) {
             // Differentiate between parameter types and local VARs within a FUNCTION
             if (currentVarSection === 'VAR_INPUT' || currentVarSection === 'VAR_OUTPUT' || currentVarSection === 'VAR_IN_OUT') {
                 currentFunction.parameters.push(variable); // These are actual parameters
             } else if (currentVarSection === 'VAR') {
                 currentFunction.localVariables.push(variable); // Plain VAR should be local
             }
             // VAR_TEMP is handled earlier
          }

          continue;
        } else {
          // Line is not just a comment/empty, but also doesn't match the variable declaration format
          result.errors.push({
            message: `Invalid syntax in variable declaration section.`,
            lineNumber,
            columnStart: originalLine.search(/\S/) + 1 // Report at the first non-whitespace character of original line
          });
          continue; // Move to the next line
        }
      }

      // Track implementation code (within Method, Property, Function Block, Program, Function)
      if (currentMethod || currentProperty || currentFunctionBlock || currentProgram || currentFunction) {
         // --- Check for Statements (Assignment, IF, etc.) ---

         // Check for Assignment FIRST, as it's simpler
         const assignmentMatch = line.match(assignmentRegex);
         if (assignmentMatch) {
             const targetVariable = assignmentMatch[1];
             const sourceExpression = assignmentMatch[2];
             const statement: PLCAssignmentStatement = {
               type: 'assignment',
               targetVariable,
               sourceExpression,
               lineNumber
             };

             // Add statement to the correct place (current IF block or main POU body)
             if (currentIfStatement && currentIfBlockType) {
                 if (currentIfBlockType === 'then') {
                     currentIfStatement.thenStatements.push(statement);
                 } else if (currentIfBlockType === 'elsif' && currentIfStatement.elseIfStatements) {
                     currentIfStatement.elseIfStatements[currentIfStatement.elseIfStatements.length - 1].statements.push(statement);
                 } else if (currentIfBlockType === 'else' && currentIfStatement.elseStatements) {
                     currentIfStatement.elseStatements.push(statement);
                 }
             } else if (currentMethod) { // Add to Method body
                 currentMethod.statements?.push(statement);
             } else if (currentProperty) { // Add to Property body
                 currentProperty.statements?.push(statement);
             } else if (currentProgram) { // Add to Program body
                 currentProgram.statements?.push(statement);
             } else if (currentFunction) { // Add to Function body
                 currentFunction.statements?.push(statement);
             } else if (currentFunctionBlock) { // Add to Function Block body
                 currentFunctionBlock.statements?.push(statement);
             }

             continue; // Handled assignment, move to next line
         }

         // Check for IF statement start (only if not an assignment)
         const ifMatch = line.match(ifRegex);
         if (ifMatch) {
             const newIfStatement: PLCIfStatement = {
                 type: 'if',
                 condition: ifMatch[1].trim(),
                 thenStatements: [],
                 lineNumber
             };

             // Add the new IF statement to the appropriate statements array
             if (currentIfStatement) {
                 // Nested IF
                 if (currentIfBlockType === 'then') {
                     currentIfStatement.thenStatements.push(newIfStatement);
                 } else if (currentIfBlockType === 'elsif' && currentIfStatement.elseIfStatements) {
                     currentIfStatement.elseIfStatements[currentIfStatement.elseIfStatements.length - 1].statements.push(newIfStatement);
                 } else if (currentIfBlockType === 'else' && currentIfStatement.elseStatements) {
                     currentIfStatement.elseStatements.push(newIfStatement);
                 }
             } else if (currentMethod) {
                 currentMethod.statements?.push(newIfStatement);
             } else if (currentProperty) {
                 currentProperty.statements?.push(newIfStatement);
             } else if (currentFunctionBlock) { // Add to FB statements
                 currentFunctionBlock.statements?.push(newIfStatement);
             } else if (currentProgram) { // Add to Program statements
                 currentProgram.statements?.push(newIfStatement); // Add to Program statements
             } else if (currentFunction) { // Add to Function statements
                 currentFunction.statements?.push(newIfStatement); // Add to Function statements
             }


             // Push the current IF onto the stack and update current state
             ifStatementStack.push(newIfStatement);
             currentIfStatement = newIfStatement;
             currentIfBlockType = 'then';
             inImplementation = true; // Ensure we are in implementation parsing mode
             continue; // Process next line
         }

         // If inside an IF statement, check for ELSIF, ELSE, END_IF, or parse statements
         if (currentIfStatement) {
           const elsifMatch = line.match(elsifRegex);
           if (elsifMatch && currentIfBlockType !== 'else') { // ELSIF after THEN or previous ELSIF
             if (!currentIfStatement.elseIfStatements) {
               currentIfStatement.elseIfStatements = [];
             }
             currentIfStatement.elseIfStatements.push({
               condition: elsifMatch[1].trim(),
               statements: []
             });
             currentIfBlockType = 'elsif';
             continue; // Process next line
           }

           const elseMatch = line.match(elseRegex);
           if (elseMatch && currentIfBlockType !== 'else') { // ELSE after THEN or ELSIF
             currentIfStatement.elseStatements = [];
             currentIfBlockType = 'else';
             continue; // Process next line
           }

           const endifMatch = line.match(endifRegex);
           if (endifMatch) { // END_IF
             // Pop the current IF from the stack
             ifStatementStack.pop();
             // Restore the previous IF from the stack, or set to null if stack is empty
             currentIfStatement = ifStatementStack.length > 0 ? ifStatementStack[ifStatementStack.length - 1] : null;
             // Determine the block type based on the new currentIfStatement (if any)
             if (currentIfStatement) {
                  // This logic might need refinement for complex nested structures
                  // For now, we'll just reset to null, assuming END_IF always closes the innermost IF
                  currentIfBlockType = null; // Reset block type after closing IF
             } else {
                  currentIfBlockType = null; // No longer in any IF block
                  // Do not exit inImplementation here, as we might still be in a POU body
             }
             continue; // Process next line
           }

           // If none of the IF control keywords matched inside the IF block,
           // AND it wasn't an assignment (handled earlier),
           // then it's some other statement type within the IF block that we don't parse yet.
           // Or it could be part of a multi-line expression within the IF condition/assignment.
           // For now, just continue.
           // implementationBuffer += lines[i] + '\n'; // Optionally keep raw buffer
           continue; // Process next line
         }

         // If the line wasn't an assignment or an IF start, and we are not inside an IF,
         // it's some other statement type in the main POU body that we don't parse yet.
         // implementationBuffer += lines[i] + '\n'; // Optionally keep raw buffer


         // If not inside an IF statement, parse other statements within the current POU/Method/Property
         if (!currentIfStatement) {
             // Count brackets for implementation blocks (This logic might need adjustment
             // if brackets are used within parsed statements like IF conditions)
             const openBrackets = (line.match(/\{/g) || []).length;
             const closeBrackets = (line.match(/\}/g) || []).length;
             bracketDepth += openBrackets - closeBrackets;

             if (!inImplementation && bracketDepth > 0) {
               inImplementation = true;
             }

             if (inImplementation) {
               implementationBuffer += lines[i] + '\n'; // Keep raw buffer using original line

               // Attempt to parse simple assignment statements outside of IF blocks
               const assignmentMatch = line.match(assignmentRegex);
               if (assignmentMatch) {
                 const targetVariable = assignmentMatch[1];
                 const sourceExpression = assignmentMatch[2];
                 const statement: PLCAssignmentStatement = { // Use 'statement' variable name
                   type: 'assignment',
                   targetVariable,
                   sourceExpression,
                   lineNumber
                 };

                 // Add the statement to the current POU/Method/Property statements array
                 if (currentMethod) {
                   currentMethod.statements?.push(statement);
                 } else if (currentProperty) {
                   currentProperty.statements?.push(statement);
                 } else if (currentFunctionBlock) {
                    // currentFunctionBlock.statements?.push(statement); // FB body statements not parsed yet
                 } else if (currentProgram) {
                    currentProgram.statements?.push(statement); // Add to Program statements
                 } else if (currentFunction) {
                    currentFunction.statements?.push(statement); // Add to Function statements
                 }
               }
             }

             // Exit implementation if brackets match and not in an IF
             if (inImplementation && bracketDepth === 0) {
               if (currentMethod) {
                 currentMethod.implementation = implementationBuffer;
                 // currentMethod.statements are already populated line by line
                 // No need to clear statements here, they are added as parsed
                 currentMethod = null;
               } else if (currentProperty) {
                 currentProperty.implementation += implementationBuffer;
                  // currentProperty.statements are already populated line by line
                  // No need to clear statements here
                  currentProperty = null;
               }
               // Note: FB, Program, Function bodies are not fully parsed yet,
               // so we don't exit implementation mode for them here based on brackets.
               // This logic will need refinement when full body parsing is implemented.
               if (!currentFunctionBlock && !currentProgram && !currentFunction) {
                   implementationBuffer = '';
                   inImplementation = false;
               }
             }
         }
      }


      // (The END keyword checks have been moved earlier)


    } catch (error) {
      result.errors.push({
        message: `Parser error on line ${lineNumber}: ${error}`,
        lineNumber,
        // columnStart: error.column // Add column if available from error object
      });
    }
  }

  // Add error if we have unclosed blocks at the end of the file
  if (currentFunctionBlock) {
    result.errors.push({
      message: 'Unclosed function block: ' + currentFunctionBlock.name,
      lineNumber: currentFunctionBlock.lineNumber,
      columnStart: currentFunctionBlock.columnStart // Add column start from FB object
    });
  }
   if (currentProgram) {
       result.errors.push({
           message: 'Unclosed program: ' + currentProgram.name,
           lineNumber: currentProgram.lineNumber,
           columnStart: currentProgram.columnStart // Add column start from Program object
       });
   }
    if (currentFunction) {
        result.errors.push({
            message: 'Unclosed function: ' + currentFunction.name,
            lineNumber: currentFunction.lineNumber,
            columnStart: currentFunction.columnStart // Add column start from Function object
        });
    }
   if (currentMethod) {
       result.errors.push({
           message: 'Unclosed method: ' + currentMethod.name,
           lineNumber: currentMethod.lineNumber,
           columnStart: currentMethod.columnStart // Add column start from Method object
       });
   }
    if (currentProperty) {
        result.errors.push({
            message: 'Unclosed property: ' + currentProperty.name,
            lineNumber: currentProperty.lineNumber,
            columnStart: currentProperty.columnStart // Add column start from Property object
        });
    }
    // Add error for unclosed IF statements at the very end of the file
    if (ifStatementStack.length > 0) {
        result.errors.push({
            message: 'Unclosed IF statement(s) at end of file',
            lineNumber: lines.length, // Report at the end of the file
            columnStart: 1 // Generic column 1 for end-of-file errors
        });
    }
   if (inBlockComment) {
       result.errors.push({
           message: 'Unclosed block comment',
           lineNumber: lines.length, // Report at the end of the file
           columnStart: 1 // Generic column 1 for end-of-file errors
       });
   }

  return result;
}

function parseParameters(paramString: string): PLCVariable[] {
  if (!paramString) return [];

  const params = paramString.split(';'); // Split by semicolon
  const parsedParams: PLCVariable[] = [];
  const scopeRegex = /^(VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR)\s+/i; // Regex for scope keywords

  for (const param of params) {
    const trimmedParam = param.trim();
    if (trimmedParam === '') continue; // Skip empty parts

    let currentScope: PLCVariable['scope'] = 'VAR_INPUT'; // Default scope
    let declarationPart = trimmedParam;

    const scopeMatch = trimmedParam.match(scopeRegex);
    if (scopeMatch) {
      currentScope = scopeMatch[1].toUpperCase() as PLCVariable['scope'];
      declarationPart = trimmedParam.substring(scopeMatch[0].length).trim();
    }

    const parts = declarationPart.split(':');
    if (parts.length !== 2) {
      // This error should ideally point to the method/function declaration line,
      // but for simplicity, we'll report it here.
      // Note: We don't have the line number here, so we can't add it to the error.
      // A more robust parser would pass line numbers down.
      console.error(`Invalid parameter format: ${param}`); // Log error for now
      continue; // Skip this parameter
    }

    const name = parts[0].trim();
    const type = parts[1].trim();

    parsedParams.push({
      name,
      type,
      scope: currentScope,
      lineNumber: 0, // Placeholder: Line number not available in this context
      // initialValue and comment are not typically part of parameter declarations
    });
  }

  return parsedParams;
}

// Helper function to recursively generate ST code string for statements
function generateSTStatementString(statement: PLCStatement, indentLevel = 0): string {
  const indent = '  '.repeat(indentLevel);
  let statementString = '';

  if (statement.type === 'assignment') {
    statementString = `${indent}${statement.targetVariable} := ${statement.sourceExpression};`;
  } else if (statement.type === 'if') {
    statementString += `${indent}IF ${statement.condition} THEN\n`;
    statement.thenStatements.forEach(stmt => {
      statementString += generateSTStatementString(stmt, indentLevel + 1) + '\n';
    });
    statement.elseIfStatements?.forEach(elsifBlock => {
      statementString += `${indent}ELSIF ${elsifBlock.condition} THEN\n`;
      elsifBlock.statements.forEach(stmt => {
        statementString += generateSTStatementString(stmt, indentLevel + 1) + '\n';
      });
    });
    if (statement.elseStatements) {
      statementString += `${indent}ELSE\n`;
      statement.elseStatements.forEach(stmt => {
        statementString += generateSTStatementString(stmt, indentLevel + 1) + '\n';
      });
    }
    statementString += `${indent}END_IF;`; // Add semicolon for standard ST
  }
  // Add other statement types (CASE, FOR, WHILE, etc.) here later

  // Trim trailing newline if any was added unnecessarily
  return statementString.trimEnd();
}
// Helper function to convert parsed data to PLCopen XML format
export function generatePLCopenXML(data: ParserResult): string {
  let xml = '<?xml version="1.0" encoding="utf-8"?>\n';
  xml += '<project xmlns="http://www.plcopen.org/xml/tc6_0201">\n';
  xml += '  <fileHeader companyName="" productName="PLC Code-First Editor" productVersion="1.0"/>\n';
  xml += '  <contentHeader>\n';
  xml += '    <coordinateInfo>\n';
  xml += '      <fbd><scaling x="1" y="1"/></fbd>\n';
  xml += '      <ld><scaling x="1" y="1"/></ld>\n';
  xml += '      <sfc><scaling x="1" y="1"/></sfc>\n';
    xml += '    </coordinateInfo>\n';
  xml += '  </contentHeader>\n';
  xml += '  <types>\n';

  // Add Function Blocks
  data.functionBlocks.forEach(fb => {
    xml += `    <pou name="${fb.name}" pouType="functionBlock">\n`;
    xml += '      <interface>\n';

    // Input variables
    const inputs = fb.variables.filter(v => v.scope === 'VAR_INPUT');
    if (inputs.length > 0) {
      xml += '        <inputVars>\n';
      inputs.forEach(v => {
        xml += `          <variable name="${v.name}">\n`;
        xml += `            <type>${v.type}</type>\n`;
        if (v.initialValue) {
          xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
        }
        if (v.comment) {
          xml += `            <documentation>${v.comment}</documentation>\n`;
        }
        xml += '          </variable>\n';
      });
      xml += '        </inputVars>\n';
    }

    // Output variables
    const outputs = fb.variables.filter(v => v.scope === 'VAR_OUTPUT');
    if (outputs.length > 0) {
      xml += '        <outputVars>\n';
      outputs.forEach(v => {
        xml += `          <variable name="${v.name}">\n`;
        xml += `            <type>${v.type}</type>\n`;
        if (v.initialValue) {
          xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
        }
        if (v.comment) {
          xml += `            <documentation>${v.comment}</documentation>\n`;
        }
        xml += '          </variable>\n';
      });
      xml += '        </outputVars>\n';
    }

    // InOut variables
    const inouts = fb.variables.filter(v => v.scope === 'VAR_IN_OUT');
    if (inouts.length > 0) {
      xml += '        <inOutVars>\n';
      inouts.forEach(v => {
        xml += `          <variable name="${v.name}">\n`;
        xml += `            <type>${v.type}</type>\n`;
        if (v.comment) {
          xml += `            <documentation>${v.comment}</documentation>\n`;
        }
        xml += '          </variable>\n';
      });
      xml += '        </inOutVars>\n';
    }

    // Local variables
    const locals = fb.variables.filter(v => v.scope === 'VAR');
    if (locals.length > 0) {
      xml += '        <localVars>\n';
      locals.forEach(v => {
        xml += `          <variable name="${v.name}">\n`;
        xml += `            <type>${v.type}</type>\n`;
        if (v.initialValue) {
          xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
        }
        if (v.comment) {
          xml += `            <documentation>${v.comment}</documentation>\n`;
        }
        xml += '          </variable>\n';
      });
      xml += '        </localVars>\n';
    }

    // Methods interface (parameters are part of the method definition, not FB interface variables)
    // Method local variables (VAR_TEMP) are handled within the method body in XML

    // Properties interface (GET/SET methods are part of the property definition)
    // Property variables are handled within the property definition in XML

    xml += '      </interface>\n';

    // Implementation in structured text
    xml += '      <body>\n';
    xml += '        <ST>\n';
    xml += '          <xhtml xmlns="http://www.w3.org/1999/xhtml">\n';

    // Add methods and properties implementations
    fb.methods.forEach(method => {
      // Method definition in XML includes parameters and local variables
      xml += `          <p>METHOD ${method.name}: ${method.returnType}</p>\n`; // Basic representation in XML output
      if (method.parameters.length > 0) {
          xml += `          <p>VAR_INPUT</p>\n`; // Parameters are typically VAR_INPUT
          method.parameters.forEach(param => {
              xml += `          <p>  ${param.name} : ${param.type};</p>\n`; // Basic parameter representation
          });
          xml += `          <p>END_VAR</p>\n`;
      }
       if (method.localVariables.length > 0) {
           xml += `          <p>VAR_TEMP</p>\n`; // Local variables are VAR_TEMP
           method.localVariables.forEach(local => {
               xml += `          <p>  ${local.name} : ${local.type};</p>\n`; // Basic local variable representation
           });
           xml += `          <p>END_VAR</p>\n`;
       }

      // Generate method body using the helper function
      let methodBody = '';
      if (method.statements && method.statements.length > 0) {
        methodBody = method.statements.map(stmt => generateSTStatementString(stmt, 1)).join('\n'); // Start with indent level 1
      } else if (method.implementation) {
        // Fallback to raw implementation if no parsed statements
        methodBody = method.implementation.trim(); // Trim whitespace from raw implementation
      }
      // Wrap the entire generated body in CDATA
      if (methodBody) {
        xml += `          <p><![CDATA[\n${methodBody}\n          ]]></p>\n`;
      }
      xml += `          <p>END_METHOD</p>\n\n`; // Keep for now in XML output
    });

    fb.properties.forEach(prop => {
      xml += `          <p>PROPERTY ${prop.name}: ${prop.type}</p>\n`;
      // Generate property body using the helper function
      let propertyBody = '';
      if (prop.statements && prop.statements.length > 0) {
        propertyBody = prop.statements.map(stmt => generateSTStatementString(stmt, 1)).join('\n'); // Start with indent level 1
      } else if (prop.implementation) {
        // Fallback to raw implementation if no parsed statements
        propertyBody = prop.implementation.trim(); // Trim whitespace
      }
      // Wrap the entire generated body in CDATA
      if (propertyBody) {
         xml += `          <p><![CDATA[\n${propertyBody}\n          ]]></p>\n`;
      }
      xml += `          <p>END_PROPERTY</p>\n\n`;
    });

    // Generate the main FB body statements (if any)
    let fbBody = '';
    if (fb.statements && fb.statements.length > 0) {
        fbBody = fb.statements.map(stmt => generateSTStatementString(stmt, 0)).join('\n');
    }
    // Wrap the entire generated body in CDATA
    if (fbBody) {
        // Remove the surrounding <p> tag for the main FB body
        xml += `          <![CDATA[\n${fbBody}\n          ]]>\n`;
    }

    xml += '          </xhtml>\n';
    xml += '        </ST>\n';
    xml += '      </body>\n';
    xml += '    </pou>\n';
  });

  // Add Programs
  data.programs.forEach(program => {
      xml += `    <pou name="${program.name}" pouType="program">\n`;
      xml += '      <interface>\n';

      // Program variables (VAR, VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT)
      const programVars = program.variables.filter(v => v.scope !== 'VAR_TEMP'); // Programs don't have VAR_TEMP at top level
      if (programVars.length > 0) {
          // Group variables by scope for XML output if needed, or just list them
          // For simplicity, listing all non-VAR_TEMP variables under <localVars> for now
          // A more accurate representation might require separate sections based on scope
          xml += '        <localVars>\n'; // Using localVars for simplicity, might need adjustment
          programVars.forEach(v => {
              xml += `          <variable name="${v.name}">\n`;
              xml += `            <type>${v.type}</type>\n`;
              if (v.initialValue) {
                  xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
              }
              if (v.comment) {
                  xml += `            <documentation>${v.comment}</documentation>\n`;
              }
              xml += '          </variable>\n';
          });
          xml += '        </localVars>\n';
      }

      xml += '      </interface>\n';

      // Implementation in structured text (Program body)
      xml += '      <body>\n';
      xml += '        <ST>\n';
      xml += '          <xhtml xmlns="http://www.w3.org/1999/xhtml">\n';

      // Generate program body using the helper function
      let programBody = '';
      if (program.statements && program.statements.length > 0) {
          programBody = program.statements.map(stmt => generateSTStatementString(stmt, 0)).join('\n');
      }
      // Wrap the entire generated body in CDATA
      if (programBody) {
          // Remove the surrounding <p> tag for the main Program body
          xml += `          <![CDATA[\n${programBody}\n          ]]>\n`;
      }

      xml += '          </xhtml>\n';
      xml += '        </ST>\n';
      xml += '      </body>\n';
      xml += '    </pou>\n';
  });

  // Add Functions
  data.functions.forEach(func => {
      xml += `    <pou name="${func.name}" pouType="function">\n`;
      xml += '      <interface>\n';

      // Function parameters (treated as VAR_INPUT)
      if (func.parameters.length > 0) {
          xml += '        <inputVars>\n'; // Using inputVars for function parameters
          func.parameters.forEach(v => {
              xml += `          <variable name="${v.name}">\n`;
              xml += `            <type>${v.type}</type>\n`;
              // Initial value and comment might be less common for function parameters, but include if present
              if (v.initialValue) {
                  xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
              }
              if (v.comment) {
                  xml += `            <documentation>${v.comment}</documentation>\n`;
              }
              xml += '          </variable>\n';
          });
          xml += '        </inputVars>\n';
      }

      // Function local variables (VAR_TEMP)
      if (func.localVariables.length > 0) {
          xml += '        <localVars>\n'; // Using localVars for function VAR_TEMP
          func.localVariables.forEach(v => {
              xml += `          <variable name="${v.name}">\n`;
              xml += `            <type>${v.type}</type>\n`;
              if (v.initialValue) {
                  xml += `            <initialValue>${v.initialValue}</initialValue>\n`;
              }
              if (v.comment) {
                  xml += `            <documentation>${v.comment}</documentation>\n`;
              }
              xml += '          </variable>\n';
          });
          xml += '        </localVars>\n';
      }

      // Function return type (represented as an output variable in PLCopen XML)
      xml += '        <outputVars>\n';
      xml += `          <variable name="${func.name}">\n`; // Function name is often used for return value
      xml += `            <type>${func.returnType}</type>\n`;
      xml += '          </variable>\n';
      xml += '        </outputVars>\n';


      xml += '      </interface>\n';

      // Implementation in structured text (Function body)
      xml += '      <body>\n';
      xml += '        <ST>\n';
      xml += '          <xhtml xmlns="http://www.w3.org/1999/xhtml">\n';

      // Generate function body using the helper function
      let functionBody = '';
      if (func.statements && func.statements.length > 0) {
          functionBody = func.statements.map(stmt => generateSTStatementString(stmt, 0)).join('\n');
      }
       // Wrap the entire generated body in CDATA
       if (functionBody) {
           // Remove the surrounding <p> tag for the main Function body
           xml += `          <![CDATA[\n${functionBody}\n          ]]>\n`;
       }

      xml += '          </xhtml>\n';
      xml += '        </ST>\n';
      xml += '      </body>\n';
      xml += '    </pou>\n';
  });


  xml += '  </types>\n';
  xml += '</project>';

  return xml;
}
