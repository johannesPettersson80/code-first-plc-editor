
import { useState, useEffect } from "react";
import Split from "react-split";
import PLCEditor from "./PLCEditor";
import { Button } from "@/components/ui/button";
import { Book, BookOpen, FileCode, FileText, ChevronDown, ChevronUp } from "lucide-react";

const PLCEditorLayout = () => {
  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const savedMode = localStorage.getItem("plcEditorDarkMode");
    return savedMode ? savedMode === "true" : false;
  });

  // Update the theme when dark mode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("plcEditorDarkMode", darkMode.toString());
  }, [darkMode]);

  return (
    <div className={`min-h-screen bg-background flex flex-col ${darkMode ? "dark" : ""}`}>
      {/* Header Bar */}
      <header className="p-4 border-b flex items-center justify-between bg-card">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold">PLC Code-First Editor</h1>
          <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
            Beta
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Dark Mode Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="h-9 w-9"
          >
            {darkMode ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow overflow-hidden">
        <PLCEditor darkMode={darkMode} />
      </main>

      {/* Footer */}
      <footer className="p-2 border-t bg-card text-center text-sm text-muted-foreground">
        <p>
          PLC Code-First Editor - Changing the way you program PLCs
        </p>
      </footer>
    </div>
  );
};

export default PLCEditorLayout;
