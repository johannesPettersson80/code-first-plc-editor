import { describe, it, expect } from 'vitest';
import { parsePLCCode } from '../../src/utils/plcParser';
import { generatePLCopenXML } from '../../src/utils/plcParser'; // Assuming generatePLCopenXML is exported

describe('Integration: PLCopen XML Export', () => {
  it('should correctly export a simple Function Block to PLCopen XML', () => {
    const code = `
FUNCTION_BLOCK SimpleFB
  VAR_INPUT
    Enable : BOOL;
  END_VAR
  VAR_OUTPUT
    Status : INT;
  END_VAR
  VAR
    InternalCounter : DINT := 0; // A counter
  END_VAR

  // Implementation would go here, but not needed for interface export test
  IF Enable THEN
    InternalCounter := InternalCounter + 1;
    Status := InternalCounter;
  ELSE
    Status := 0;
  END_IF;

END_FUNCTION_BLOCK
    `;

    const parseResult = parsePLCCode(code);
    expect(parseResult.errors).toEqual([]); // Ensure no parsing errors

    const xmlOutput = generatePLCopenXML(parseResult);

    // Basic XML structure checks
    expect(xmlOutput).toContain('<?xml version="1.0" encoding="utf-8"?>');
    expect(xmlOutput).toContain('<project xmlns="http://www.plcopen.org/xml/tc6_0201">');
    expect(xmlOutput).toContain('<pou name="SimpleFB" pouType="functionBlock">');
    expect(xmlOutput).toContain('</pou>');
    expect(xmlOutput).toContain('</project>');

    // Check interface variables
    expect(xmlOutput).toContain('<inputVars>');
    expect(xmlOutput).toContain('<variable name="Enable">');
    expect(xmlOutput).toContain('<type>BOOL</type>');
    expect(xmlOutput).toContain('</inputVars>');

    expect(xmlOutput).toContain('<outputVars>');
    expect(xmlOutput).toContain('<variable name="Status">');
    expect(xmlOutput).toContain('<type>INT</type>');
    expect(xmlOutput).toContain('</outputVars>');

    expect(xmlOutput).toContain('<localVars>');
    expect(xmlOutput).toContain('<variable name="InternalCounter">');
    expect(xmlOutput).toContain('<type>DINT</type>');
    expect(xmlOutput).toContain('<initialValue>0</initialValue>');
    expect(xmlOutput).toContain('<documentation>A counter</documentation>');
    expect(xmlOutput).toContain('</localVars>');

    // Check body ST content using regex to handle whitespace and capture CDATA
    const bodyRegex = /<body>\s*<ST>\s*<xhtml[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/xhtml>\s*<\/ST>\s*<\/body>/;
    const bodyMatch = xmlOutput.match(bodyRegex);

    console.log("Generated XML Output:\n", xmlOutput); // Add console log here
    expect(bodyMatch).not.toBeNull(); // Ensure the overall structure exists

    const expectedSTBody = `
IF Enable THEN
  InternalCounter := InternalCounter + 1;
  Status := InternalCounter;
ELSE
  Status := 0;
END_IF;
          `.trim(); // Trim leading/trailing whitespace for comparison

    // Extract and normalize the captured CDATA content
    const actualSTBody = bodyMatch ? bodyMatch[1].trim() : '';

    expect(actualSTBody).toEqual(expectedSTBody); // Compare the trimmed content
  });

  // Add more integration tests for export (Programs, Functions, complex structures)
});