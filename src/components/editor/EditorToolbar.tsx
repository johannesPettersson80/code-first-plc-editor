
import { Button } from "@/components/ui/button";

interface EditorToolbarProps {
  onInsertTemplate: (template: string) => void;
}

export const EditorToolbar = ({ onInsertTemplate }: EditorToolbarProps) => {
  const templates = {
    functionBlock: "FUNCTION_BLOCK TemplateFB\nVAR_INPUT\n  \nEND_VAR\n\nVAR_OUTPUT\n  \nEND_VAR\n\nVAR\n  \nEND_VAR\n\n\nEND_FUNCTION_BLOCK",
    method: "METHOD TemplateMethod : BOOL\nVAR_INPUT\n  \nEND_VAR\nVAR_TEMP\n  \nEND_VAR\n{\n  \n  RETURN TRUE;\n}",
    property: "PROPERTY TemplateProperty : INT\nGET \n{\n  \n}\nSET \n{\n  \n}\nEND_PROPERTY",
    getProperty: "PROPERTY TemplateGetProperty : INT\nGET \n{\n  \n}\nEND_PROPERTY",
  };

  return (
    <div className="flex space-x-2">
      <Button variant="outline" size="sm" onClick={() => onInsertTemplate(templates.functionBlock)}>
        + Function Block
      </Button>
      <Button variant="outline" size="sm" onClick={() => onInsertTemplate(templates.method)}>
        + Method
      </Button>
      <Button variant="outline" size="sm" onClick={() => onInsertTemplate(templates.property)}>
        + Property
      </Button>
      <Button variant="outline" size="sm" onClick={() => onInsertTemplate(templates.getProperty)}>
        + Get Property
      </Button>
    </div>
  );
};
