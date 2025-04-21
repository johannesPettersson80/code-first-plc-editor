
import { PLCFunctionBlock, PLCMethod, PLCProperty, PLCVariable, ParseError, ParserResult } from "../types/plc";

export function parsePLCCode(code: string): ParserResult {
  const lines = code.split('\n');
  const result: ParserResult = {
    functionBlocks: [],
    errors: []
  };
  
  // Track current parsing state
  let currentFunctionBlock: PLCFunctionBlock | null = null;
  let currentMethod: PLCMethod | null = null;
  let currentProperty: PLCProperty | null = null;
  let currentVarSection: PLCVariable['scope'] | null = null;
  let bracketDepth = 0;
  let inImplementation = false;
  let implementationBuffer = '';

  // Regular expressions for parsing
  const fbRegex = /FUNCTION_BLOCK\s+([A-Za-z][A-Za-z0-9_]*)/;
  const methodRegex = /METHOD\s+([A-Za-z][A-Za-z0-9_]*)\s*(?:\(\s*(.*)\s*\))?\s*:\s*([A-Za-z][A-Za-z0-9_]*)/;
  const propertyRegex = /PROPERTY\s+([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)/;
  const getSetRegex = /(GET|SET)/;
  const varSectionRegex = /(VAR|VAR_INPUT|VAR_OUTPUT|VAR_IN_OUT|VAR_TEMP)/;
  const endVarRegex = /END_VAR/;
  const varDeclarationRegex = /\s*([A-Za-z][A-Za-z0-9_]*)\s*:\s*([A-Za-z][A-Za-z0-9_]*)\s*(?::=\s*(.+?))?\s*;(?:\s*\/\/\s*(.*))?/;
  const endFunctionBlockRegex = /END_FUNCTION_BLOCK/;
  const endMethodRegex = /END_METHOD/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    
    try {
      // Check for function block declaration
      const fbMatch = line.match(fbRegex);
      if (fbMatch) {
        if (currentFunctionBlock) {
          result.errors.push({
            message: 'Nested function block declaration',
            lineNumber
          });
          continue;
        }
        
        currentFunctionBlock = {
          name: fbMatch[1],
          variables: [],
          methods: [],
          properties: [],
          lineNumber
        };
        
        result.functionBlocks.push(currentFunctionBlock);
        continue;
      }
      
      // Check for method declaration
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
          lineNumber
        };
        
        currentFunctionBlock.methods.push(currentMethod);
        continue;
      }
      
      // Check for property declaration
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
          lineNumber
        };
        
        currentFunctionBlock.properties.push(currentProperty);
        continue;
      }
      
      // Check for GET/SET in property
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
      if (varSectionMatch && currentFunctionBlock) {
        currentVarSection = varSectionMatch[1] as PLCVariable['scope'];
        continue;
      }
      
      // Check for end of variable section
      if (line.match(endVarRegex)) {
        currentVarSection = null;
        continue;
      }
      
      // Parse variable declarations
      if (currentVarSection && currentFunctionBlock) {
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
          
          if (currentMethod && currentVarSection === 'VAR_TEMP') {
            currentMethod.localVariables.push(variable);
          } else {
            currentFunctionBlock.variables.push(variable);
          }
          
          continue;
        }
      }
      
      // Track implementation code
      if (currentMethod || (currentProperty && (currentProperty.hasGetter || currentProperty.hasSetter))) {
        // Count brackets for implementation blocks
        const openBrackets = (line.match(/\{/g) || []).length;
        const closeBrackets = (line.match(/\}/g) || []).length;
        bracketDepth += openBrackets - closeBrackets;
        
        if (!inImplementation && bracketDepth > 0) {
          inImplementation = true;
        }
        
        if (inImplementation) {
          implementationBuffer += line + '\n';
        }
        
        if (inImplementation && bracketDepth === 0) {
          if (currentMethod) {
            currentMethod.implementation = implementationBuffer;
            currentMethod = null;
          } else if (currentProperty) {
            currentProperty.implementation += implementationBuffer;
          }
          
          implementationBuffer = '';
          inImplementation = false;
        }
      }
      
      // Check for end of method
      if (line.match(endMethodRegex) && currentMethod) {
        // For methods without implementation blocks
        if (!inImplementation && currentMethod) {
          currentMethod = null;
        }
        continue;
      }
      
      // Check for end of function block
      if (line.match(endFunctionBlockRegex)) {
        currentFunctionBlock = null;
        currentMethod = null;
        currentProperty = null;
        currentVarSection = null;
        continue;
      }
    } catch (error) {
      result.errors.push({
        message: `Parser error: ${error}`,
        lineNumber
      });
    }
  }
  
  // Add error if we have an unclosed function block
  if (currentFunctionBlock) {
    result.errors.push({
      message: 'Unclosed function block: ' + currentFunctionBlock.name,
      lineNumber: currentFunctionBlock.lineNumber
    });
  }
  
  return result;
}

function parseParameters(paramString: string): PLCVariable[] {
  if (!paramString) return [];
  
  const params = paramString.split(',');
  return params.map(param => {
    const parts = param.trim().split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid parameter format: ${param}`);
    }
    
    return {
      name: parts[0].trim(),
      type: parts[1].trim(),
      scope: 'VAR_INPUT'
    };
  });
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
    
    xml += '      </interface>\n';
    
    // Implementation in structured text
    xml += '      <body>\n';
    xml += '        <ST>\n';
    xml += '          <xhtml xmlns="http://www.w3.org/1999/xhtml">\n';
    
    // Add methods and properties implementations
    fb.methods.forEach(method => {
      xml += `          <p>METHOD ${method.name}: ${method.returnType}</p>\n`;
      xml += `          <p>${method.implementation}</p>\n`;
      xml += `          <p>END_METHOD</p>\n\n`;
    });
    
    fb.properties.forEach(prop => {
      xml += `          <p>PROPERTY ${prop.name}: ${prop.type}</p>\n`;
      xml += `          <p>${prop.implementation}</p>\n`;
      xml += `          <p>END_PROPERTY</p>\n\n`;
    });
    
    xml += '          </xhtml>\n';
    xml += '        </ST>\n';
    xml += '      </body>\n';
    xml += '    </pou>\n';
  });
  
  xml += '  </types>\n';
  xml += '</project>';
  
  return xml;
}
