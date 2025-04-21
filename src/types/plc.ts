
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
  implementation: string;
  lineNumber: number;
}

export interface PLCProperty {
  name: string;
  type: string;
  hasGetter: boolean;
  hasSetter: boolean;
  implementation: string;
  lineNumber: number;
}

export interface PLCFunctionBlock {
  name: string;
  variables: PLCVariable[];
  methods: PLCMethod[];
  properties: PLCProperty[];
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
  errors: ParseError[];
}
