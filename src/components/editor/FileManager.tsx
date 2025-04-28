import { useState } from "react"; // Removed Fragment
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  FolderOpen,
  FilePlus,
  Trash2,
  FileCode,
  Copy,
  Search,
  SortAsc,
  SortDesc,
  ArrowUpDown,
  Calendar,
  Loader2 // Import Loader icon
} from "lucide-react";
import { PLCCodeEntry } from "@/hooks/usePLCCode";
// Remove toast import, as it's handled by the hook now

interface FileManagerProps {
  files: PLCCodeEntry[];
  isLoading: boolean;
  activeFileId: string | null;
  onFileSelect: (file: PLCCodeEntry) => void;
  onNewFile: () => void;
  // Handlers are now the mutate functions from react-query
  onDeleteFile?: (id: string) => void;
  onDuplicateFile?: (args: { id: string; title: string }) => void; // Match hook arg type
  isDeleting?: boolean; // Global deleting state from hook
  isDuplicating?: boolean; // Global duplicating state from hook
}

export const FileManager = ({
  files,
  isLoading,
  activeFileId,
  onFileSelect,
  onNewFile,
  onDeleteFile,
  onDuplicateFile,
  isDeleting, // Destructure loading states
  isDuplicating
}: FileManagerProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<'updated' | 'title'>('updated');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  // State to track which specific action/file is pending
  const [pendingAction, setPendingAction] = useState<{ type: 'delete' | 'duplicate', id: string } | null>(null);

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

  // Handler for duplicate action - sets pending state and calls mutate
  const handleDuplicateClick = (e: React.MouseEvent, file: PLCCodeEntry) => {
    e.stopPropagation();
    if (!onDuplicateFile || isDuplicating) return; // Prevent multiple clicks
    setPendingAction({ type: 'duplicate', id: file.id });
    onDuplicateFile({ id: file.id, title: `${file.title} (Copy)` });
    // onSuccess/onError handled by the hook
  };

  // Handler for delete action - sets pending state and calls mutate
  const handleDeleteClick = (fileId: string) => {
    if (!onDeleteFile || isDeleting) return; // Prevent multiple clicks
    setPendingAction({ type: 'delete', id: fileId });
    onDeleteFile(fileId);
    // onSuccess/onError handled by the hook
  };

  return (
    <Dialog> {/* Main Dialog for the file manager */}
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
          {/* Sort by Title Button */}
          <Button
            variant={sortBy === 'title' ? "secondary" : "outline"}
            size="icon"
            onClick={() => toggleSort('title')}
            className="ml-2"
            title={`Sort by title (${sortBy === 'title' ? (sortDirection === 'asc' ? 'Ascending' : 'Descending') : 'Inactive'})`}
          >
            {sortBy === 'title' ? (
              sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="sr-only">Sort by title</span>
          </Button>
          {/* Sort by Date Button */}
          <Button
            variant={sortBy === 'updated' ? "secondary" : "outline"}
            size="icon"
            onClick={() => toggleSort('updated')}
            className="ml-1"
            title={`Sort by date (${sortBy === 'updated' ? (sortDirection === 'asc' ? 'Ascending' : 'Descending') : 'Inactive'})`}
          >
             {sortBy === 'updated' ? (
              sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />
            ) : (
              <Calendar className="w-4 h-4 text-muted-foreground" />
            )}
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
                  <div className="flex items-center overflow-hidden mr-2">
                    <FileCode className="w-5 h-5 mr-2 text-primary flex-shrink-0" />
                    <div className="truncate">
                      <h3 className="font-medium truncate">{file.title || 'Untitled'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Updated: {formatDate(file.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {onDuplicateFile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDuplicateClick(e, file)}
                        title="Duplicate file"
                        disabled={pendingAction?.type === 'duplicate' && pendingAction?.id === file.id}
                      >
                        {pendingAction?.type === 'duplicate' && pendingAction?.id === file.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        <span className="sr-only">Duplicate</span>
                      </Button>
                    )}
                    {onDeleteFile && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation(); // Keep stopPropagation
                            }}
                            title="Delete file"
                            disabled={pendingAction?.type === 'delete' && pendingAction?.id === file.id}
                          >
                             {pendingAction?.type === 'delete' && pendingAction?.id === file.id ? (
                               <Loader2 className="w-4 h-4 animate-spin" />
                             ) : (
                               <Trash2 className="w-4 h-4 text-destructive" />
                             )}
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the file
                              <span className="font-medium"> "{file.title || 'this file'}"</span>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteClick(file.id)} // Pass only ID
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={pendingAction?.type === 'delete' && pendingAction?.id === file.id}
                            >
                              {pendingAction?.type === 'delete' && pendingAction?.id === file.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
