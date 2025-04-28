
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
import { toast } from "@/components/ui/sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Save, Check } from "lucide-react";
import { PLCCodeEntry } from "@/hooks/usePLCCode";

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
  
  // Auto save states
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  
  // Unsaved changes dialog
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    type: 'new' | 'open';
    data?: any;
  } | null>(null);

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
          quickSuggestions: true,
          formatOnPaste: true,
          folding: true,
        });

        // Listen for changes
        monacoEditorRef.current.onDidChangeModelContent(() => {
          const newCode = monacoEditorRef.current?.getValue() || "";
          setCode(newCode);
          localStorage.setItem("plcEditorCode", newCode);
          setUnsavedChanges(true);
          
          const result = parsePLCCode(newCode);
          setParserResult(result);
          
          // Schedule auto-save
          if (isAutoSaveEnabled && user) {
            if (autoSaveTimerRef.current) {
              window.clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = window.setTimeout(() => {
              handleAutoSave(newCode);
            }, 3000); // Auto-save after 3 seconds of inactivity
          }
        });
        
        // Add keyboard shortcuts
        monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          handleSave();
        });
        
        // Find shortcut is built into Monaco (Ctrl+F)
        // Add format document shortcut
        monacoEditorRef.current.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
          monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run();
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
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []); // Empty dependency array for mount/unmount only
  
  // Add a global keyboard shortcut for saving
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if Ctrl+S is pressed (or Cmd+S on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [code, title, activeCodeId]);
  
  // Handle theme changes by recreating the editor
  useEffect(() => {
    createOrUpdateEditor();
    
    // Initial parse
    const result = parsePLCCode(code);
    setParserResult(result);
  }, [darkMode]);
  
  // Handle auto-save functionality
  const handleAutoSave = async (newCode: string) => {
    if (!user || !isAutoSaveEnabled || isLoading) return;
    
    setIsSaving(true);
    
    try {
      if (activeCodeId) {
        await updatePLCCode.mutateAsync({ id: activeCodeId, code: newCode, title });
      } else {
        const saved = await savePLCCode.mutateAsync({ code: newCode, title });
        if (saved) {
          setActiveCodeId(saved.id);
        }
      }
      setLastSaved(new Date());
      setUnsavedChanges(false);
      // Show a brief toast for auto-save success
      toast.success("Auto-saved successfully", {
        duration: 2000,
        icon: <Check size={16} />,
      });
    } catch (error) {
      console.error("Auto-save failed:", error);
      toast.error("Auto-save failed");
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = (file: PLCCodeEntry) => {
    // Check for unsaved changes
    if (unsavedChanges && !isAutoSaveEnabled) {
      setPendingOperation({ type: 'open', data: file });
      return;
    }
    
    // Set the active file
    setActiveCodeId(file.id);
    setTitle(file.title);
    setCode(file.code);
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(file.code);
    }
    setUnsavedChanges(false);
    
    // Update parsed result
    const result = parsePLCCode(file.code);
    setParserResult(result);
    
    toast.success(`Loaded "${file.title}"`);
  };
  
  // Handle new file creation
  const handleNewFile = () => {
    // Check for unsaved changes
    if (unsavedChanges && !isAutoSaveEnabled) {
      setPendingOperation({ type: 'new' });
      return;
    }
    
    // Create a new file
    setActiveCodeId(null);
    setTitle("Untitled");
    const defaultCode = getDefaultPLCCode();
    setCode(defaultCode);
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(defaultCode);
    }
    setUnsavedChanges(false);
    
    // Update parsed result
    const result = parsePLCCode(defaultCode);
    setParserResult(result);
    
    toast.success("Created new file");
  };
  
  // Proceed with pending operation (after saving or discarding changes)
  const proceedWithPendingOperation = () => {
    if (!pendingOperation) return;
    
    if (pendingOperation.type === 'open' && pendingOperation.data) {
      const file = pendingOperation.data;
      setActiveCodeId(file.id);
      setTitle(file.title);
      setCode(file.code);
      if (monacoEditorRef.current) {
        monacoEditorRef.current.setValue(file.code);
      }
      
      // Update parsed result
      const result = parsePLCCode(file.code);
      setParserResult(result);
    } else if (pendingOperation.type === 'new') {
      setActiveCodeId(null);
      setTitle("Untitled");
      const defaultCode = getDefaultPLCCode();
      setCode(defaultCode);
      if (monacoEditorRef.current) {
        monacoEditorRef.current.setValue(defaultCode);
      }
      
      // Update parsed result
      const result = parsePLCCode(defaultCode);
      setParserResult(result);
    }
    
    setUnsavedChanges(false);
    setPendingOperation(null);
  };
  
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
    a.download = `${title || 'plc_export'}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("XML exported successfully");
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
    
    setIsSaving(true);
    const currentCode = monacoEditorRef.current?.getValue() || "";
    
    try {
      if (activeCodeId) {
        await updatePLCCode.mutateAsync({ id: activeCodeId, code: currentCode, title });
      } else {
        const saved = await savePLCCode.mutateAsync({ code: currentCode, title });
        if (saved) {
          setActiveCodeId(saved.id);
        }
      }
      setLastSaved(new Date());
      setUnsavedChanges(false);
      toast.success("Saved successfully");
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle auto-save
  const toggleAutoSave = () => {
    setIsAutoSaveEnabled(prev => !prev);
    toast.info(`Auto-save ${!isAutoSaveEnabled ? 'enabled' : 'disabled'}`);
  };
  
  // Format the last saved time
  const formatLastSaved = () => {
    if (!lastSaved) return "Not saved yet";
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffSecs < 60) return `Saved ${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
    if (diffMins < 60) return `Saved ${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    return `Saved ${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Top Bar with Title, Save, and Templates */}
        <EditorHeader
          title={title}
          setTitle={setTitle}
          onSave={handleSave}
          activeCodeId={activeCodeId}
          isAutoSaveEnabled={isAutoSaveEnabled}
          toggleAutoSave={toggleAutoSave}
          lastSavedText={formatLastSaved()}
          isSaving={isSaving}
        />
        <EditorToolbar 
          onInsertTemplate={insertTemplate}
          activeFileId={activeCodeId}
          onFileSelect={handleFileSelect}
          onNewFile={handleNewFile}
        />
        
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
            
            {/* Error list */}
            {parserResult.errors.length > 0 && (
              <div className="border-t p-2 bg-red-50 dark:bg-red-900/20">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-red-600 dark:text-red-400">
                    {parserResult.errors.length} Error{parserResult.errors.length !== 1 ? 's' : ''}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setErrorListVisible(!errorListVisible)}
                  >
                    {errorListVisible ? 'Hide' : 'Show'} Details
                  </Button>
                </div>
                
                {errorListVisible && (
                  <ul className="mt-2 text-sm space-y-1 max-h-32 overflow-y-auto">
                    {parserResult.errors.map((error, index) => (
                      <li 
                        key={index}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 cursor-pointer rounded"
                        onClick={() => navigateToElement(error.line)}
                      >
                        Line {error.line}: {error.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Unsaved changes dialog */}
      <AlertDialog open={!!pendingOperation} onOpenChange={(open) => !open && setPendingOperation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in your current file. Would you like to save them before continuing?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleSave().then(() => {
                  proceedWithPendingOperation();
                });
              }}
            >
              Save & Continue
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => {
                proceedWithPendingOperation();
              }}
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PLCEditor;
