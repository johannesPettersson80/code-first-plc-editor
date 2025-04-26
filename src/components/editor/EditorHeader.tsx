
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EditorHeaderProps {
  title: string;
  setTitle: (title: string) => void;
  onSave: () => void;
  activeCodeId: string | null;
}

export const EditorHeader = ({ title, setTitle, onSave, activeCodeId }: EditorHeaderProps) => {
  return (
    <div className="flex justify-between items-center p-2 bg-secondary border-b">
      <div className="flex items-center space-x-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-48"
          placeholder="Enter title"
        />
        <Button variant="outline" size="sm" onClick={onSave}>
          {activeCodeId ? 'Update' : 'Save'}
        </Button>
      </div>
    </div>
  );
};
