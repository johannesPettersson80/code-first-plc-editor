import { parsePLCCode } from '../plcParser';
import { PLCIfStatement } from '../../types/plc'; // Import type directly

describe('parsePLCCode', () => {
  // Test case 1: Empty code
  test('should return an empty result for empty code', () => {
    const code = '';
    const result = parsePLCCode(code);
    expect(result.functionBlocks).toEqual([]);
    expect(result.programs).toEqual([]);
    expect(result.functions).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  // Test case 2: Simple FUNCTION_BLOCK
  test('should parse a simple FUNCTION_BLOCK declaration', () => {
    const code = `
      FUNCTION_BLOCK MyFB
      END_FUNCTION_BLOCK
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functionBlocks).toHaveLength(1);
    expect(result.functionBlocks[0].name).toBe('MyFB');
    expect(result.functionBlocks[0].variables).toEqual([]);
    expect(result.functionBlocks[0].methods).toEqual([]);
    expect(result.functionBlocks[0].properties).toEqual([]);
    expect(result.programs).toEqual([]);
    expect(result.functions).toEqual([]);
  });

  // Test case 3: Simple PROGRAM
  test('should parse a simple PROGRAM declaration', () => {
    const code = `
      PROGRAM MyProgram
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].name).toBe('MyProgram');
    expect(result.programs[0].variables).toEqual([]);
    expect(result.functionBlocks).toEqual([]);
    expect(result.functions).toEqual([]);
  });

  // Test case 4: Simple FUNCTION
  test('should parse a simple FUNCTION declaration', () => {
    const code = `
      FUNCTION MyFunction : INT
      END_FUNCTION
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('MyFunction');
    expect(result.functions[0].returnType).toBe('INT');
    expect(result.functions[0].parameters).toEqual([]);
    expect(result.functions[0].localVariables).toEqual([]);
    expect(result.functionBlocks).toEqual([]);
    expect(result.programs).toEqual([]);
  });

  // Test case 5: FUNCTION_BLOCK with VAR section
  test('should parse a FUNCTION_BLOCK with a VAR section', () => {
    const code = `
      FUNCTION_BLOCK FB_WithVar
        VAR
          myVar : BOOL;
        END_VAR
      END_FUNCTION_BLOCK
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functionBlocks).toHaveLength(1);
    expect(result.functionBlocks[0].name).toBe('FB_WithVar');
    expect(result.functionBlocks[0].variables).toHaveLength(1);
    expect(result.functionBlocks[0].variables[0]).toEqual({
      name: 'myVar',
      type: 'BOOL',
      scope: 'VAR',
      comment: undefined, // Explicitly check for undefined comment
    });
    expect(result.functionBlocks[0].methods).toEqual([]);
    expect(result.functionBlocks[0].properties).toEqual([]);
    expect(result.programs).toEqual([]);
    expect(result.functions).toEqual([]);
  });

  // Test case 6: FUNCTION_BLOCK with multiple VAR sections
  test('should parse a FUNCTION_BLOCK with multiple VAR sections', () => {
    const code = `
      FUNCTION_BLOCK FB_MultiVar
        VAR_INPUT
          inVar : REAL;
        END_VAR
        VAR_OUTPUT
          outVar : INT;
        END_VAR
        VAR
          tempVar : BOOL; // Local variable
        END_VAR
      END_FUNCTION_BLOCK
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functionBlocks).toHaveLength(1);
    expect(result.functionBlocks[0].name).toBe('FB_MultiVar');
    expect(result.functionBlocks[0].variables).toHaveLength(3);
    // Check each variable individually for clarity
    const vars = result.functionBlocks[0].variables;
    const inVar = vars.find(v => v.name === 'inVar');
    const outVar = vars.find(v => v.name === 'outVar');
    const tempVar = vars.find(v => v.name === 'tempVar');

    expect(inVar).toBeDefined();
    expect(inVar?.type).toBe('REAL');
    expect(inVar?.scope).toBe('VAR_INPUT');

    expect(outVar).toBeDefined();
    expect(outVar?.type).toBe('INT');
    expect(outVar?.scope).toBe('VAR_OUTPUT');

    expect(tempVar).toBeDefined();
    expect(tempVar?.type).toBe('BOOL');
    expect(tempVar?.scope).toBe('VAR');
    expect(result.functionBlocks[0].methods).toEqual([]);
    expect(result.functionBlocks[0].properties).toEqual([]);
    expect(result.programs).toEqual([]);
    expect(result.functions).toEqual([]);
  });

  // Test case 7: Variable declarations with initial values and comments
  test('should parse variable declarations with initial values and comments', () => {
    const code = `
      PROGRAM VarDetails
        VAR
          count : INT := 10; // Initial count
          isValid : BOOL := TRUE;
          message : STRING := 'Hello'; // A message
          noInit : REAL; // No initial value
        END_VAR
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].variables).toHaveLength(4);

    const countVar = result.programs[0].variables.find(v => v.name === 'count');
    expect(countVar).toBeDefined();
    expect(countVar?.type).toBe('INT');
    expect(countVar?.scope).toBe('VAR');
    expect(countVar?.initialValue).toBe('10');
    expect(countVar?.comment).toBe('Initial count');

    const isValidVar = result.programs[0].variables.find(v => v.name === 'isValid');
    expect(isValidVar).toBeDefined();
    expect(isValidVar?.type).toBe('BOOL');
    expect(isValidVar?.scope).toBe('VAR');
    expect(isValidVar?.initialValue).toBe('TRUE');
    expect(isValidVar?.comment).toBeUndefined();

    const messageVar = result.programs[0].variables.find(v => v.name === 'message');
    expect(messageVar).toBeDefined();
    expect(messageVar?.type).toBe('STRING');
    expect(messageVar?.scope).toBe('VAR');
    expect(messageVar?.initialValue).toBe("'Hello'"); // Note: includes quotes
    expect(messageVar?.comment).toBe('A message');

    const noInitVar = result.programs[0].variables.find(v => v.name === 'noInit');
    expect(noInitVar).toBeDefined();
    expect(noInitVar?.type).toBe('REAL');
    expect(noInitVar?.scope).toBe('VAR');
    expect(noInitVar?.initialValue).toBeUndefined();
    expect(noInitVar?.comment).toBe('No initial value');
  });

