
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { CodeSnippets } from "./CodeSnippets";
import { FileManager } from "./FileManager";
import { usePLCCode } from "@/hooks/usePLCCode";
import { toast } from "@/components/ui/sonner";

interface EditorToolbarProps {
  onInsertTemplate: (template: string) => void;
  activeFileId?: string | null;
  onFileSelect?: (file: any) => void;
  onNewFile?: () => void;
}

export const EditorToolbar = ({ 
  onInsertTemplate, 
  activeFileId = null,
  onFileSelect,
  onNewFile
}: EditorToolbarProps) => {
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

  const handleDeleteFile = async (id: string) => {
    try {
      await deletePLCCode.mutateAsync(id);
      toast.success("File deleted successfully");
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast.error("Failed to delete file");
    }
  };
  
  const handleDuplicateFile = async (id: string, title: string) => {
    try {
      await duplicatePLCCode.mutateAsync({ id, title });
      toast.success("File duplicated successfully");
    } catch (error) {
      console.error("Failed to duplicate file:", error);
      toast.error("Failed to duplicate file");
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b overflow-x-auto">
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
      </div>
      
      <div className="border-l h-8 mx-2"></div>
      
      {onFileSelect && onNewFile && (
        <FileManager 
          files={plcCodes || []}
          isLoading={isLoading}
          activeFileId={activeFileId}
          onFileSelect={onFileSelect}
          onNewFile={onNewFile}
          onDeleteFile={handleDeleteFile}
          onDuplicateFile={handleDuplicateFile}
        />
      )}
      
      <CodeSnippets onInsertSnippet={onInsertTemplate} />
      <KeyboardShortcuts />
    </div>
  );
};
