import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  FolderOpen, 
  FilePlus, 
  Save,
  Trash2,
  FileCode,
  Copy,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  SortAsc,
  Calendar
} from "lucide-react";
import { PLCCodeEntry } from "@/hooks/usePLCCode";

interface FileManagerProps {
  files: PLCCodeEntry[];
  isLoading: boolean;
  activeFileId: string | null;
  onFileSelect: (file: PLCCodeEntry) => void;
  onNewFile: () => void;
  onDeleteFile?: (id: string) => void;
  onDuplicateFile?: (id: string, title: string) => void;
}

export const FileManager = ({
  files,
  isLoading,
  activeFileId,
  onFileSelect,
  onNewFile,
  onDeleteFile,
  onDuplicateFile
}: FileManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const filteredAndSortedFiles = [...files]
    .filter(file => 
      file.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'updated') {
        const dateA = new Date(a.updated_at).getTime();
        const dateB = new Date(b.updated_at).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        return sortDirection === 'asc' 
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
    });
  
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const toggleSort = (field: 'updated' | 'title') => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FolderOpen className="w-4 h-4 mr-1" />
          Files
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>File Manager</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center mb-4">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={() => toggleSort('title')} className="ml-2">
            <SortAsc className="w-4 h-4" />
            <span className="sr-only">Sort by title</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => toggleSort('updated')} className="ml-1">
            <Calendar className="w-4 h-4" />
            <span className="sr-only">Sort by date</span>
          </Button>
        </div>
        
        <div className="flex mb-4">
          <Button onClick={onNewFile} className="mr-2">
            <FilePlus className="w-4 h-4 mr-1" />
            New File
          </Button>
        </div>
        
        <ScrollArea className="h-[calc(80vh-180px)]">
          <div className="space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading files...
              </div>
            ) : filteredAndSortedFiles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No files found. Create a new file to get started.
              </div>
            ) : (
              filteredAndSortedFiles.map((file) => (
                <div 
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer hover:bg-accent/50 ${file.id === activeFileId ? 'bg-accent border-primary' : ''}`}
                  onClick={() => onFileSelect(file)}
                >
                  <div className="flex items-center">
                    <FileCode className="w-5 h-5 mr-2 text-primary" />
                    <div>
                      <h3 className="font-medium">{file.title || 'Untitled'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Updated: {formatDate(file.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {onDuplicateFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicateFile(file.id, `${file.title} (Copy)`);
                        }}
                      >
                        <Copy className="w-4 h-4" />
                        <span className="sr-only">Duplicate</span>
                      </Button>
                    )}
                    {onDeleteFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Are you sure you want to delete "${file.title}"?`)) {
                            onDeleteFile(file.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