// Test case 8: Variable declarations with block comments
  test('should parse variable declarations with block comments', () => {
    const code = `
      PROGRAM BlockComments
        VAR
          (* A block comment before *)
          counter : INT := 0; (* Counter variable *)
          flag : BOOL; (* Another comment *) (* And another *)
          (* Multi-line
             comment *)
          value : REAL := 1.23;
        END_VAR
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].variables).toHaveLength(3);

    const counterVar = result.programs[0].variables.find(v => v.name === 'counter');
    expect(counterVar).toBeDefined();
    expect(counterVar?.type).toBe('INT');
    expect(counterVar?.initialValue).toBe('0');
    expect(counterVar?.comment).toBe('Counter variable'); // Should capture the last comment on the line

    const flagVar = result.programs[0].variables.find(v => v.name === 'flag');
    expect(flagVar).toBeDefined();
    expect(flagVar?.type).toBe('BOOL');
    expect(flagVar?.initialValue).toBeUndefined();
    expect(flagVar?.comment).toBe('Another comment *) (* And another'); // Check how multiple comments are handled

    const valueVar = result.programs[0].variables.find(v => v.name === 'value');
    expect(valueVar).toBeDefined();
    expect(valueVar?.type).toBe('REAL');
    expect(valueVar?.initialValue).toBe('1.23');
    expect(valueVar?.comment).toBeUndefined(); // Comment is on previous lines
  });
  // Add more test cases here
});
// Test case 9: Program with simple assignment statements
  test('should parse a PROGRAM with simple assignment statements', () => {
    const code = `
      PROGRAM AssignmentTest
        VAR
          a : INT;
          b : BOOL;
          c : REAL;
        END_VAR

        a := 10;
        b := TRUE;
        c := a * 2.5; // Example with expression
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].name).toBe('AssignmentTest');
    expect(result.programs[0].variables).toHaveLength(3);
    // Assertions for parsed statements (now implemented)
    expect(result.programs[0].statements).toHaveLength(3);
    // Adjust line numbers based on the actual code input (lines start from 1, PROGRAM is line 2)
    expect(result.programs[0].statements[0]).toEqual({ type: 'assignment', targetVariable: 'a', sourceExpression: '10', lineNumber: 9 }); // Corrected: Line 9 in code block
    expect(result.programs[0].statements[1]).toEqual({ type: 'assignment', targetVariable: 'b', sourceExpression: 'TRUE', lineNumber: 10 }); // Corrected: Line 10 in code block
    expect(result.programs[0].statements[2]).toEqual({ type: 'assignment', targetVariable: 'c', sourceExpression: 'a * 2.5', lineNumber: 11 }); // Corrected: Line 11 in code block
  });

  // Test case 10: Program with a simple IF statement
  test('should parse a PROGRAM with a simple IF statement', () => {
    const code = `
      PROGRAM IfTest
        VAR
          condition : BOOL;
          result : INT;
        END_VAR

        IF condition THEN
          result := 1;
        END_IF;
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].name).toBe('IfTest');
    // Assertions for parsed statements (now implemented)
    expect(result.programs[0].statements).toHaveLength(1);
    const ifStmt = result.programs[0].statements[0] as PLCIfStatement;
    expect(ifStmt.type).toBe('if');
    expect(ifStmt.condition).toBe('condition');
    expect(ifStmt.thenStatements).toHaveLength(1);
    // Adjust line number based on the actual code input (lines start from 1, PROGRAM is line 2)
    expect(ifStmt.thenStatements[0]).toEqual({ type: 'assignment', targetVariable: 'result', sourceExpression: '1', lineNumber: 9 }); // Line 9 in code block
    expect(ifStmt.elseIfStatements).toBeUndefined();
    expect(ifStmt.elseStatements).toBeUndefined();
  });
// Test case 11: Program with IF/ELSIF/ELSE statement
  test('should parse a PROGRAM with IF/ELSIF/ELSE statement', () => {
    const code = `
      PROGRAM ComplexIfTest
        VAR
          status : INT;
          result : STRING;
        END_VAR

        IF status = 1 THEN
          result := 'OK';
        ELSIF status = 2 THEN
          result := 'Warning';
        ELSE
          result := 'Error';
        END_IF;
      END_PROGRAM
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.programs).toHaveLength(1);
    expect(result.programs[0].name).toBe('ComplexIfTest');
    expect(result.programs[0].statements).toHaveLength(1);

    const ifStmt = result.programs[0].statements[0] as PLCIfStatement;
    expect(ifStmt.type).toBe('if');
    expect(ifStmt.condition).toBe('status = 1');
    expect(ifStmt.lineNumber).toBe(8); // Line 8 in code block

    // Check THEN block
    expect(ifStmt.thenStatements).toHaveLength(1);
    expect(ifStmt.thenStatements[0]).toEqual({ type: 'assignment', targetVariable: 'result', sourceExpression: "'OK'", lineNumber: 9 });

    // Check ELSIF block
    expect(ifStmt.elseIfStatements).toBeDefined();
    expect(ifStmt.elseIfStatements).toHaveLength(1);
    expect(ifStmt.elseIfStatements![0].condition).toBe('status = 2');
    expect(ifStmt.elseIfStatements![0].statements).toHaveLength(1);
    expect(ifStmt.elseIfStatements![0].statements[0]).toEqual({ type: 'assignment', targetVariable: 'result', sourceExpression: "'Warning'", lineNumber: 11 });

    // Check ELSE block
    expect(ifStmt.elseStatements).toBeDefined();
    expect(ifStmt.elseStatements).toHaveLength(1);
    expect(ifStmt.elseStatements![0]).toEqual({ type: 'assignment', targetVariable: 'result', sourceExpression: "'Error'", lineNumber: 13 });
  });
