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
import { EditorHeader } from "./editor/EditorHeader";
import { EditorToolbar } from "./editor/EditorToolbar";
import { CodeStructure } from "./editor/CodeStructure";

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

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar with Title, Save, and Templates */}
      <EditorHeader
        title={title}
        setTitle={setTitle}
        onSave={handleSave}
        activeCodeId={activeCodeId}
      />
      <EditorToolbar onInsertTemplate={insertTemplate} />
      
      {/* Main Content */}
      <div className="flex-grow flex overflow-hidden">
        <CodeStructure
          functionBlocks={parserResult.functionBlocks}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          navigateToElement={navigateToElement}
        />
        
        {/* Editor Pane */}
        <div className="flex-grow flex flex-col">
          {/* Monaco Editor */}
          <div className="flex-grow" ref={editorRef}></div>
        </div>
      </div>
    </div>
  );
};

export default PLCEditor;
