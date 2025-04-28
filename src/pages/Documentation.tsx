
import { useNavigate } from 'react-router-dom';
import { Book, Code, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const Documentation = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-2">PLC Code-First Documentation</h1>
          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Beta
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow p-6 overflow-auto">
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="getting-started" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
              <TabsTrigger value="syntax">PLC Syntax</TabsTrigger>
              <TabsTrigger value="examples">Examples</TabsTrigger>
              <TabsTrigger value="api">API Reference</TabsTrigger>
            </TabsList>
            
            <TabsContent value="getting-started">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">Getting Started with PLC Code-First</h2>
                <p className="mb-4">
                  Welcome to the PLC Code-First Editor, a modern web-based development environment for 
                  programming Programmable Logic Controllers using a code-first approach.
                </p>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">Key Features</h3>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Write PLC structured text with modern syntax highlighting</li>
                  <li>Auto-parsing of function blocks, methods, and properties</li>
                  <li>Code structure visualization</li>
                  <li>Export to PLCopen XML format</li>
                  <li>Code templates for quick starts</li>
                </ul>
                
                <h3 className="text-xl font-semibold mt-6 mb-3">First Steps</h3>
                <ol className="list-decimal pl-6 space-y-2">
                  <li>Create a new PLC program or open an existing one</li>
                  <li>Define your function blocks, variables, methods and properties</li>
                  <li>Use the code structure panel to navigate between elements</li>
                  <li>Save your work and export when ready</li>
                </ol>
                
                <Button onClick={() => navigate('/')} className="mt-6">
                  <Code className="mr-2 h-4 w-4" />
                  Open Editor
                </Button>
              </Card>
            </TabsContent>
            
            <TabsContent value="syntax">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">PLC Structured Text Syntax</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-2">Function Blocks</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  {`FUNCTION_BLOCK BlockName
VAR_INPUT
    // Input variables
END_VAR

VAR_OUTPUT
    // Output variables
END_VAR

VAR
    // Local variables
END_VAR

// Methods and implementation

END_FUNCTION_BLOCK`}
                </pre>
                
                <h3 className="text-xl font-semibold mt-6 mb-2">Methods</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  {`METHOD MethodName : ReturnType
VAR_INPUT
    // Method parameters
END_VAR
{
    // Method implementation
    // Return statement for non-void methods
}
`}
                </pre>
                
                <h3 className="text-xl font-semibold mt-6 mb-2">Properties</h3>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  {`PROPERTY PropertyName : DataType
GET 
{
    // Getter implementation
    RETURN Value;
}
SET 
{
    // Setter implementation
    // Use 'PropertyName' to refer to the input value
}
END_PROPERTY`}
                </pre>
                
                <h3 className="text-xl font-semibold mt-6 mb-2">Data Types</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Boolean</h4>
                    <p className="text-sm text-muted-foreground">BOOL</p>
                  </div>
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Integers</h4>
                    <p className="text-sm text-muted-foreground">SINT, INT, DINT, LINT</p>
                  </div>
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Unsigned Integers</h4>
                    <p className="text-sm text-muted-foreground">USINT, UINT, UDINT, ULINT</p>
                  </div>
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Floating Point</h4>
                    <p className="text-sm text-muted-foreground">REAL, LREAL</p>
                  </div>
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Time Related</h4>
                    <p className="text-sm text-muted-foreground">TIME, DATE, TOD, DT</p>
                  </div>
                  <div className="bg-card border rounded-md p-3">
                    <h4 className="font-semibold">Strings</h4>
                    <p className="text-sm text-muted-foreground">STRING, WSTRING</p>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="examples">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">PLC Code Examples</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Simple Motor Controller</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      {`FUNCTION_BLOCK MotorController
VAR_INPUT
    Enable : BOOL;
    SetSpeed : REAL;
END_VAR

VAR_OUTPUT
    Running : BOOL;
    ActualSpeed : REAL;
END_VAR

METHOD UpdateSpeed : BOOL
{
    IF NOT Enable THEN
        Running := FALSE;
        ActualSpeed := 0.0;
        RETURN TRUE;
    END_IF;
    
    ActualSpeed := SetSpeed;
    Running := TRUE;
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`}
                    </pre>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Temperature Controller</h3>
                    <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                      {`FUNCTION_BLOCK TemperatureController
VAR_INPUT
    Enable : BOOL;
    SetPoint : REAL;
    CurrentTemp : REAL;
END_VAR

VAR_OUTPUT
    HeatingOutput : REAL;
    CoolingOutput : REAL;
    InRegulation : BOOL;
END_VAR

VAR
    Kp : REAL := 1.0;  // Proportional gain
    Ti : REAL := 10.0; // Integral time
    Td : REAL := 1.0;  // Derivative time
    Error : REAL;
    PrevError : REAL;
    ErrorSum : REAL;
END_VAR

METHOD Calculate : BOOL
{
    IF NOT Enable THEN
        HeatingOutput := 0.0;
        CoolingOutput := 0.0;
        InRegulation := FALSE;
        RETURN TRUE;
    END_IF;
    
    Error := SetPoint - CurrentTemp;
    ErrorSum := ErrorSum + Error;
    
    // PID calculation
    HeatingOutput := Kp * (Error + ErrorSum / Ti + Td * (Error - PrevError));
    
    IF HeatingOutput < 0.0 THEN
        CoolingOutput := -HeatingOutput;
        HeatingOutput := 0.0;
    ELSE
        CoolingOutput := 0.0;
    END_IF;
    
    // Limit outputs
    IF HeatingOutput > 100.0 THEN HeatingOutput := 100.0; END_IF;
    IF CoolingOutput > 100.0 THEN CoolingOutput := 100.0; END_IF;
    
    InRegulation := ABS(Error) < 1.0;
    PrevError := Error;
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`}
                    </pre>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            <TabsContent value="api">
              <Card className="p-6">
                <h2 className="text-2xl font-bold mb-4">API Reference</h2>
                
                <h3 className="text-xl font-semibold mt-4 mb-2">PLCopen XML Export</h3>
                <p className="mb-4">
                  The editor can export your PLC code to PLCopen XML format, which is compatible
                  with many industrial automation platforms.
                </p>
                
                <h4 className="text-lg font-semibold mt-4 mb-2">XML Structure</h4>
                <pre className="bg-muted p-4 rounded-md overflow-x-auto">
                  {`<project xmlns="http://www.plcopen.org/xml/tc6_0200">
  <fileHeader />
  <contentHeader>
    <coordinateInfo>
      <fbd><scaling x="0" y="0" /></fbd>
      <ld><scaling x="0" y="0" /></ld>
      <sfc><scaling x="0" y="0" /></sfc>
    </coordinateInfo>
  </contentHeader>
  <types>
    <pous>
      <pou name="[FunctionBlockName]" pouType="functionBlock">
        <!-- Variables, methods, etc. -->
      </pou>
    </pous>
  </types>
</project>`}
                </pre>
                
                <h3 className="text-xl font-semibold mt-6 mb-2">Editor API</h3>
                <p className="mb-4">
                  The editor provides a JavaScript API for advanced customization and integration.
                </p>
                
                <div className="space-y-4">
                  <div className="bg-card border rounded-md p-4">
                    <h4 className="font-semibold">parsePLCCode(code: string): ParserResult</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Parses PLC structured text code and returns function blocks, methods, properties, and any errors.
                    </p>
                  </div>
                  
                  <div className="bg-card border rounded-md p-4">
                    <h4 className="font-semibold">generatePLCopenXML(parserResult: ParserResult): string</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Converts parsed PLC code structure into PLCopen XML format.
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer */}
      <footer className="p-2 border-t bg-card text-center text-sm text-muted-foreground">
        <p>PLC Code-First Editor Documentation - Version 1.0 Beta</p>
      </footer>
    </div>
  );
};

export default Documentation;
