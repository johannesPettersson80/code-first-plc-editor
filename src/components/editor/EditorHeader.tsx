
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Save, 
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface EditorHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  activeCodeId: string | null;
  isAutoSaveEnabled?: boolean;
  toggleAutoSave?: () => void;
  lastSavedText?: string;
  isSaving?: boolean;
}

export const EditorHeader = ({ 
  title, 
  setTitle, 
  onSave, 
  activeCodeId,
  isAutoSaveEnabled = false,
  toggleAutoSave,
  lastSavedText = "Not saved yet",
  isSaving = false
}: EditorHeaderProps) => {
  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2 flex-1">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-64 h-8"
          placeholder="Enter title..."
        />
        
        {/* Auto-save toggle */}
        {toggleAutoSave && (
          <div className="flex items-center gap-2 ml-4">
            <Switch 
              id="auto-save" 
              checked={isAutoSaveEnabled} 
              onCheckedChange={toggleAutoSave}
            />
            <Label htmlFor="auto-save" className="text-sm">Auto-save</Label>
          </div>
        )}
        
        {/* Last saved indicator */}
        <div className="ml-4 flex items-center text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Clock size={14} className="mr-1 animate-pulse" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              {isAutoSaveEnabled ? (
                <CheckCircle2 size={14} className="mr-1 text-green-500" />
              ) : (
                <XCircle size={14} className="mr-1 text-amber-500" />
              )}
              <span>{lastSavedText}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={onSave} size="sm" disabled={isSaving}>
              <Save className="w-4 h-4 mr-1" />
              {activeCodeId ? "Update" : "Save"}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save your code</p>
          </TooltipContent>
        </Tooltip>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export as PLCopen XML</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};
