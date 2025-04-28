import { useState, useEffect, useRef, useCallback } from "react";
import type * as monaco from 'monaco-editor'; // Import monaco types
import { editor } from "monaco-editor"; // Keep existing editor import
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"; // Import Sheet components
import { Save, Check, PanelLeft } from "lucide-react"; // Import PanelLeft icon
import { PLCCodeEntry } from "@/hooks/usePLCCode";
import { ShortcutsHelp } from "./editor/ShortcutsHelp";
import { EditorTour } from "./editor/EditorTour";

interface PLCEditorProps {
  darkMode: boolean;
}

const PLCEditor = ({ darkMode }: PLCEditorProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [parserResult, setParserResult] = useState<ParserResult>({
    functionBlocks: [],
    programs: [], // Add missing property
    functions: [], // Add missing property
    errors: []
  });
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const getInitialCode = () => {
    const storedCode = localStorage.getItem("plcEditorCode");
    return storedCode || getDefaultPLCCode();
  };

  const [code, setCode] = useState<string>(getInitialCode());
  const [xmlOutput, setXmlOutput] = useState<string>("");
  const [errorListVisible, setErrorListVisible] = useState<boolean>(false);

  const [title, setTitle] = useState<string>("Untitled");
  const [activeCodeId, setActiveCodeId] = useState<string | null>(null);
  const { plcCodes, savePLCCode, updatePLCCode, deletePLCCode, duplicatePLCCode, isLoading } = usePLCCode();
  const user = useAuthStore((state) => state.user);

  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState<boolean>(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const autoSaveTimerRef = useRef<number | null>(null);

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [pendingOperation, setPendingOperation] = useState<{
    type: 'new' | 'open';
    data?: any;
  } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // State for mobile sidebar

  const createOrUpdateEditor = () => {
    if (!editorRef.current) return;

    if (monacoEditorRef.current) {
      monacoEditorRef.current.dispose();
      monacoEditorRef.current = null;
    }

    import("monaco-editor").then((monaco) => {
      configurePLCSyntaxHighlighting(monaco);

      if (!monacoEditorRef.current && editorRef.current) {
        monacoEditorRef.current = monaco.editor.create(editorRef.current, {
          value: code,
          language: "plcStructuredText",
          theme: "plcEditorTheme", // Use custom PLC theme
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

        // Register completion item provider
        monaco.languages.registerCompletionItemProvider('plcStructuredText', {
          provideCompletionItems: (model: editor.ITextModel, position: monaco.Position): monaco.languages.ProviderResult<monaco.languages.CompletionList> => { // Now monaco types should be globally available
            const word = model.getWordUntilPosition(position);
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            };

            // Get keywords and type keywords from syntax highlighting definition
            const syntaxKeywords = configurePLCSyntaxHighlighting(monaco);
            const keywords = syntaxKeywords.keywords.map((keyword: string) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword, // Use monaco.languages
              insertText: keyword,
              range: range,
            }));
             const typeKeywords = syntaxKeywords.typeKeywords.map((keyword: string) => ({
               label: keyword,
               kind: monaco.languages.CompletionItemKind.TypeParameter, // Use monaco.languages
               insertText: keyword,
               range: range,
             }));


            // Get variables from parser result
            const variables = new Set<string>();
            parserResult.functionBlocks.forEach(fb => {
              fb.variables.forEach(v => variables.add(v.name));
              fb.methods.forEach(m => {
                m.parameters.forEach(v => variables.add(v.name));
                m.localVariables.forEach(v => variables.add(v.name));
              });
              fb.properties.forEach(p => {
                 // Properties themselves can be used
                 variables.add(p.name);
                 // Variables within GET/SET (if parsed) would go here
              });
            });
            parserResult.programs.forEach(p => {
              p.variables.forEach(v => variables.add(v.name));
            });
             parserResult.functions.forEach(f => {
               f.parameters.forEach(v => variables.add(v.name));
               f.localVariables.forEach(v => variables.add(v.name));
             });


            const variableSuggestions = Array.from(variables).map(variable => ({
              label: variable,
              kind: monaco.languages.CompletionItemKind.Variable, // Use monaco.languages
              insertText: variable,
              range: range,
            }));

            return {
              suggestions: [...keywords, ...typeKeywords, ...variableSuggestions],
            };
          },
        });

// Register Definition Provider
        monaco.languages.registerDefinitionProvider('plcStructuredText', {
          provideDefinition: (model: editor.ITextModel, position: monaco.Position): monaco.languages.ProviderResult<monaco.languages.Definition> => { // Now monaco types should be globally available
            const wordInfo = model.getWordAtPosition(position);
            if (!wordInfo) {
              return null;
            }

            const word = wordInfo.word;
            let definitionLocation: monaco.languages.Location | null = null; // Ensure monaco. prefix

            // --- Search Logic ---
            // 1. Search Function Blocks, Programs, Functions by name
            const pou = [
              ...parserResult.functionBlocks,
              ...parserResult.programs,
              ...parserResult.functions
            ].find(p => p.name === word);

            if (pou) {
              definitionLocation = {
                uri: model.uri,
                range: {
                  startLineNumber: pou.lineNumber,
                  startColumn: 1, // Highlight the whole line for now
                  endLineNumber: pou.lineNumber,
                  endColumn: model.getLineMaxColumn(pou.lineNumber)
                }
              };
              return definitionLocation;
            }

            // 2. Search Variables within POUs (consider scope later)
            parserResult.functionBlocks.forEach(fb => {
              if (definitionLocation) return; // Stop if already found
              const variable = fb.variables.find(v => v.name === word);
              if (variable && variable.lineNumber > 0) { // Check if lineNumber is valid
                 // Use the variable's actual declaration line number
                 definitionLocation = {
                   uri: model.uri,
                   range: {
                     startLineNumber: variable.lineNumber, // Use variable's line number
                     startColumn: 1, // Highlight the whole line for now
                     endLineNumber: variable.lineNumber,
                     endColumn: model.getLineMaxColumn(variable.lineNumber)
                   }
                 };
              } else if (variable) { // Fallback if lineNumber is 0 (e.g., for parameters)
                 // Point to the POU definition line as a fallback
                 definitionLocation = {
                   uri: model.uri,
                   range: {
                     startLineNumber: fb.lineNumber,
                     startColumn: 1,
                     endLineNumber: fb.lineNumber,
                     endColumn: model.getLineMaxColumn(fb.lineNumber)
                   }
                 };
              }
              // TODO: Search Methods and Properties by name
              // TODO: Search variables within Methods/Properties
            });

             parserResult.programs.forEach(prog => {
               if (definitionLocation) return;
               const variable = prog.variables.find(v => v.name === word);
               if (variable && variable.lineNumber > 0) { // Check if lineNumber is valid
                 // Use the variable's actual declaration line number
                 definitionLocation = {
                   uri: model.uri,
                   range: {
                     startLineNumber: variable.lineNumber, // Use variable's line number
                     startColumn: 1,
                     endLineNumber: variable.lineNumber,
                     endColumn: model.getLineMaxColumn(variable.lineNumber)
                   }
                 };
               } else if (variable) { // Fallback if lineNumber is 0
                  // Point to the POU definition line as a fallback
                  definitionLocation = {
                    uri: model.uri,
                    range: {
                      startLineNumber: prog.lineNumber,
                      startColumn: 1,
                      endLineNumber: prog.lineNumber,
                      endColumn: model.getLineMaxColumn(prog.lineNumber)
                    }
                  };
               }
             });

             parserResult.functions.forEach(func => {
               if (definitionLocation) return;
               // Search parameters and local variables
               const variable = [...func.parameters, ...func.localVariables].find(v => v.name === word);
                if (variable && variable.lineNumber > 0) { // Check if lineNumber is valid
                  // Use the variable's actual declaration line number
                  definitionLocation = {
                    uri: model.uri,
                    range: {
                      startLineNumber: variable.lineNumber, // Use variable's line number
                      startColumn: 1,
                      endLineNumber: variable.lineNumber,
                      endColumn: model.getLineMaxColumn(variable.lineNumber)
                    }
                  };
                } else if (variable) { // Fallback if lineNumber is 0 (e.g., for parameters)
                   // Point to the POU definition line as a fallback
                   definitionLocation = {
                     uri: model.uri,
                     range: {
                       startLineNumber: func.lineNumber,
                       startColumn: 1,
                       endLineNumber: func.lineNumber,
                       endColumn: model.getLineMaxColumn(func.lineNumber)
                     }
                   };
                }
             });


            // --- End Search Logic ---

            return definitionLocation;
          }
        });
// Register Hover Provider
        monaco.languages.registerHoverProvider('plcStructuredText', {
          provideHover: (model: editor.ITextModel, position: monaco.Position): monaco.languages.ProviderResult<monaco.languages.Hover> => { // Now monaco types should be globally available
            const wordInfo = model.getWordAtPosition(position);
            if (!wordInfo) {
              return null;
            }

            const word = wordInfo.word;
            let hoverContent: monaco.IMarkdownString[] = []; // Ensure monaco. prefix

            // --- Search Logic for Hover ---
            // 1. Search POUs
            const pou = [
              ...parserResult.functionBlocks,
              ...parserResult.programs,
              ...parserResult.functions
            ].find(p => p.name === word);

            if (pou) {
              let pouType = 'POU';
              if ('methods' in pou) pouType = 'Function Block';
              else if ('returnType' in pou) pouType = 'Function';
              else pouType = 'Program';
              hoverContent.push({ value: `**${pouType}:** ${pou.name}` });
              // Add more details like parameters/return type if available
              if ('returnType' in pou) {
                 hoverContent.push({ value: `*Returns:* \`${pou.returnType}\`` });
              }
               if ('parameters' in pou && pou.parameters.length > 0) {
                 const paramsString = pou.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
                 hoverContent.push({ value: `*Parameters:* ${paramsString}` });
               }
              // Could add variable list preview here too
            } else {
              // 2. Search Variables (more complex due to scope)
              let foundVar: PLCVariable | undefined;
              let varScopeInfo = '';

              // Search within Function Blocks
              parserResult.functionBlocks.forEach(fb => {
                if (foundVar) return;
                foundVar = fb.variables.find(v => v.name === word);
                if (foundVar) varScopeInfo = ` (in FB ${fb.name}, Scope: ${foundVar.scope})`;
                if (foundVar) return;

                fb.methods.forEach(m => {
                   if (foundVar) return;
                   foundVar = [...m.parameters, ...m.localVariables].find(v => v.name === word);
                   if (foundVar) varScopeInfo = ` (in Method ${fb.name}.${m.name}, Scope: ${foundVar.scope})`;
                });
                 // TODO: Search Properties and their internal vars if applicable
              });

              // Search within Programs
              if (!foundVar) {
                parserResult.programs.forEach(prog => {
                  if (foundVar) return;
                  foundVar = prog.variables.find(v => v.name === word);
                  if (foundVar) varScopeInfo = ` (in Program ${prog.name}, Scope: ${foundVar.scope})`;
                });
              }

              // Search within Functions
               if (!foundVar) {
                 parserResult.functions.forEach(func => {
                   if (foundVar) return;
                   foundVar = [...func.parameters, ...func.localVariables].find(v => v.name === word);
                   if (foundVar) varScopeInfo = ` (in Function ${func.name}, Scope: ${foundVar.scope})`;
                 });
               }


              if (foundVar) {
                hoverContent.push({ value: `**Variable:** ${foundVar.name}` });
                hoverContent.push({ value: `*Type:* \`${foundVar.type}\`` });
                 if (foundVar.initialValue) {
                   hoverContent.push({ value: `*Initial Value:* \`${foundVar.initialValue}\`` });
                 }
                 if (foundVar.comment) {
                   hoverContent.push({ value: `*Comment:* ${foundVar.comment}` });
                 }
                 hoverContent.push({ value: `*Scope Info:* ${varScopeInfo}` });
              }
            }

            // 3. TODO: Search Methods/Properties by name


            // --- End Search Logic ---

            if (hoverContent.length > 0) {
              return {
                range: {
                  startLineNumber: position.lineNumber,
                  startColumn: wordInfo.startColumn,
                  endLineNumber: position.lineNumber,
                  endColumn: wordInfo.endColumn,
                },
                contents: hoverContent,
              };
            }

            return null;
          }
        });

        monacoEditorRef.current.onDidChangeModelContent(() => {
          const newCode = monacoEditorRef.current?.getValue() || "";
          setCode(newCode);
          localStorage.setItem("plcEditorCode", newCode);
          setUnsavedChanges(true);

          const result = parsePLCCode(newCode);
          setParserResult(result);

          if (isAutoSaveEnabled && user) {
            if (autoSaveTimerRef.current) {
              window.clearTimeout(autoSaveTimerRef.current);
            }
            autoSaveTimerRef.current = window.setTimeout(() => {
              handleAutoSave(newCode);
            }, 3000);
          }
        });

        monacoEditorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          handleSave();
        });

        monacoEditorRef.current.addCommand(monaco.KeyMod.Alt | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
          monacoEditorRef.current?.getAction('editor.action.formatDocument')?.run();
        });
      }
    });
  };

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

  useEffect(() => {
    createOrUpdateEditor();

    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
      }
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

  useEffect(() => {
    createOrUpdateEditor();

    const result = parsePLCCode(code);
    setParserResult(result);
  }, [darkMode]);

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

  const handleFileSelect = (file: PLCCodeEntry) => {
    if (unsavedChanges && !isAutoSaveEnabled) {
      setPendingOperation({ type: 'open', data: file });
      return;
    }

    setActiveCodeId(file.id);
    setTitle(file.title);
    setCode(file.code);
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(file.code);
    }
    setUnsavedChanges(false);

    const result = parsePLCCode(file.code);
    setParserResult(result);

    toast.success(`Loaded "${file.title}"`);
  };

  const handleNewFile = () => {
    if (unsavedChanges && !isAutoSaveEnabled) {
      setPendingOperation({ type: 'new' });
      return;
    }

    setActiveCodeId(null);
    setTitle("Untitled");
    const defaultCode = getDefaultPLCCode();
    setCode(defaultCode);
    if (monacoEditorRef.current) {
      monacoEditorRef.current.setValue(defaultCode);
    }
    setUnsavedChanges(false);

    const result = parsePLCCode(defaultCode);
    setParserResult(result);

    toast.success("Created new file");
  };

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

      const result = parsePLCCode(defaultCode);
      setParserResult(result);
    }

    setUnsavedChanges(false);
    setPendingOperation(null);
  };

  const navigateToElement = (lineNumber: number) => {
    if (monacoEditorRef.current) {
      monacoEditorRef.current.revealLineInCenter(lineNumber);
      monacoEditorRef.current.setPosition({ lineNumber, column: 1 });
      monacoEditorRef.current.focus();
    }
  };

  const handleExportXml = () => {
    const xml = generatePLCopenXML(parserResult);
    setXmlOutput(xml);

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

const insertTemplate = (template: string) => {
  if (!monacoEditorRef.current) return;

  const editorInstance = monacoEditorRef.current;
  const currentPosition = editorInstance.getPosition();
  if (!currentPosition) return;

  let targetLineNumber = currentPosition.lineNumber;
  let targetColumn = currentPosition.column;
  let insertText = template;

  // --- Logic for Method Insertion ---
  // Check if the template looks like a METHOD definition
  if (template.trim().toUpperCase().startsWith('METHOD')) {
    const model = editorInstance.getModel();
    if (model) {
      const fullCode = model.getValue();
      const lines = fullCode.split('\n');

      // Find the containing Function Block based on cursor position and parsed structure
      let containingFb: PLCFunctionBlock | null = null;
      let containingFbEndLine = -1; // Store the END_FUNCTION_BLOCK line number

      for (const fb of parserResult.functionBlocks) {
        // Find the END_FUNCTION_BLOCK line for this FB first
        let fbEndLineIndex = -1;
        for (let i = fb.lineNumber - 1; i < lines.length; i++) { // Start search from FB definition line
          if (lines[i].trim().toUpperCase() === 'END_FUNCTION_BLOCK') {
            fbEndLineIndex = i;
            break;
          }
        }

        if (fbEndLineIndex !== -1) {
          const fbEndLine = fbEndLineIndex + 1; // 1-based line number
          // Check if cursor is within this FB's definition range
          if (currentPosition.lineNumber >= fb.lineNumber && currentPosition.lineNumber <= fbEndLine) {
            containingFb = fb;
            containingFbEndLine = fbEndLine;
            break; // Found the FB containing the cursor
          }
        }
      }


      if (containingFb && containingFbEndLine !== -1) {
        console.log("Cursor is inside FB:", containingFb.name, `(Lines ${containingFb.lineNumber}-${containingFbEndLine})`);

        let lastMethodEndLineIndex = -1;
        let searchIndex = containingFbEndLine; // Start searching *after* END_FUNCTION_BLOCK line (0-based index)

        // Find the end line of the last method associated with this FB
        // Heuristic: Search for METHOD...END_METHOD blocks between END_FUNCTION_BLOCK
        // and the start of the next POU or Property definition.
        while (searchIndex < lines.length) {
            const lineTrimmedUpper = lines[searchIndex].trim().toUpperCase();

            // Check if the line starts a METHOD definition
            if (lineTrimmedUpper.startsWith('METHOD ')) {
                // Found a method, now find its END_METHOD
                let methodEndIndex = -1;
                for (let j = searchIndex + 1; j < lines.length; j++) {
                    const innerLineTrimmedUpper = lines[j].trim().toUpperCase();
                    if (innerLineTrimmedUpper === 'END_METHOD') {
                        methodEndIndex = j;
                        break;
                    }
                    // Stop if we hit another POU/Property definition before END_METHOD
                    if (innerLineTrimmedUpper.startsWith('FUNCTION_BLOCK') || innerLineTrimmedUpper.startsWith('PROGRAM') || innerLineTrimmedUpper.startsWith('FUNCTION') || innerLineTrimmedUpper.startsWith('PROPERTY')) {
                        break;
                    }
                }

                if (methodEndIndex !== -1) {
                    // Check if this method belongs to the current FB (simple check: no other POU started between FB end and this method start)
                    let belongsToFb = true;
                    for (let k = containingFbEndLine; k < searchIndex; k++) {
                         const intermediateLine = lines[k].trim().toUpperCase();
                         if (intermediateLine.startsWith('FUNCTION_BLOCK') || intermediateLine.startsWith('PROGRAM') || intermediateLine.startsWith('FUNCTION') || intermediateLine.startsWith('PROPERTY')) {
                             belongsToFb = false;
                             break;
                         }
                    }

                    if (belongsToFb) {
                        lastMethodEndLineIndex = methodEndIndex;
                        searchIndex = methodEndIndex + 1; // Continue search after this method
                        console.log("Found METHOD belonging to", containingFb.name, "ending at index:", methodEndIndex);
                    } else {
                        console.log("Found METHOD at index", searchIndex, "but it seems to belong to a later POU. Stopping method search.");
                        break; // Stop searching, method belongs to a later POU
                    }
                } else {
                    // Malformed method? Stop searching for methods here.
                    console.log("Could not find END_METHOD for METHOD at index:", searchIndex);
                    break;
                }
            } else if (lineTrimmedUpper.startsWith('FUNCTION_BLOCK') || lineTrimmedUpper.startsWith('PROGRAM') || lineTrimmedUpper.startsWith('FUNCTION') || lineTrimmedUpper.startsWith('PROPERTY')) {
                // Stop searching if we hit the next POU or Property definition
                console.log("Stopping method search at next POU/Property:", lineTrimmedUpper);
                break;
            } else {
                searchIndex++; // Move to the next line
            }
        }


        if (lastMethodEndLineIndex !== -1) {
          // Insert after the last method's END_METHOD
          targetLineNumber = lastMethodEndLineIndex + 2; // +1 for 1-based index, +1 for line after
          console.log("[DEBUG] Inserting after last method at line:", targetLineNumber);
        } else {
          // No methods found after END_FUNCTION_BLOCK, insert right after it
          targetLineNumber = containingFbEndLine + 1; // Insert on the line immediately after END_FUNCTION_BLOCK
          console.log("[DEBUG] No methods found for FB, inserting after END_FUNCTION_BLOCK at line:", targetLineNumber);
        }
        targetColumn = 1; // Methods always start at column 1
        // Add newline before template to separate it
        insertText = "\n" + template;
      } else {
         // Fallback for METHOD: Could not reliably determine target FB or its end. Insert at cursor line, column 1.
         console.log("[DEBUG] Failed to determine target FB/End for METHOD. Inserting at cursor line:", currentPosition.lineNumber);
         targetLineNumber = currentPosition.lineNumber;
         targetColumn = 1; // Default to column 1 for block elements
         // Add newline if not already on an empty line start
         const currentLineContent = editorInstance.getModel()?.getLineContent(targetLineNumber) ?? "";
         insertText = (targetColumn === 1 && currentLineContent.trim() === "" ? "" : "\n") + template;
      }
    } else {
        // Model not available for METHOD, insert at cursor line, column 1
        targetLineNumber = currentPosition.lineNumber;
        targetColumn = 1; // Default to column 1
        const currentLineContent = editorInstance.getModel()?.getLineContent(targetLineNumber) ?? "";
        insertText = (targetColumn === 1 && currentLineContent.trim() === "" ? "" : "\n") + template;
    }
  } else {
      // --- Logic for Non-Method Templates (FB, Program, Function, Property, etc.) ---
      console.log("[DEBUG] Inserting non-METHOD template.");
      targetLineNumber = currentPosition.lineNumber;
      targetColumn = 1; // Always insert block templates at column 1

      // Add newline before template unless inserting at the start of an empty line
      const currentLineContent = editorInstance.getModel()?.getLineContent(targetLineNumber) ?? "";
      const isStartOfEmptyLine = currentPosition.column === 1 && currentLineContent.trim() === "";
      insertText = (isStartOfEmptyLine ? "" : "\n") + template;
      console.log(`[DEBUG] Non-METHOD insert at Line: ${targetLineNumber}, Col: ${targetColumn}. Prepending newline: ${!isStartOfEmptyLine}`);
  }
  // --- End of Logic for Method Insertion ---

  // Use the calculated or original position/text
  editorInstance.executeEdits("insertTemplate", [
    {
      range: {
        startLineNumber: targetLineNumber,
        startColumn: targetColumn,
        endLineNumber: targetLineNumber,
        endColumn: targetColumn,
      },
      text: insertText,
      forceMoveMarkers: true,
    },
  ]);
  editorInstance.focus();
  // Ensure the inserted text is visible and position cursor at the start of the insertion
  // Note: Calculating the precise end position after edits can be complex and error-prone.
  // Placing it at the start of the inserted block is a safer default.
  // Position cursor *after* the inserted block.
  // Calculate the line number *after* the last line of the inserted text.
  const insertedLineCount = insertText.split('\n').length;
  const lineAfterInsertion = targetLineNumber + insertedLineCount - (insertText.endsWith('\n') ? 0 : 1); // Adjust if template ends with newline

  // Place cursor at the beginning of the next line
  const finalCursorLine = lineAfterInsertion + 1;
  const finalCursorColumn = 1;

  editorInstance.setPosition({ lineNumber: finalCursorLine, column: finalCursorColumn });
  editorInstance.revealPositionInCenterIfOutsideViewport({
      lineNumber: finalCursorLine,
      column: finalCursorColumn
  });
  console.log(`[DEBUG] Cursor moved to Line: ${finalCursorLine}, Col: ${finalCursorColumn} after insertion.`);
};

  const toggleAutoSave = () => {
    setIsAutoSaveEnabled(prev => !prev);
    toast.info(`Auto-save ${!isAutoSaveEnabled ? 'enabled' : 'disabled'}`);
  };

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
        <EditorHeader
          title={title}
          setTitle={setTitle}
          onSave={handleSave}
          activeCodeId={activeCodeId}
          isAutoSaveEnabled={isAutoSaveEnabled}
          toggleAutoSave={toggleAutoSave}
          lastSavedText={formatLastSaved()}
          isSaving={isSaving}
        >
          <ShortcutsHelp />
        </EditorHeader>

        <EditorToolbar
          onInsertTemplate={insertTemplate}
          activeFileId={activeCodeId}
          onFileSelect={handleFileSelect}
          onNewFile={handleNewFile}
          isMobileSidebarOpen={isMobileSidebarOpen} // Pass state down
          setIsMobileSidebarOpen={setIsMobileSidebarOpen} // Pass setter down
          onExportXML={handleExportXml} // Pass the export handler
        />

        <div className="flex-grow flex overflow-hidden">
          {/* Sidebar visible directly on medium screens and up */}
          <div className="hidden md:block border-r">
            <CodeStructure
              functionBlocks={parserResult.functionBlocks}
              programs={parserResult.programs}
              functions={parserResult.functions}
              selectedNode={selectedNode}
              setSelectedNode={setSelectedNode}
              onNavigate={navigateToElement} // Pass navigation function as onNavigate
            />
          </div>

          {/* Sidebar in a Sheet for small screens */}
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetContent side="left" className="p-0 w-[300px] sm:w-[350px]">
              <SheetHeader className="p-4 border-b">
                <SheetTitle>Code Structure</SheetTitle>
              </SheetHeader>
              <div className="h-[calc(100vh-60px)] overflow-y-auto"> {/* Adjust height based on header */}
                 <CodeStructure
                   functionBlocks={parserResult.functionBlocks}
                   programs={parserResult.programs}
                   functions={parserResult.functions}
                   selectedNode={selectedNode}
                   setSelectedNode={setSelectedNode}
                   onNavigate={(lineNumber) => { // Pass navigation function as onNavigate
                     navigateToElement(lineNumber);
                     setIsMobileSidebarOpen(false); // Close sheet on navigation
                   }}
                 />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex-grow flex flex-col">
            <div id="editor" className="flex-grow" ref={editorRef}></div>

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
                        onClick={() => navigateToElement(error.lineNumber)}
                      >
                        Line {error.lineNumber}: {error.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <EditorTour />

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