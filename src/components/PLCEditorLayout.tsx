import { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Book, BookOpen, FileCode, FileText, ChevronDown, ChevronUp, LogOut, Moon, Sun } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import PLCEditor from "./PLCEditor";

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

  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  if (!user) {
    return null;
  }

  return (
    <SidebarProvider defaultOpen>
      <div className="min-h-screen bg-background flex flex-col w-full">
        {/* Header Bar */}
        <header className="p-4 border-b flex items-center justify-between bg-card">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold">PLC Code-First Editor</h1>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Beta
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">
              {user.email}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleLogout}
              className="h-9 w-9"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Log out</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-grow flex overflow-hidden">
          <Sidebar>
            <SidebarHeader>
              <h3 className="px-4 text-lg font-semibold">PLC Editor</h3>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Code Editor">
                      <FileCode className="w-4 h-4" />
                      <span>Editor</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Documentation">
                      <Book className="w-4 h-4" />
                      <span>Documentation</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="p-4 text-xs text-muted-foreground">
                PLC Code-First Editor
              </div>
            </SidebarFooter>
          </Sidebar>
          <main className="flex-1 overflow-hidden">
            <PLCEditor darkMode={darkMode} />
          </main>
        </div>

        {/* Footer */}
        <footer className="p-2 border-t bg-card text-center text-sm text-muted-foreground">
          <p>PLC Code-First Editor - Changing the way you program PLCs</p>
        </footer>
      </div>
    </SidebarProvider>
  );
};

export default PLCEditorLayout;
