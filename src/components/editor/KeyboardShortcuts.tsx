
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface KeyboardShortcut {
  keys: string[];
  description: string;
  category: 'editor' | 'navigation' | 'files';
}

const shortcuts: KeyboardShortcut[] = [
  { keys: ['Ctrl', 'S'], description: 'Save current file', category: 'files' },
  { keys: ['Ctrl', 'F'], description: 'Find in file', category: 'editor' },
  { keys: ['Ctrl', 'H'], description: 'Replace in file', category: 'editor' },
  { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'editor' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'editor' },
  { keys: ['Ctrl', '/'], description: 'Toggle comment', category: 'editor' },
  { keys: ['Tab'], description: 'Indent', category: 'editor' },
  { keys: ['Shift', 'Tab'], description: 'Outdent', category: 'editor' },
  { keys: ['Ctrl', '+'], description: 'Zoom in', category: 'editor' },
  { keys: ['Ctrl', '-'], description: 'Zoom out', category: 'editor' },
  { keys: ['Ctrl', '0'], description: 'Reset zoom', category: 'editor' },
  { keys: ['Alt', 'Up'], description: 'Move line up', category: 'editor' },
  { keys: ['Alt', 'Down'], description: 'Move line down', category: 'editor' },
  { keys: ['Ctrl', 'D'], description: 'Duplicate line', category: 'editor' },
  { keys: ['Alt', 'Z'], description: 'Toggle word wrap', category: 'editor' },
  { keys: ['Ctrl', 'Home'], description: 'Go to beginning of file', category: 'navigation' },
  { keys: ['Ctrl', 'End'], description: 'Go to end of file', category: 'navigation' },
  { keys: ['Ctrl', 'G'], description: 'Go to line', category: 'navigation' },
  { keys: ['F1'], description: 'Show documentation', category: 'navigation' },
];

export const KeyboardShortcuts = () => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'editor' | 'navigation' | 'files'>('all');
  
  const filteredShortcuts = selectedCategory === 'all' 
    ? shortcuts 
    : shortcuts.filter(s => s.category === selectedCategory);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Keyboard className="w-4 h-4 mr-1" />
          Shortcuts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        
        <div className="mb-4 flex gap-2">
          <Button 
            variant={selectedCategory === 'all' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedCategory('all')}
          >
            All
          </Button>
          <Button 
            variant={selectedCategory === 'editor' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedCategory('editor')}
          >
            Editor
          </Button>
          <Button 
            variant={selectedCategory === 'navigation' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedCategory('navigation')}
          >
            Navigation
          </Button>
          <Button 
            variant={selectedCategory === 'files' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setSelectedCategory('files')}
          >
            Files
          </Button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/3">Shortcut</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShortcuts.map((shortcut, index) => (
                <TableRow key={index}>
                  <TableCell className="font-mono">
                    {shortcut.keys.map((key, keyIndex) => (
                      <span key={keyIndex}>
                        <kbd className="px-2 py-1 bg-muted rounded border text-xs">
                          {key}
                        </kbd>
                        {keyIndex < shortcut.keys.length - 1 && <span className="mx-1">+</span>}
                      </span>
                    ))}
                  </TableCell>
                  <TableCell>{shortcut.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
