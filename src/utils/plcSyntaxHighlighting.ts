
// Monaco editor language definition for IEC 61131-3 Structured Text

export const configurePLCSyntaxHighlighting = (monaco: any) => {
  // Register a new language
  monaco.languages.register({ id: 'plcStructuredText' });

  // Register a tokens provider for the language
  monaco.languages.setMonarchTokensProvider('plcStructuredText', {
    // Set defaultToken to invalid to see what you do not tokenize yet
    defaultToken: 'invalid',

    keywords: [
      'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK', 'METHOD', 'END_METHOD',
      'PROPERTY', 'END_PROPERTY', 'GET', 'SET',
      'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_TEMP', 'END_VAR',
      'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
      'CASE', 'OF', 'END_CASE',
      'FOR', 'TO', 'BY', 'DO', 'END_FOR',
      'WHILE', 'DO', 'END_WHILE',
      'REPEAT', 'UNTIL', 'END_REPEAT',
      'CONTINUE', 'EXIT', 'RETURN',
      'TRUE', 'FALSE', 'NOT', 'AND', 'OR', 'XOR'
    ],

    typeKeywords: [
      'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD',
      'SINT', 'INT', 'DINT', 'LINT',
      'USINT', 'UINT', 'UDINT', 'ULINT',
      'REAL', 'LREAL', 'TIME', 'DATE', 'TOD', 'DT',
      'STRING', 'WSTRING', 'ARRAY', 'STRUCT', 'END_STRUCT'
    ],

    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||', '++', '--',
      '+', '-', '*', '/', '&', '|', '^', '%', '<<',
      '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=',
      '^=', '%=', '<<=', '>>=', '>>>='
    ],

    // we include these common regular expressions
    symbols: /[=><!~?:&|+\-*\/\^%]+/,

    // C# style strings
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    // The main tokenizer for our languages
    tokenizer: {
      root: [
        // identifiers and keywords
        [/[a-z_$][\w$]*/, {
          cases: {
            '@keywords': 'keyword',
            '@typeKeywords': 'type',
            '@default': 'identifier'
          }
        }],

        // whitespace
        { include: '@whitespace' },

        // delimiters and operators
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, {
          cases: {
            '@operators': 'operator',
            '@default': ''
          }
        }],

        // numbers
        [/\d*\.\d+([eE][-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],

        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
        [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
        [/"/, 'string', '@string_double'],
        [/'/, 'string', '@string_single'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        [/\/\*/, 'comment', '@push'],
        ["\\*/", 'comment', '@pop'],
        [/[/*]/, 'comment']
      ],

      string_double: [
        [/[^\\"]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, 'string', '@pop']
      ],

      string_single: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop']
      ],
    },
  });

  // Define a new theme that contains only rules that match this language
  monaco.editor.defineTheme('plcEditorTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
      { token: 'type', foreground: '008000' },
      { token: 'comment', foreground: '008800', fontStyle: 'italic' },
      { token: 'string', foreground: 'A31515' },
      { token: 'identifier', foreground: '000000' },
      { token: 'number', foreground: '098658' },
      { token: 'delimiter', foreground: '000000' },
      { token: 'operator', foreground: '000000' },
    ],
    colors: {
      'editor.foreground': '#000000',
      'editor.background': '#FFFFFF',
      'editor.selectionBackground': '#ADD6FF',
      'editor.lineHighlightBackground': '#F0F0F0',
      'editorCursor.foreground': '#000000',
      'editorWhitespace.foreground': '#BFBFBF'
    }
  });
  
  // Define dark theme
  monaco.editor.defineTheme('plcEditorDarkTheme', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
      { token: 'type', foreground: '4EC9B0' },
      { token: 'comment', foreground: '608B4E', fontStyle: 'italic' },
      { token: 'string', foreground: 'CE9178' },
      { token: 'identifier', foreground: '9CDCFE' },
      { token: 'number', foreground: 'B5CEA8' },
      { token: 'delimiter', foreground: 'CCCCCC' },
      { token: 'operator', foreground: 'D4D4D4' },
    ],
    colors: {
      'editor.foreground': '#D4D4D4',
      'editor.background': '#1E1E1E',
      'editor.selectionBackground': '#264F78',
      'editor.lineHighlightBackground': '#2D2D30',
      'editorCursor.foreground': '#AEAFAD',
      'editorWhitespace.foreground': '#3B3B3B'
    }
  });
};

export const getDefaultPLCCode = (): string => {
  return `FUNCTION_BLOCK MotorController
VAR_INPUT
    Enable : BOOL; // Enable the motor
    SetSpeed : REAL; // Target speed in RPM
END_VAR

VAR_OUTPUT
    Running : BOOL; // Motor running status
    ActualSpeed : REAL; // Current speed in RPM
    Error : BOOL; // Error status
END_VAR

VAR
    SpeedRamp : REAL := 0.0; // Internal speed ramp
    MaxAcceleration : REAL := 50.0; // Maximum allowed acceleration RPM/s
    ErrorCode : INT := 0; // Detailed error code
END_VAR

METHOD Initialize : BOOL
VAR_INPUT
    MaxSpeed : REAL; // Maximum speed setting
END_VAR
VAR_TEMP
    Success : BOOL;
END_VAR
{
    // Initialize the motor controller
    IF MaxSpeed > 0.0 THEN
        THIS.MaxAcceleration := MaxSpeed / 10.0;
        Success := TRUE;
    ELSE
        ErrorCode := 1; // Invalid max speed
        Success := FALSE;
    END_IF;
    
    RETURN Success;
}

PROPERTY CurrentError : INT
GET 
{
    RETURN ErrorCode;
}
END_PROPERTY

PROPERTY Acceleration : REAL
GET 
{
    RETURN MaxAcceleration;
}
SET 
{
    IF Acceleration > 0.0 THEN
        MaxAcceleration := Acceleration;
    END_IF;
}
END_PROPERTY

METHOD UpdateSpeed : BOOL
{
    IF NOT Enable THEN
        // Decelerate to stop if disabled
        IF SpeedRamp > 0.0 THEN
            SpeedRamp := SpeedRamp - MaxAcceleration;
            IF SpeedRamp < 0.0 THEN
                SpeedRamp := 0.0;
            END_IF;
        END_IF;
        
        Running := FALSE;
        RETURN TRUE;
    END_IF;
    
    // Handle speed changes
    IF SpeedRamp < SetSpeed THEN
        SpeedRamp := SpeedRamp + MaxAcceleration;
        IF SpeedRamp > SetSpeed THEN
            SpeedRamp := SetSpeed;
        END_IF;
    ELSIF SpeedRamp > SetSpeed THEN
        SpeedRamp := SpeedRamp - MaxAcceleration;
        IF SpeedRamp < SetSpeed THEN
            SpeedRamp := SetSpeed;
        END_IF;
    END_IF;
    
    ActualSpeed := SpeedRamp;
    Running := (ActualSpeed > 0.0);
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`;
};
