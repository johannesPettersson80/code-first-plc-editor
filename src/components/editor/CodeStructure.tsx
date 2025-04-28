import { useState } from "react";
import { PLCFunctionBlock, PLCMethod, PLCProperty, PLCStatement, PLCAssignmentStatement, PLCIfStatement } from "@/types/plc"; // Import PLCStatement and specific types
import { ChevronDown, ChevronRight } from "lucide-react";

interface CodeStructureProps {
  functionBlocks: PLCFunctionBlock[];
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  navigateToElement: (lineNumber: number) => void;
}

export const CodeStructure = ({
  functionBlocks,
  selectedNode,
  setSelectedNode,
  navigateToElement
}: CodeStructureProps) => {
  const projectName = "PLC Project"; // In a real app, this would come from props
  const [isProjectExpanded, setIsProjectExpanded] = useState(true);

  const highlightVariable = (variable: { name: string }) => {
    // Check if monaco is available in the window object
    if (typeof window.monaco === "undefined") return;
    
    const editor = window.monaco.editor.getEditors()[0];
    if (!editor) return;

    const model = editor.getModel();
    if (!model) return;

    // Clear previous decorations
    const oldDecorations = model.getAllDecorations() || [];
    editor.deltaDecorations(
      oldDecorations.map(d => d.id),
      []
    );

    // Find and highlight all occurrences of the variable
    const matches = model.findMatches(variable.name, false, false, true, null, false);
    if (matches.length > 0) {
      // First move to the first occurrence
      editor.setSelection(matches[0].range);
      editor.revealLineInCenter(matches[0].range.startLineNumber);
      
      // Then highlight all occurrences with a decoration
      const decorations = matches.map(match => ({
        range: match.range,
        options: {
          inlineClassName: 'bg-primary/20 rounded px-1'
        }
      }));
      
      editor.deltaDecorations([], decorations);
    }
  };

  return (
    <div className="w-1/4 bg-background border-r overflow-auto p-2">
      <h2 className="font-semibold mb-2">Structure</h2>
      
      {/* Project Level */}
      <div className="mb-4">
        <div 
          className="flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-secondary"
          onClick={() => setIsProjectExpanded(!isProjectExpanded)}
        >
          {isProjectExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          <span className="font-medium">{projectName}</span>
        </div>
        
        {isProjectExpanded && functionBlocks.map((fb, fbIndex) => (
          <div key={fbIndex} className="ml-4">
            <div 
              className={`flex items-center p-1 rounded cursor-pointer hover:bg-secondary ${
                selectedNode?.type === 'fb' && selectedNode?.index === fbIndex ? 'bg-secondary' : ''
              }`}
              onClick={() => {
                setSelectedNode({ type: 'fb', index: fbIndex });
                navigateToElement(fb.lineNumber);
              }}
            >
              <span className="font-medium">FB: {fb.name}</span>
            </div>
            
            {/* Variables */}
            <div className="ml-4 mt-1">
              <div className="text-sm font-medium text-muted-foreground">Variables</div>
              <div className="ml-2">
                {fb.variables.map((v, vIndex) => (
                  <div 
                    key={vIndex}
                    className={`text-sm cursor-pointer hover:bg-secondary rounded p-1 ${
                      selectedNode?.type === 'var' && selectedNode?.fbIndex === fbIndex 
                      && selectedNode?.varIndex === vIndex ? 'bg-secondary' : ''
                    }`}
                    onClick={() => {
                      setSelectedNode({ type: 'var', fbIndex, varIndex: vIndex });
                      highlightVariable(v);
                    }}
                  >
                    <span className="text-xs text-muted-foreground">{v.scope}: </span> 
                    {v.name}: {v.type}
                    {v.initialValue && <span className="text-xs text-muted-foreground"> := {v.initialValue}</span>}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Methods */}
            <div className="ml-4 mt-2">
              <div className="text-sm font-medium text-muted-foreground">Methods</div>
              <div className="ml-2">
                {fb.methods.map((method, methodIndex) => (
                  <div key={methodIndex} className="flex flex-col">
                    <div 
                      className={`text-sm cursor-pointer hover:bg-secondary rounded p-1 ${
                        selectedNode?.type === 'method' && selectedNode?.fbIndex === fbIndex && 
                        selectedNode?.methodIndex === methodIndex ? 'bg-secondary' : ''
                      }`}
                      onClick={() => {
                        setSelectedNode({ type: 'method', fbIndex, methodIndex });
                        navigateToElement(method.lineNumber);
                      }}
                    >
                      {method.name}: {method.returnType}
                    </div>
                    {/* Display Statements within Method */}
                    {method.statements && method.statements.length > 0 && (
                      <div className="ml-4">
                        {method.statements.map((statement, stmtIndex) => (
                          <StatementNode 
                            key={stmtIndex} // Key prop is correctly placed here
                            statement={statement}
                            selectedNode={selectedNode}
                            setSelectedNode={setSelectedNode}
                            navigateToElement={navigateToElement}
                            path={[fbIndex, methodIndex, stmtIndex]} // Path for selection tracking
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Properties */}
            {fb.properties.length > 0 && (
              <div className="ml-4 mt-2">
                <div className="text-sm font-medium text-muted-foreground">Properties</div>
                <div className="ml-2">
                  {fb.properties.map((prop, propIndex) => (
                    <div key={propIndex} className="flex flex-col">
                      <div 
                        className={`text-sm cursor-pointer hover:bg-secondary rounded p-1 ${
                          selectedNode?.type === 'property' && selectedNode?.fbIndex === fbIndex && 
                          selectedNode?.propIndex === propIndex ? 'bg-secondary' : ''
                        }`}
                        onClick={() => {
                          setSelectedNode({ type: 'property', fbIndex, propIndex });
                          navigateToElement(prop.lineNumber);
                        }}
                      >
                        {prop.name}: {prop.type}
                        <span className="text-xs text-muted-foreground">
                          {prop.hasGetter && " [GET]"}
                          {prop.hasSetter && " [SET]"}
                        </span>
                      </div>
                      {/* Display Statements within Property */}
                      {prop.statements && prop.statements.length > 0 && (
                        <div className="ml-4">
                          {prop.statements.map((statement, stmtIndex) => (
                            <StatementNode 
                              key={stmtIndex} // Key prop is correctly placed here
                              statement={statement}
                              selectedNode={selectedNode}
                              setSelectedNode={setSelectedNode}
                              navigateToElement={navigateToElement}
                              path={[fbIndex, propIndex, stmtIndex]} // Path for selection tracking
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper component to render different statement types
const StatementNode = ({ statement, selectedNode, setSelectedNode, navigateToElement, path }: {
  statement: PLCStatement;
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  navigateToElement: (lineNumber: number) => void;
  path: number[]; // Array of indices to uniquely identify the statement
}) => {
  // Construct a unique ID for the statement node for selection tracking
  const nodeId = `statement-${path.join('-')}`;
  const isSelected = selectedNode?.type === 'statement' && selectedNode?.id === nodeId;

  const handleClick = () => {
    setSelectedNode({ type: 'statement', id: nodeId, path }); // Store the generated ID and path
    navigateToElement(statement.lineNumber);
  };

  if (statement.type === 'assignment') {
    return (
      <div 
        className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`}
        onClick={handleClick}
      >
        {statement.targetVariable} := ...
      </div>
    );
  } else if (statement.type === 'if') {
    return (
      <div className="flex flex-col">
        <div 
          className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`}
          onClick={handleClick}
        >
          IF {statement.condition} THEN
        </div>
        {/* Render THEN statements */}
        {statement.thenStatements.length > 0 && (
          <div className="ml-4">
            {statement.thenStatements.map((thenStmt, thenIndex) => (
              <StatementNode 
                key={thenIndex} // Key prop is correctly placed here
                statement={thenStmt}
                selectedNode={selectedNode}
                setSelectedNode={setSelectedNode}
                navigateToElement={navigateToElement}
                path={[...path, thenIndex]} // Append index for nested path
              />
            ))}
          </div>
        )}
        {/* Render ELSIF blocks */}
        {statement.elseIfStatements && statement.elseIfStatements.length > 0 && (
          statement.elseIfStatements.map((elsifBlock, elsifIndex) => (
            <div key={elsifIndex} className="flex flex-col"> {/* Key prop is correctly placed here */}
              <div 
                className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`} // Selection might need refinement for ELSIF/ELSE
                onClick={() => navigateToElement(elsifBlock.statements[0]?.lineNumber || statement.lineNumber)} // Navigate to first statement or IF line
              >
                ELSIF {elsifBlock.condition} THEN
              </div>
              {elsifBlock.statements.length > 0 && (
                <div className="ml-4">
                  {elsifBlock.statements.map((elsifStmt, innerIndex) => (
                    <StatementNode 
                      key={innerIndex} // Key prop is correctly placed here
                      statement={elsifStmt}
                      selectedNode={selectedNode}
                      setSelectedNode={setSelectedNode}
                      navigateToElement={navigateToElement}
                      path={[...path, elsifIndex, innerIndex]} // Append indices for nested path
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
        {/* Render ELSE block */}
        {statement.elseStatements && statement.elseStatements.length > 0 && (
           <div key="else-block" className="flex flex-col"> {/* Add a key for the ELSE block */}
              <div 
                 className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`} // Selection might need refinement for ELSIF/ELSE
                 onClick={() => navigateToElement(statement.elseStatements[0]?.lineNumber || statement.lineNumber)} // Navigate to first statement or IF line
              >
                 ELSE
              </div>
              <div className="ml-4">
                 {statement.elseStatements.map((elseStmt, innerIndex) => (
                    <StatementNode 
                       key={innerIndex} // Key prop is correctly placed here
                       statement={elseStmt}
                       selectedNode={selectedNode}
                       setSelectedNode={setSelectedNode}
                       navigateToElement={navigateToElement}
                       path={[...path, innerIndex]} // Append index for nested path (simpler path for ELSE)
                    />
                 ))}
              </div>
           </div>
        )}
        <div 
           className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`} // Selection might need refinement for END_IF
           onClick={() => navigateToElement(statement.lineNumber)} // Navigate back to IF line for END_IF
        >
           END_IF
        </div>
      </div>
    );
  }

  // Fallback for unhandled statement types - Avoid accessing .type directly
  return (
    <div className="text-xs text-muted-foreground p-1">
      Unsupported Statement Type (unsupported in structure view)
    </div>
  );
};
