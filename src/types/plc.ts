
// PLC Editor Types

export interface PLCVariable {
  name: string;
  type: string;
  initialValue?: string;
  scope: 'VAR' | 'VAR_INPUT' | 'VAR_OUTPUT' | 'VAR_IN_OUT' | 'VAR_TEMP';
  comment?: string;
}

export interface PLCMethod {
  name: string;
  returnType: string;
  parameters: PLCVariable[];
  localVariables: PLCVariable[];
  implementation: string; // Keep raw implementation for now
  statements?: PLCStatement[]; // Add parsed statements
  lineNumber: number;
}

// --- Statement Types ---
export interface PLCAssignmentStatement {
  type: 'assignment';
  targetVariable: string;
  sourceExpression: string;
  lineNumber: number;
}

export interface PLCIfStatement {
  type: 'if';
  condition: string;
  thenStatements: PLCStatement[];
  elseIfStatements?: { condition: string; statements: PLCStatement[] }[]; // Optional for ELSIF
  elseStatements?: PLCStatement[]; // Optional for ELSE
  lineNumber: number; // Line number of the IF keyword
}

// Add other statement types here later (CASE, FOR, WHILE, etc.)

export type PLCStatement = PLCAssignmentStatement | PLCIfStatement;
// --- End Statement Types ---


export interface PLCProperty {
  name: string;
  type: string;
  hasGetter: boolean;
  hasSetter: boolean;
  implementation: string; // Keep raw implementation for now
  statements?: PLCStatement[]; // Add parsed statements
  lineNumber: number;
}

export interface PLCFunctionBlock {
  name: string;
  variables: PLCVariable[];
  methods: PLCMethod[];
  properties: PLCProperty[];
  // statements?: PLCStatement[]; // Future: FB body statements
  lineNumber: number;
}

export interface PLCProgram {
  name: string;
  variables: PLCVariable[];
  // statements?: PLCStatement[]; // Future: Program body statements
  lineNumber: number;
}

export interface PLCFunction {
  name: string;
  returnType: string;
  parameters: PLCVariable[]; // Function parameters are like VAR_INPUT
  localVariables: PLCVariable[]; // VAR_TEMP within function
  // statements?: PLCStatement[]; // Future: Function body statements
  lineNumber: number;
}


export interface ParseError {
  message: string;
  lineNumber: number;
  columnStart?: number;
  columnEnd?: number;
}

export interface ParserResult {
  functionBlocks: PLCFunctionBlock[];
  programs: PLCProgram[]; // Add programs array
  functions: PLCFunction[]; // Add functions array
  errors: ParseError[];
}