// Test case 12: Function with simple assignment statements
  test('should parse a FUNCTION with simple assignment statements', () => {
    const code = `
      FUNCTION FuncAssignmentTest : INT
        VAR_INPUT
          inVal : INT;
        END_VAR
        VAR
          temp : INT;
        END_VAR

        temp := inVal * 2;
        FuncAssignmentTest := temp + 5; // Assign to function name for return value
      END_FUNCTION
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('FuncAssignmentTest');
    expect(result.functions[0].returnType).toBe('INT');
    expect(result.functions[0].parameters).toHaveLength(1); // VAR_INPUT
    expect(result.functions[0].localVariables).toHaveLength(1); // VAR
    expect(result.functions[0].statements).toHaveLength(2);
    expect(result.functions[0].statements[0]).toEqual({ type: 'assignment', targetVariable: 'temp', sourceExpression: 'inVal * 2', lineNumber: 10 }); // Corrected: Line 10
    expect(result.functions[0].statements[1]).toEqual({ type: 'assignment', targetVariable: 'FuncAssignmentTest', sourceExpression: 'temp + 5', lineNumber: 11 }); // Corrected: Line 11
  });

  // Test case 13: Function with IF/ELSIF/ELSE statement
  test('should parse a FUNCTION with IF/ELSIF/ELSE statement', () => {
    const code = `
      FUNCTION FuncIfTest : STRING
        VAR_INPUT
          status : INT;
        END_VAR

        IF status <= 0 THEN
          FuncIfTest := 'Invalid';
        ELSIF status = 1 THEN
          FuncIfTest := 'Running';
        ELSE
          FuncIfTest := 'Stopped';
        END_IF;
      END_FUNCTION
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functions).toHaveLength(1);
    expect(result.functions[0].name).toBe('FuncIfTest');
    expect(result.functions[0].returnType).toBe('STRING');
    expect(result.functions[0].statements).toHaveLength(1);

    const ifStmt = result.functions[0].statements[0] as PLCIfStatement;
    expect(ifStmt.type).toBe('if');
    expect(ifStmt.condition).toBe('status <= 0');
    expect(ifStmt.lineNumber).toBe(7); // Line 7 in code block

    // Check THEN block
    expect(ifStmt.thenStatements).toHaveLength(1);
    expect(ifStmt.thenStatements[0]).toEqual({ type: 'assignment', targetVariable: 'FuncIfTest', sourceExpression: "'Invalid'", lineNumber: 8 });

    // Check ELSIF block
    expect(ifStmt.elseIfStatements).toBeDefined();
    expect(ifStmt.elseIfStatements).toHaveLength(1);
    expect(ifStmt.elseIfStatements![0].condition).toBe('status = 1');
    expect(ifStmt.elseIfStatements![0].statements).toHaveLength(1);
    expect(ifStmt.elseIfStatements![0].statements[0]).toEqual({ type: 'assignment', targetVariable: 'FuncIfTest', sourceExpression: "'Running'", lineNumber: 10 });

    // Check ELSE block
    expect(ifStmt.elseStatements).toBeDefined();
    expect(ifStmt.elseStatements).toHaveLength(1);
    expect(ifStmt.elseStatements![0]).toEqual({ type: 'assignment', targetVariable: 'FuncIfTest', sourceExpression: "'Stopped'", lineNumber: 12 });
  });
