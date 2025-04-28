
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Code } from "lucide-react";

interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
  category: string;
}

// Sample snippets
const snippets: Snippet[] = [
  {
    id: "1",
    title: "Basic Function Block",
    description: "A simple function block template",
    category: "templates",
    code: `FUNCTION_BLOCK BasicFunctionBlock
VAR_INPUT
    Enable : BOOL;
END_VAR

VAR_OUTPUT
    Done : BOOL;
END_VAR

VAR
    State : INT := 0;
END_VAR

METHOD Execute : BOOL
{
    IF Enable THEN
        Done := TRUE;
    ELSE
        Done := FALSE;
    END_IF;
    
    RETURN Done;
}

END_FUNCTION_BLOCK`
  },
  {
    id: "2",
    title: "PID Controller",
    description: "PID control algorithm implementation",
    category: "algorithms",
    code: `FUNCTION_BLOCK PIDController
VAR_INPUT
    Enable : BOOL;
    Setpoint : REAL;
    ProcessValue : REAL;
    Kp : REAL := 1.0;
    Ti : REAL := 10.0;
    Td : REAL := 0.0;
    SampleTime : REAL := 0.1; // seconds
END_VAR

VAR_OUTPUT
    ControlOutput : REAL;
    Active : BOOL;
END_VAR

VAR
    Error : REAL;
    Integral : REAL := 0.0;
    PrevError : REAL := 0.0;
    Derivative : REAL;
    MaxOutput : REAL := 100.0;
    MinOutput : REAL := 0.0;
END_VAR

METHOD Reset : BOOL
{
    Integral := 0.0;
    PrevError := 0.0;
    RETURN TRUE;
}

METHOD Calculate : BOOL
{
    IF NOT Enable THEN
        Active := FALSE;
        ControlOutput := 0.0;
        RETURN FALSE;
    END_IF;
    
    Active := TRUE;
    
    // Calculate error
    Error := Setpoint - ProcessValue;
    
    // Proportional term
    ControlOutput := Kp * Error;
    
    // Integral term (only if Ti > 0)
    IF Ti > 0.0 THEN
        Integral := Integral + (Error * SampleTime / Ti);
        ControlOutput := ControlOutput + (Kp * Integral);
    END_IF;
    
    // Derivative term
    IF Td > 0.0 THEN
        Derivative := (Error - PrevError) / SampleTime;
        ControlOutput := ControlOutput + (Kp * Td * Derivative);
    END_IF;
    
    // Limit output
    IF ControlOutput > MaxOutput THEN
        ControlOutput := MaxOutput;
    ELSIF ControlOutput < MinOutput THEN
        ControlOutput := MinOutput;
    END_IF;
    
    // Store error for next calculation
    PrevError := Error;
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`
  },
  {
    id: "3",
    title: "Finite State Machine",
    description: "Basic state machine implementation",
    category: "patterns",
    code: `FUNCTION_BLOCK StateMachine
VAR_INPUT
    Start : BOOL;
    Stop : BOOL;
    Reset : BOOL;
    Sensor1 : BOOL;
    Sensor2 : BOOL;
END_VAR

VAR_OUTPUT
    InIdle : BOOL;
    InRunning : BOOL;
    InPaused : BOOL;
    InError : BOOL;
    ActuatorA : BOOL;
    ActuatorB : BOOL;
END_VAR

VAR
    State : INT := 0; // 0=IDLE, 1=RUNNING, 2=PAUSED, 3=ERROR
END_VAR

METHOD Update : BOOL
{
    // Reset all outputs
    InIdle := FALSE;
    InRunning := FALSE;
    InPaused := FALSE;
    InError := FALSE;
    
    // State machine
    CASE State OF
        0: // IDLE
            InIdle := TRUE;
            ActuatorA := FALSE;
            ActuatorB := FALSE;
            
            IF Start THEN
                State := 1; // Go to RUNNING
            END_IF;
            
        1: // RUNNING
            InRunning := TRUE;
            ActuatorA := TRUE;
            
            IF Stop THEN
                State := 2; // Go to PAUSED
            ELSIF Sensor1 AND Sensor2 THEN
                State := 3; // Error condition detected
            END_IF;
            
        2: // PAUSED
            InPaused := TRUE;
            ActuatorA := FALSE;
            ActuatorB := FALSE;
            
            IF Start THEN
                State := 1; // Back to RUNNING
            ELSIF Reset THEN
                State := 0; // Back to IDLE
            END_IF;
            
        3: // ERROR
            InError := TRUE;
            ActuatorA := FALSE;
            ActuatorB := FALSE;
            
            IF Reset THEN
                State := 0; // Back to IDLE
            END_IF;
    END_CASE;
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`
  },
  {
    id: "4",
    title: "Timer Function Block",
    description: "Simple timer implementation",
    category: "utilities",
    code: `FUNCTION_BLOCK Timer
VAR_INPUT
    IN : BOOL;
    PT : TIME;
END_VAR

VAR_OUTPUT
    Q : BOOL;
    ET : TIME;
END_VAR

VAR
    StartTime : TIME;
    Running : BOOL := FALSE;
END_VAR

METHOD Update : BOOL
{
    IF IN AND NOT Running THEN
        // Timer start
        StartTime := TIME_CURRENT();
        Running := TRUE;
        Q := FALSE;
    ELSIF NOT IN AND Running THEN
        // Timer reset
        Running := FALSE;
        ET := T#0s;
        Q := FALSE;
    END_IF;
    
    IF Running THEN
        ET := TIME_CURRENT() - StartTime;
        
        IF ET >= PT THEN
            Q := TRUE;
        END_IF;
    END_IF;
    
    RETURN TRUE;
}

END_FUNCTION_BLOCK`
  },
];

interface CodeSnippetsProps {
  onInsertSnippet: (code: string) => void;
}

export const CodeSnippets = ({ onInsertSnippet }: CodeSnippetsProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  
  // Filter snippets based on search term and category
  const filteredSnippets = snippets.filter(snippet => {
    const matchesSearch = snippet.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         snippet.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = currentTab === "all" || snippet.category === currentTab;
    
    return matchesSearch && matchesCategory;
  });
  
  // Get all unique categories
  const categories = ["all", ...Array.from(new Set(snippets.map(s => s.category)))];
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="w-4 h-4 mr-1" />
          Snippets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[80vh]">
        <DialogHeader>
          <DialogTitle>Code Snippets Library</DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center mb-4">
          <Search className="w-4 h-4 mr-2 text-muted-foreground" />
          <Input
            placeholder="Search snippets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>
        
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="mb-4">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {category}
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value={currentTab} className="mt-0">
            <ScrollArea className="h-[calc(80vh-180px)] pr-4">
              <div className="space-y-4">
                {filteredSnippets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No snippets found matching your search.
                  </div>
                ) : (
                  filteredSnippets.map((snippet) => (
                    <div 
                      key={snippet.id} 
                      className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-all"
                      onClick={() => onInsertSnippet(snippet.code)}
                    >
                      <h3 className="font-medium text-lg mb-1">{snippet.title}</h3>
                      <p className="text-muted-foreground text-sm mb-2">{snippet.description}</p>
                      <div className="bg-muted rounded p-2 text-xs font-mono line-clamp-3 overflow-hidden">
                        {snippet.code.split('\n').slice(0, 3).join('\n')}
                        {snippet.code.split('\n').length > 3 && '...'}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                          {snippet.category}
                        </span>
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          onInsertSnippet(snippet.code);
                        }}>
                          Insert
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
