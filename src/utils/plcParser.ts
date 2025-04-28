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
  const varSectionRegex = /(VAR|VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR_TEMP)/;
  const endVarRegex = /END_VAR/;
  const varDeclarationRegex = /\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)\s*(?::=\s*(.+?))?\s*;(?:\s*\/\/\s*(.*))?/;
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

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]; // Use let to modify line
    const lineNumber = i + 1;

    try {
      // Handle block comments - remove them before parsing the line
      if (inBlockComment) {
        if (line.includes('*)')) {
          inBlockComment = false;
          line = line.substring(line.indexOf('*)') + 2); // Remove comment end and everything before it
        } else {
          continue; // Skip processing lines fully within a block comment
        }
      }

      while (line.includes('(*')) {
        const startIndex = line.indexOf('(*');
        const endIndex = line.indexOf('*)', startIndex);
        if (endIndex !== -1) {
          // Single-line or multi-line block comment start and end on the same line
          line = line.substring(0, startIndex) + line.substring(endIndex + 2);
        } else {
          // Multi-line block comment starts on this line but doesn't end
          line = line.substring(0, startIndex); // Remove from start of comment to end of line
          inBlockComment = true;
          break; // Stop processing this line for other patterns
        }
      }

      // Remove single-line comments after block comment handling
      const singleCommentIndex = line.indexOf('//');
      if (singleCommentIndex !== -1) {
        line = line.substring(0, singleCommentIndex);
      }

      line = line.trim(); // Trim whitespace after removing comments
      if (line === '') continue; // Skip empty lines

      // Check for POU declarations (Function Block, Program, Function)
      const fbMatch = line.match(fbRegex);
      const programMatch = line.match(programRegex);
      const functionMatch = line.match(functionRegex);

      if (fbMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Function Block)',
            lineNumber
          });
          continue;
        }

        currentFunctionBlock = {
          name: fbMatch[1],
          variables: [],
          methods: [],
          properties: [],
          // statements: [], // FB body statements not parsed yet
          lineNumber
        };

        result.functionBlocks.push(currentFunctionBlock);
        continue;
      } else if (programMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Program)',
            lineNumber
          });
          continue;
        }

        currentProgram = {
          name: programMatch[1],
          variables: [],
          // statements: [], // Program body statements not parsed yet
          lineNumber
        };

        result.programs.push(currentProgram);
        continue;
      } else if (functionMatch) {
        if (currentFunctionBlock || currentProgram || currentFunction) {
          result.errors.push({
            message: 'Nested POU declaration (Function)',
            lineNumber
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
          // statements: [], // Function body statements not parsed yet
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
        currentVarSection = varSectionMatch[1] as PLCVariable['scope'];
        continue;
      }

      // Check for end of variable section
      if (line.match(endVarRegex)) {
        currentVarSection = null;
        continue;
      }

      // Parse variable declarations
      if (currentVarSection && (currentFunctionBlock || currentProgram || currentFunction)) {
        const varDeclarationMatch = line.match(varDeclarationRegex);

        if (varDeclarationMatch) {
          const name = varDeclarationMatch[1];
          const type = varDeclarationMatch[2];
          const initialValue = varDeclarationMatch[3];
          const comment = varDeclarationMatch[4];

          const variable: PLCVariable = {
            name,
            type,
            scope: currentVarSection,
            comment,
          };

          if (initialValue) {
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
          } else if (currentFunction) { // VAR, VAR_INPUT, VAR_OUTPUT, VAR_IN_OUT in Function
             currentFunction.parameters.push(variable); // Treat all as parameters for now, refine later if needed
          }

          continue;
        }
      }

      // Track implementation code (within Method, Property, Function Block, Program, Function)
      if (currentMethod || currentProperty || currentFunctionBlock || currentProgram || currentFunction) {
         // Check for IF statement start
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
                 // currentFunctionBlock.statements?.push(newIfStatement); // FB body statements not parsed yet
             } else if (currentProgram) { // Add to Program statements
                 // currentProgram.statements?.push(newIfStatement); // Program body statements not parsed yet
             } else if (currentFunction) { // Add to Function statements
                 // currentFunction.statements?.push(newIfStatement); // Function body statements not parsed yet
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

           // If none of the IF control keywords matched, parse as a regular statement
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

             // Add the statement to the correct block (THEN, ELSIF, ELSE)
             if (currentIfBlockType === 'then') {
               currentIfStatement.thenStatements.push(statement);
             } else if (currentIfBlockType === 'elsif' && currentIfStatement.elseIfStatements) {
               currentIfStatement.elseIfStatements[currentIfStatement.elseIfStatements.length - 1].statements.push(statement);
             } else if (currentIfBlockType === 'else' && currentIfStatement.elseStatements) {
               currentIfStatement.elseStatements.push(statement);
             } else {
                  // Should not happen if logic is correct, but add to main statements as fallback
                  if (currentMethod) {
                      currentMethod.statements?.push(statement);
                  } else if (currentProperty) {
                      currentProperty.statements?.push(statement);
                  } else if (currentFunctionBlock) {
                      // currentFunctionBlock.statements?.push(statement); // FB body statements not parsed yet
                  } else if (currentProgram) {
                      // currentProgram.statements?.push(statement); // Program body statements not parsed yet
                  } else if (currentFunction) {
                      // currentFunction.statements?.push(statement); // Function body statements not parsed yet
                  }
             }
             continue; // Process next line
           }

           // If line is not an IF control keyword or a recognized statement,
           // it's part of the implementation but not parsed into a specific statement type yet.
           // We can add it to the implementationBuffer if needed, but for now, just continue.
           // implementationBuffer += lines[i] + '\n'; // Keep raw buffer
           continue; // Process next line
         }


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
                    // currentProgram.statements?.push(statement); // Program body statements not parsed yet
                 } else if (currentFunction) {
                    // currentFunction.statements?.push(statement); // Function body statements not parsed yet
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


      // Check for end of POU/Method/Property
      const endMethodMatch = line.match(endMethodRegex);
      const endPropertyMatch = line.match(/END_PROPERTY/);
      const endFunctionBlockMatch = line.match(endFunctionBlockRegex);
      const endProgramMatch = line.match(endProgramRegex);
      const endFunctionMatch = line.match(endFunctionRegex);


      if (endMethodMatch && currentMethod) {
        // For methods without implementation blocks (if any)
        if (!inImplementation && currentMethod) {
           // Process any remaining implementationBuffer if no brackets were used
           // This case might need refinement depending on expected ST syntax variations
           currentMethod.implementation = implementationBuffer;
           implementationBuffer = '';
           // If any statements were parsed before END_METHOD without brackets,
           // they are already in currentMethod.statements
           // No need to clear statements here
           currentMethod = null;
        } else if (inImplementation && bracketDepth === 0 && !currentIfStatement) {
             // Handle case where END_METHOD is on the same line as the closing bracket
             currentMethod.implementation = implementationBuffer;
             implementationBuffer = '';
             currentMethod = null;
             inImplementation = false;
        }
        continue;
      } else if (endPropertyMatch && currentProperty) {
           // For properties without implementation blocks (if any)
           if (!inImplementation && currentProperty) {
               currentProperty.implementation += implementationBuffer;
               implementationBuffer = '';
               // If any statements were parsed before END_PROPERTY without brackets,
               // they are already in currentProperty.statements
               // No need to clear statements here
               currentProperty = null;
           } else if (inImplementation && bracketDepth === 0 && !currentIfStatement) {
                // Handle case where END_PROPERTY is on the same line as the closing bracket
                currentProperty.implementation += implementationBuffer;
                implementationBuffer = '';
                currentProperty = null;
                inImplementation = false;
           }
           continue;
       } else if (endFunctionBlockMatch && currentFunctionBlock) {
           currentFunctionBlock = null;
           currentMethod = null; // Ensure nested elements are cleared
           currentProperty = null; // Ensure nested elements are cleared
           currentVarSection = null; // Ensure var section is reset
           implementationBuffer = ''; // Clear buffer for FB body (if we parse it later)
           inImplementation = false; // Ensure implementation flag is reset
           bracketDepth = 0; // Ensure bracket depth is reset
           // Also check if any IF statements were left unclosed within the FB body
           if (ifStatementStack.length > 0) {
                result.errors.push({
                    message: 'Unclosed IF statement(s) at end of Function Block',
                    lineNumber: lineNumber
                });
                ifStatementStack = []; // Clear the stack
                currentIfStatement = null;
                currentIfBlockType = null;
           }
           continue;
       } else if (endProgramMatch && currentProgram) {
           currentProgram = null;
           currentVarSection = null; // Ensure var section is reset
           implementationBuffer = ''; // Clear buffer for Program body (if we parse it later)
           inImplementation = false; // Ensure implementation flag is reset
           bracketDepth = 0; // Ensure bracket depth is reset
            // Also check if any IF statements were left unclosed within the Program body
            if (ifStatementStack.length > 0) {
                 result.errors.push({
                     message: 'Unclosed IF statement(s) at end of Program',
                     lineNumber: lineNumber
                 });
                 ifStatementStack = []; // Clear the stack
                 currentIfStatement = null;
                 currentIfBlockType = null;
            }
           continue;
       } else if (endFunctionMatch && currentFunction) {
           currentFunction = null;
           currentVarSection = null; // Ensure var section is reset
           implementationBuffer = ''; // Clear buffer for Function body (if we parse it later)
           inImplementation = false; // Ensure implementation flag is reset
           bracketDepth = 0; // Ensure bracket depth is reset
            // Also check if any IF statements were left unclosed within the Function body
            if (ifStatementStack.length > 0) {
                 result.errors.push({
                     message: 'Unclosed IF statement(s) at end of Function',
                     lineNumber: lineNumber
                 });
                 ifStatementStack = []; // Clear the stack
                 currentIfStatement = null;
                 currentIfBlockType = null;
            }
           continue;
       }


    } catch (error) {
      result.errors.push({
        message: `Parser error on line ${lineNumber}: ${error}`,
        lineNumber
      });
    }
  }

  // Add error if we have unclosed blocks at the end of the file
  if (currentFunctionBlock) {
    result.errors.push({
      message: 'Unclosed function block: ' + currentFunctionBlock.name,
      lineNumber: currentFunctionBlock.lineNumber
    });
  }
   if (currentProgram) {
       result.errors.push({
           message: 'Unclosed program: ' + currentProgram.name,
           lineNumber: currentProgram.lineNumber
       });
   }
    if (currentFunction) {
        result.errors.push({
            message: 'Unclosed function: ' + currentFunction.name,
            lineNumber: currentFunction.lineNumber
        });
    }
   if (currentMethod) {
       result.errors.push({
           message: 'Unclosed method: ' + currentMethod.name,
           lineNumber: currentMethod.lineNumber
       });
   }
    if (currentProperty) {
        result.errors.push({
            message: 'Unclosed property: ' + currentProperty.name,
            lineNumber: currentProperty.lineNumber
        });
    }
    // Add error for unclosed IF statements at the very end of the file
    if (ifStatementStack.length > 0) {
        result.errors.push({
            message: 'Unclosed IF statement(s) at end of file',
            lineNumber: lines.length // Report at the end of the file
        });
    }
   if (inBlockComment) {
       result.errors.push({
           message: 'Unclosed block comment',
           lineNumber: lines.length // Report at the end of the file
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
      // initialValue and comment are not typically part of parameter declarations
    });
  }

  return parsedParams;
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

      // Use parsed statements if available, otherwise fallback to raw implementation
      if (method.statements && method.statements.length > 0) {
        method.statements.forEach(stmt => {
          if (stmt.type === 'assignment') {
            // Wrap assignment in CDATA
            xml += `          <p><![CDATA[${stmt.targetVariable} := ${stmt.sourceExpression};]]></p>\n`;
          } else if (stmt.type === 'if') {
             // Basic representation of IF statement in XML with CDATA
             xml += `          <p><![CDATA[IF ${stmt.condition} THEN]]></p>\n`;
             // Recursively add statements within THEN block
             stmt.thenStatements.forEach(thenStmt => {
                 if (thenStmt.type === 'assignment') {
                     xml += `          <p><![CDATA[  ${thenStmt.targetVariable} := ${thenStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                 }
                 // Add other statement types here later
             });
             // Add ELSIF blocks
             stmt.elseIfStatements?.forEach(elsifBlock => {
                 xml += `          <p><![CDATA[ELSIF ${elsifBlock.condition} THEN]]></p>\n`;
                 elsifBlock.statements.forEach(elsifStmt => {
                      if (elsifStmt.type === 'assignment') {
                          xml += `          <p><![CDATA[  ${elsifStmt.targetVariable} := ${elsifStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                      }
                 });
             });
             // Add ELSE block
             if (stmt.elseStatements) {
                 xml += `          <p><![CDATA[ELSE]]></p>\n`;
                 stmt.elseStatements.forEach(elseStmt => {
                      if (elseStmt.type === 'assignment') {
                          xml += `          <p><![CDATA[  ${elseStmt.targetVariable} := ${elseStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                      }
                 });
             }
             xml += `          <p><![CDATA[END_IF]]></p>\n`; // Add END_IF
          }
          // Add other statement types here later
        });
      } else {
        xml += `          <p><![CDATA[${method.implementation}]]></p>\n`; // Fallback to raw with CDATA
      }
      xml += `          <p>END_METHOD</p>\n\n`; // Keep for now in XML output
    });

    fb.properties.forEach(prop => {
      xml += `          <p>PROPERTY ${prop.name}: ${prop.type}</p>\n`;
      // Use parsed statements if available, otherwise fallback to raw implementation
      if (prop.statements && prop.statements.length > 0) {
        prop.statements.forEach(stmt => {
          if (stmt.type === 'assignment') {
            xml += `          <p><![CDATA[${stmt.targetVariable} := ${stmt.sourceExpression};]]></p>\n`; // Basic representation with CDATA
          } else if (stmt.type === 'if') {
             // Basic representation of IF statement in XML with CDATA
             xml += `          <p><![CDATA[IF ${stmt.condition} THEN]]></p>\n`;
             // Recursively add statements within THEN block
             stmt.thenStatements.forEach(thenStmt => {
                 if (thenStmt.type === 'assignment') {
                     xml += `          <p><![CDATA[  ${thenStmt.targetVariable} := ${thenStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                 }
                 // Add other statement types here later
             });
             // Add ELSIF blocks
             stmt.elseIfStatements?.forEach(elsifBlock => {
                 xml += `          <p><![CDATA[ELSIF ${elsifBlock.condition} THEN]]></p>\n`;
                 elsifBlock.statements.forEach(elsifStmt => {
                      if (elsifStmt.type === 'assignment') {
                          xml += `          <p><![CDATA[  ${elsifStmt.targetVariable} := ${elsifStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                      }
                 });
             });
             // Add ELSE block
             if (stmt.elseStatements) {
                 xml += `          <p><![CDATA[ELSE]]></p>\n`;
                 stmt.elseStatements.forEach(elseStmt => {
                      if (elseStmt.type === 'assignment') {
                          xml += `          <p><![CDATA[  ${elseStmt.targetVariable} := ${elseStmt.sourceExpression};]]></p>\n`; // Indented basic representation
                      }
                 });
             }
             xml += `          <p><![CDATA[END_IF]]></p>\n`; // Add END_IF
          }
          // Add other statement types here later
        });
      } else {
        xml += `          <p><![CDATA[${prop.implementation}]]></p>\n`; // Fallback to raw with CDATA
      }
      xml += `          <p>END_PROPERTY</p>\n\n`;
    });

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

      // Add program body statements (if parsed later) or raw implementation
      // For now, we don't parse program body statements, so no output here yet.
      // If we had a raw implementation buffer for programs, we'd add it here.

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

      // Add function body statements (if parsed later) or raw implementation
      // For now, we don't parse function body statements, so no output here yet.
      // If we had a raw implementation buffer for functions, we'd add it here.

      xml += '          </xhtml>\n';
      xml += '        </ST>\n';
      xml += '      </body>\n';
      xml += '    </pou>\n';
  });


  xml += '  </types>\n';
  xml += '</project>';

  return xml;
}
