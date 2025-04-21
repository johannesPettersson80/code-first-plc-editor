
import { useState, useEffect, useRef } from "react";
import { editor } from "monaco-editor";
import { configurePLCSyntaxHighlighting, getDefaultPLCCode } from "../utils/plcSyntaxHighlighting";
import { parsePLCCode, generatePLCopenXML } from "../utils/plcParser";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PLCFunctionBlock, PLCMethod, PLCProperty, PLCVariable, ParseError, ParserResult } from "../types/plc";
import { usePLCCode } from "@/hooks/usePLCCode";
import { useAuthStore } from "@/stores/auth";

interface PLCEditorProps {
  darkMode: boolean;
}

const PLCEditor = ({ darkMode }: PLCEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [parserResult, setParserResult] = useState<ParserResult>({
    functionBlocks: [],
    errors: []
  });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);
  
  // Load stored code or default code
  const getInitialCode = () => {
    const storedCode = localStorage.getItem("plcEditorCode");
    return storedCode || getDefaultPLCCode();
  };
  
  const [code, setCode] = useState<string>(getInitialCode());
  const [xmlOutput, setXmlOutput] = useState<string>("");
  const [errorListVisible, setErrorListVisible] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("Untitled");
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);
  const { plcCodes, savePLCCode, updatePLCCode, isLoading } = usePLCCode();
  const user = useAuthStore((state) => state.user);

  // Function to create or recreate the editor
  const createOrUpdateEditor = () => {
    if (!editorRef.current) return;
    
    // Clean up existing editor if it exists
    if (monacoEditorRef.current) {
      monacoEditorRef.current.dispose();
      monacoEditorRef.current = null;
    }

    // Import Monaco editor dynamically
    import("monaco-editor").then((monaco) => {
      // Configure syntax highlighting
      configurePLCSyntaxHighlighting(monaco);
      
      // Create editor
      if (!monacoEditorRef.current && editorRef.current) {
        monacoEditorRef.current = monaco.editor.create(editorRef.current, {
          value: code,
          language: "plcStructuredText",
          theme: darkMode ? "plcEditorDarkTheme" : "plcEditorTheme",
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          fontSize: 14,
          lineNumbers: "on",
          wordWrap: "on",
          tabSize: 2,
        });

        // Listen for changes
        monacoEditorRef.current.onDidChangeModelContent(() => {
          const newCode = monacoEditorRef.current?.getValue() || "";
          setCode(newCode);
          localStorage.setItem("plcEditorCode", newCode);
          
          const result = parsePLCCode(newCode);
          setParserResult(result);
        });
      }
    });
  };

  // Create editor on component mount
  useEffect(() => {
    createOrUpdateEditor();
    
    return () => {
      // Cleanup on unmount
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
    };
  }, []); // Empty dependency array for mount/unmount only
  
  // Handle theme changes by recreating the editor
  useEffect(() => {
    createOrUpdateEditor();
    
    // Initial parse
    const result = parsePLCCode(code);
    setParserResult(result);
  }, [darkMode]);
  
  // Navigate to element when clicked in the tree
  const navigateToElement = (lineNumber: number) => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.revealLineInCenter(lineNumber);
      monacoEditorRef.current.setPosition({ lineNumber, column: 1 });
      monacoEditorRef.current.focus();
    }
  };
  
  // Export PLCopen XML
  const handleExportXml = () => {
    const xml = generatePLCopenXML(parserResult);
    setXmlOutput(xml);
    
    // Create and download XML file
    const blob = new Blob([xml], { type: "text/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plc_export.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Insert template code
  const insertTemplate = (template: string) => {
    if (monacoEditorRef.current) {
      const currentPosition = monacoEditorRef.current.getPosition();
      if (currentPosition) {
        monacoEditorRef.current.executeEdits("", [
          {
            range: {
              startLineNumber: currentPosition.lineNumber,
              startColumn: currentPosition.column,
              endLineNumber: currentPosition.lineNumber,
              endColumn: currentPosition.column,
            },
            text: template,
            forceMoveMarkers: true,
          },
        ]);
        monacoEditorRef.current.focus();
      }
    }
  };
  
  // Template code snippets
  const templates = {
    functionBlock: "FUNCTION_BLOCK TemplateFB\nVAR_INPUT\n  \nEND_VAR\n\nVAR_OUTPUT\n  \nEND_VAR\n\nVAR\n  \nEND_VAR\n\n\nEND_FUNCTION_BLOCK",
    method: "METHOD TemplateMethod : BOOL\nVAR_INPUT\n  \nEND_VAR\nVAR_TEMP\n  \nEND_VAR\n{\n  \n  RETURN TRUE;\n}",
    property: "PROPERTY TemplateProperty : INT\nGET \n{\n  \n}\nSET \n{\n  \n}\nEND_PROPERTY",
    getProperty: "PROPERTY TemplateGetProperty : INT\nGET \n{\n  \n}\nEND_PROPERTY",
  };

  // Handle save/update
  const handleSave = async () => {
    if (!user) return;
    
    const currentCode = monacoEditorRef.current?.getValue() || "";
    
    if (activeCodeId) {
      updatePLCCode.mutate({ id: activeCodeId, code: currentCode, title });
    } else {
      savePLCCode.mutate({ code: currentCode, title });
    }
  };

  // Load saved code
  const loadCode = (codeEntry: { id: string; code: string; title: string }) => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(codeEntry.code);
      setTitle(codeEntry.title);
      setActiveCodeId(codeEntry.id);
      setCode(codeEntry.code);
      
      // Parse the loaded code
      const result = parsePLCCode(codeEntry.code);
      setParserResult(result);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Toolbar */}
      <div className="flex justify-between items-center p-2 bg-secondary border-b">
        <div className="flex items-center space-x-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-48"
            placeholder="Enter title"
          />
          <Button variant="outline" size="sm" onClick={handleSave}>
            {activeCodeId ? 'Update' : 'Save'}
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => insertTemplate(templates.functionBlock)}>
            + Function Block
          </Button>
          <Button variant="outline" size="sm" onClick={() => insertTemplate(templates.method)}>
            + Method
          </Button>
          <Button variant="outline" size="sm" onClick={() => insertTemplate(templates.property)}>
            + Property
          </Button>
          <Button variant="outline" size="sm" onClick={() => insertTemplate(templates.getProperty)}>
            + Get Property
          </Button>
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant={errorListVisible ? "default" : "outline"} 
            size="sm"
            onClick={() => setErrorListVisible(!errorListVisible)}
          >
            Errors ({parserResult.errors.length})
          </Button>
          <Button variant="default" size="sm" onClick={handleExportXml}>
            Export XML
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Saved Code List */}
        <div className="w-1/4 bg-background border-r overflow-auto p-2">
          <div className="mb-4">
            <h2 className="font-semibold mb-2">Saved Code</h2>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-2">
                {plcCodes?.map((codeEntry) => (
                  <div
                    key={codeEntry.id}
                    className={`p-2 rounded cursor-pointer hover:bg-secondary ${
                      activeCodeId === codeEntry.id ? 'bg-secondary' : ''
                    }`}
                    onClick={() => loadCode(codeEntry)}
                  >
                    <div className="font-medium">{codeEntry.title}</div>
                    <div className="text-xs text-muted-foreground">
                      Last updated: {new Date(codeEntry.updated_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <h2 className="font-semibold mb-2">Structure</h2>
          
          {parserResult.functionBlocks.map((fb, fbIndex) => (
            <div key={fbIndex} className="mb-4">
              <div 
                className={`flex items-center p-1 rounded cursor-pointer hover:bg-secondary ${selectedNode?.type === 'fb' && selectedNode?.index === fbIndex ? 'bg-secondary' : ''}`}
                onClick={() => {
                  setSelectedNode({ type: 'fb', index: fbIndex });
                  navigateToElement(fb.lineNumber);
                }}
              >
                <span className="font-medium">FB: {fb.name}</span>
              </div>
              
              {/* Variables */}
              <div className="ml-4 mt-1">
                <div className="text-sm font-medium text-muted-foreground">Variables</div>
                <div className="ml-2">
                  {fb.variables.map((v, vIndex) => (
                    <div 
                      key={vIndex}
                      className="text-sm cursor-pointer hover:bg-secondary rounded p-1"
                      onClick={() => setSelectedNode({ type: 'var', fbIndex, varIndex: vIndex })}
                    >
                      <span className="text-xs text-muted-foreground">{v.scope}: </span> 
                      {v.name}: {v.type}
                      {v.initialValue && <span className="text-xs text-muted-foreground"> := {v.initialValue}</span>}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Methods */}
              {fb.methods.length > 0 && (
                <div className="ml-4 mt-2">
                  <div className="text-sm font-medium text-muted-foreground">Methods</div>
                  <div className="ml-2">
                    {fb.methods.map((method, methodIndex) => (
                      <div 
                        key={methodIndex}
                        className={`text-sm cursor-pointer hover:bg-secondary rounded p-1 ${selectedNode?.type === 'method' && selectedNode?.fbIndex === fbIndex && selectedNode?.methodIndex === methodIndex ? 'bg-secondary' : ''}`}
                        onClick={() => {
                          setSelectedNode({ type: 'method', fbIndex, methodIndex });
                          navigateToElement(method.lineNumber);
                        }}
                      >
                        {method.name}: {method.returnType}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Properties */}
              {fb.properties.length > 0 && (
                <div className="ml-4 mt-2">
                  <div className="text-sm font-medium text-muted-foreground">Properties</div>
                  <div className="ml-2">
                    {fb.properties.map((prop, propIndex) => (
                      <div 
                        key={propIndex}
                        className={`text-sm cursor-pointer hover:bg-secondary rounded p-1 ${selectedNode?.type === 'property' && selectedNode?.fbIndex === fbIndex && selectedNode?.propIndex === propIndex ? 'bg-secondary' : ''}`}
                        onClick={() => {
                          setSelectedNode({ type: 'property', fbIndex, propIndex });
                          navigateToElement(prop.lineNumber);
                        }}
                      >
                        {prop.name}: {prop.type} 
                        <span className="text-xs text-muted-foreground">
                          {prop.hasGetter && " [GET]"}
                          {prop.hasSetter && " [SET]"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Editor Pane */}
        <div className="flex-grow flex flex-col">
          {/* Monaco Editor */}
          <div className="flex-grow" ref={editorRef}></div>
          
          {/* Error List (collapsible) */}
          {errorListVisible && parserResult.errors.length > 0 && (
            <div className="h-32 border-t overflow-auto bg-background">
              <div className="p-2">
                <h3 className="font-semibold">Errors</h3>
                <div>
                  {parserResult.errors.map((error, index) => (
                    <div 
                      key={index} 
                      className="text-sm text-destructive cursor-pointer hover:bg-secondary p-1"
                      onClick={() => navigateToElement(error.lineNumber)}
                    >
                      Line {error.lineNumber}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PLCEditor;