// Test case 14: Function Block with Method containing statements
  test('should parse a FUNCTION_BLOCK with a METHOD containing statements', () => {
    const code = `
      FUNCTION_BLOCK FB_WithMethodStatements
        VAR_INPUT
          enable : BOOL;
        END_VAR
        VAR_OUTPUT
          outputVal : INT;
        END_VAR
        VAR
          internalCounter : INT := 0;
        END_VAR

        METHOD RunLogic : VOID
          VAR_TEMP
            tempCalc : INT;
          END_VAR

          IF enable THEN
            tempCalc := internalCounter * 2;
            internalCounter := internalCounter + 1;
            outputVal := tempCalc;
          ELSE
            outputVal := 0;
          END_IF;
        END_METHOD
      END_FUNCTION_BLOCK
    `;
    const result = parsePLCCode(code);
    expect(result.errors).toEqual([]);
    expect(result.functionBlocks).toHaveLength(1);
    const fb = result.functionBlocks[0];
    expect(fb.name).toBe('FB_WithMethodStatements');
    expect(fb.variables).toHaveLength(3); // enable, outputVal, internalCounter
    expect(fb.methods).toHaveLength(1);

    const method = fb.methods[0];
    expect(method.name).toBe('RunLogic');
    expect(method.returnType).toBe('VOID');
    expect(method.parameters).toEqual([]); // No explicit parameters in METHOD line
    expect(method.localVariables).toHaveLength(1); // tempCalc
    expect(method.localVariables[0].name).toBe('tempCalc');
    expect(method.localVariables[0].type).toBe('INT');
    expect(method.localVariables[0].scope).toBe('VAR_TEMP');

    // Check statements within the method
    expect(method.statements).toHaveLength(1);
    const ifStmt = method.statements[0] as PLCIfStatement;
    expect(ifStmt.type).toBe('if');
    expect(ifStmt.condition).toBe('enable');
    expect(ifStmt.lineNumber).toBe(18); // Corrected: Line 18 in code block

    // Check THEN block
    expect(ifStmt.thenStatements).toHaveLength(3);
    expect(ifStmt.thenStatements[0]).toEqual({ type: 'assignment', targetVariable: 'tempCalc', sourceExpression: 'internalCounter * 2', lineNumber: 19 }); // Corrected: Line 19
    expect(ifStmt.thenStatements[1]).toEqual({ type: 'assignment', targetVariable: 'internalCounter', sourceExpression: 'internalCounter + 1', lineNumber: 20 }); // Corrected: Line 20
    expect(ifStmt.thenStatements[2]).toEqual({ type: 'assignment', targetVariable: 'outputVal', sourceExpression: 'tempCalc', lineNumber: 21 }); // Corrected: Line 21

    // Check ELSE block
    expect(ifStmt.elseIfStatements).toBeUndefined();
    expect(ifStmt.elseStatements).toBeDefined();
    expect(ifStmt.elseStatements).toHaveLength(1);
    expect(ifStmt.elseStatements![0]).toEqual({ type: 'assignment', targetVariable: 'outputVal', sourceExpression: '0', lineNumber: 23 }); // Corrected: Line 23
  });