
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { CodeSnippets } from "./CodeSnippets";
import { FileManager } from "./FileManager";
import { usePLCCode } from "@/hooks/usePLCCode";
import { toast } from "@/components/ui/sonner";

import { PanelLeft } from "lucide-react"; // Import PanelLeft

interface EditorToolbarProps {
  onInsertTemplate: (template: string) => void;
  activeFileId?: string | null;
  onFileSelect?: (file: any) => void;
  onNewFile?: () => void;
  isMobileSidebarOpen?: boolean; // Add prop for state
  setIsMobileSidebarOpen?: (open: boolean) => void; // Add prop for setter
  onExportXML: () => void; // Add prop for XML export trigger
}

export const EditorToolbar = ({ 
  onInsertTemplate, 
  activeFileId = null,
  onFileSelect,
  onNewFile,
  isMobileSidebarOpen, // Destructure new props
  setIsMobileSidebarOpen, // Destructure new props
  onExportXML, // Destructure new prop
}: EditorToolbarProps) => {
  // Reinstate the hook call to get mutations and their states
  const { plcCodes, isLoading, deletePLCCode, duplicatePLCCode } = usePLCCode();
  
  const functionBlockTemplate = `FUNCTION_BLOCK NewFunctionBlock
VAR_INPUT
    // Input variables
END_VAR

VAR_OUTPUT
    // Output variables
END_VAR

VAR
    // Local variables
END_VAR

// Your code here

END_FUNCTION_BLOCK`;

  const methodTemplate = `METHOD NewMethod : BOOL
VAR_INPUT
    // Method parameters
END_VAR
{
    // Method implementation
    RETURN TRUE;
}`;

  const propertyTemplate = `PROPERTY NewProperty : REAL
GET 
{
    // Getter implementation
    RETURN 0.0;
}
SET 
{
    // Setter implementation
    // Use 'NewProperty' to refer to the value being set
}
END_PROPERTY`;

  // Wrapper functions calling mutate (no async/await needed here)
  // Toast notifications are handled by the hook's onSuccess/onError
  const handleDeleteFile = (id: string) => {
    deletePLCCode.mutate(id);
  };

  const handleDuplicateFile = ({ id, title }: { id: string; title: string }) => {
    duplicatePLCCode.mutate({ id, title });
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b overflow-x-auto">
      {/* Mobile Sidebar Toggle Button */}
      {setIsMobileSidebarOpen && (
        <Button
          variant="outline"
          size="icon"
          className="md:hidden" // Only show on small screens
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onInsertTemplate(functionBlockTemplate)}
            >
              Function Block
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insert a new Function Block template</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onInsertTemplate(methodTemplate)}
            >
              Method
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insert a new Method template</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onInsertTemplate(propertyTemplate)}
            >
              Property
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Insert a new Property template</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportXML} // Call the passed-in handler
            >
              Export XML
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export the current PLC code to XML format</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="border-l h-8 mx-2"></div>
      
      {/* Pass down handlers and loading states from the hook */}
      {onFileSelect && onNewFile && (
        <FileManager
          files={plcCodes || []}
          isLoading={isLoading}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          onNewFile={onNewFile}
          // Pass the wrapper handlers
          onDeleteFile={handleDeleteFile}
          onDuplicateFile={handleDuplicateFile}
          // Pass the pending states from the hook
          isDeleting={deletePLCCode.isPending}
          isDuplicating={duplicatePLCCode.isPending}
        />
      )}
      
      <CodeSnippets onInsertSnippet={onInsertTemplate} />
      <KeyboardShortcuts />
    </div>
  );
};
