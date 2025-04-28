
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface EditorHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  activeCodeId: string | null;
  isAutoSaveEnabled: boolean;
  toggleAutoSave: () => void;
  lastSavedText: string;
  isSaving: boolean;
  children?: React.ReactNode;
}

export const EditorHeader = ({
  title,
  setTitle,
  onSave,
  activeCodeId,
  isAutoSaveEnabled,
  toggleAutoSave,
  lastSavedText,
  isSaving,
  children
}: EditorHeaderProps) => {
  return (
    <div className="flex items-center justify-between border-b p-2 bg-background">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-[200px]"
          placeholder="Untitled"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </Button>
        {children}
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch
            id="auto-save"
            checked={isAutoSaveEnabled}
            onCheckedChange={toggleAutoSave}
          />
          <Label htmlFor="auto-save">Auto-save</Label>
        </div>
        <span className="text-sm text-muted-foreground">{lastSavedText}</span>
      </div>
    </div>
  );
};
