import { useState } from "react";
import { PLCFunctionBlock, PLCMethod, PLCProperty, PLCStatement, PLCAssignmentStatement, PLCIfStatement, PLCProgram, PLCFunction, PLCVariable } from "@/types/plc"; // Import Program, Function, Variable
import { ChevronDown, ChevronRight, FileCode, FunctionSquare, Database } from "lucide-react"; // Add icons

interface CodeStructureProps {
  functionBlocks: PLCFunctionBlock[];
  programs: PLCProgram[]; // Add programs prop
  functions: PLCFunction[]; // Add functions prop
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  onNavigate: (lineNumber: number) => void; // Renamed prop for clarity
}

export const CodeStructure = ({
  functionBlocks,
  programs, // Destructure programs
  functions, // Destructure functions
  selectedNode,
  setSelectedNode,
  onNavigate
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
    <div className="w-full h-full bg-background border-r overflow-auto p-2">
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

        {isProjectExpanded && (
          <>
            {/* Function Blocks */}
            {functionBlocks.map((fb, fbIndex) => (
              <div key={`fb-${fbIndex}`} className="ml-4">
                <div
                  className={`flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-secondary ${
                    selectedNode?.type === 'fb' && selectedNode?.index === fbIndex ? 'bg-secondary' : ''
                  }`}
                  onClick={() => {
                    setSelectedNode({ type: 'fb', index: fbIndex });
                    if (fb.lineNumber > 0) onNavigate(fb.lineNumber); // Navigate if line number exists
                  }}
                >
                  <Database className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                  <span className="font-medium truncate">{fb.name}</span>
                </div>

                {/* FB Variables */}
                <div className="ml-4 mt-1">
                  <div className="text-sm font-medium text-muted-foreground">Variables</div>
                  <div className="ml-2">
                    {fb.variables.map((v, vIndex) => (
                      <VariableNode
                        key={`fb-${fbIndex}-var-${vIndex}`}
                        variable={v}
                        selectedNode={selectedNode}
                        setSelectedNode={setSelectedNode}
                        highlightVariable={highlightVariable}
                        path={['fb', fbIndex, 'var', vIndex]}
                      />
                    ))}
                  </div>
                </div>

                {/* Methods */}
                <div className="ml-4 mt-2">
                  <div className="text-sm font-medium text-muted-foreground">Methods</div>
                  <div className="ml-2">
                    {fb.methods.map((method, methodIndex) => (
                      <div key={`fb-${fbIndex}-method-${methodIndex}`} className="flex flex-col">
                        <div
                          className={`flex items-center gap-1 text-sm cursor-pointer hover:bg-secondary rounded p-1 ${
                            selectedNode?.type === 'method' && selectedNode?.path?.[0] === 'fb' &&
                            selectedNode?.path?.[1] === fbIndex && selectedNode?.path?.[3] === methodIndex ? 'bg-secondary' : ''
                          }`}
                          onClick={() => {
                            setSelectedNode({ type: 'method', path: ['fb', fbIndex, 'method', methodIndex] });
                            if (method.lineNumber > 0) onNavigate(method.lineNumber); // Navigate if line number exists
                          }}
                        >
                           <FunctionSquare className="w-3 h-3 text-purple-500 flex-shrink-0" />
                           <span className="truncate">{method.name}: {method.returnType}</span>
                        </div>
                        {/* Method Parameters & Local Variables (Optional Display) */}
                        {/* Display Statements within Method */}
                        {method.statements && method.statements.length > 0 && (
                          <div className="ml-4">
                            {method.statements.map((statement, stmtIndex) => (
                              <StatementNode
                                key={stmtIndex} // Key prop is correctly placed here
                                statement={statement}
                                selectedNode={selectedNode}
                                setSelectedNode={setSelectedNode}
                                onNavigate={onNavigate} // Pass down onNavigate
                                path={['fb', fbIndex, 'method', methodIndex, 'stmt', stmtIndex]} // More specific path
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
                        <div key={`fb-${fbIndex}-prop-${propIndex}`} className="flex flex-col">
                          <div
                            className={`flex items-center gap-1 text-sm cursor-pointer hover:bg-secondary rounded p-1 ${
                               selectedNode?.type === 'property' && selectedNode?.path?.[0] === 'fb' &&
                               selectedNode?.path?.[1] === fbIndex && selectedNode?.path?.[3] === propIndex ? 'bg-secondary' : ''
                            }`}
                            onClick={() => {
                              setSelectedNode({ type: 'property', path: ['fb', fbIndex, 'prop', propIndex] });
                              if (prop.lineNumber > 0) onNavigate(prop.lineNumber); // Navigate if line number exists
                            }}
                          >
                             {/* Add an icon for properties? */}
                             <span className="truncate">{prop.name}: {prop.type}</span>
                             <span className="text-xs text-muted-foreground ml-1">
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
                                  onNavigate={onNavigate} // Pass down onNavigate
                                  path={['fb', fbIndex, 'prop', propIndex, 'stmt', stmtIndex]} // More specific path
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

            {/* Programs */}
            {programs.map((prog, progIndex) => (
              <div key={`prog-${progIndex}`} className="ml-4 mt-2">
                <div
                  className={`flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-secondary ${
                    selectedNode?.type === 'program' && selectedNode?.index === progIndex ? 'bg-secondary' : ''
                  }`}
                  onClick={() => {
                    setSelectedNode({ type: 'program', index: progIndex });
                    if (prog.lineNumber > 0) onNavigate(prog.lineNumber); // Navigate if line number exists
                  }}
                >
                  <FileCode className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <span className="font-medium truncate">{prog.name}</span>
                </div>
                {/* Program Variables */}
                <div className="ml-4 mt-1">
                   <div className="text-sm font-medium text-muted-foreground">Variables</div>
                   <div className="ml-2">
                      {prog.variables.map((v, vIndex) => (
                         <VariableNode
                           key={`prog-${progIndex}-var-${vIndex}`}
                           variable={v}
                           selectedNode={selectedNode}
                           setSelectedNode={setSelectedNode}
                           highlightVariable={highlightVariable}
                           path={['program', progIndex, 'var', vIndex]}
                         />
                      ))}
                   </div>
                </div>
                 {/* Program Statements */}
                 {prog.statements && prog.statements.length > 0 && (
                    <div className="ml-4 mt-1">
                       <div className="text-sm font-medium text-muted-foreground">Statements</div>
                       <div className="ml-2">
                          {prog.statements.map((statement, stmtIndex) => (
                             <StatementNode
                               key={`prog-${progIndex}-stmt-${stmtIndex}`}
                               statement={statement}
                               selectedNode={selectedNode}
                               setSelectedNode={setSelectedNode}
                               onNavigate={onNavigate} // Pass down onNavigate
                               path={['program', progIndex, 'stmt', stmtIndex]}
                             />
                          ))}
                       </div>
                    </div>
                 )}
              </div>
            ))}

             {/* Functions */}
             {functions.map((func, funcIndex) => (
               <div key={`func-${funcIndex}`} className="ml-4 mt-2">
                 <div
                   className={`flex items-center gap-1 p-1 rounded cursor-pointer hover:bg-secondary ${
                     selectedNode?.type === 'function' && selectedNode?.index === funcIndex ? 'bg-secondary' : ''
                   }`}
                   onClick={() => {
                     setSelectedNode({ type: 'function', index: funcIndex });
                     if (func.lineNumber > 0) onNavigate(func.lineNumber); // Navigate if line number exists
                   }}
                 >
                   <FunctionSquare className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                   <span className="font-medium truncate">{func.name}: {func.returnType}</span>
                 </div>
                 {/* Function Parameters */}
                 {func.parameters.length > 0 && (
                    <div className="ml-4 mt-1">
                       <div className="text-sm font-medium text-muted-foreground">Parameters</div>
                       <div className="ml-2">
                          {func.parameters.map((v, vIndex) => (
                             <VariableNode
                               key={`func-${funcIndex}-param-${vIndex}`}
                               variable={v}
                               selectedNode={selectedNode}
                               setSelectedNode={setSelectedNode}
                               highlightVariable={highlightVariable}
                               path={['function', funcIndex, 'param', vIndex]}
                             />
                          ))}
                       </div>
                    </div>
                 )}
                  {/* Function Local Variables */}
                  {func.localVariables.length > 0 && (
                     <div className="ml-4 mt-1">
                        <div className="text-sm font-medium text-muted-foreground">Local Variables</div>
                        <div className="ml-2">
                           {func.localVariables.map((v, vIndex) => (
                              <VariableNode
                                key={`func-${funcIndex}-local-${vIndex}`}
                                variable={v}
                                selectedNode={selectedNode}
                                setSelectedNode={setSelectedNode}
                                highlightVariable={highlightVariable}
                                path={['function', funcIndex, 'local', vIndex]}
                              />
                           ))}
                        </div>
                     </div>
                  )}
                  {/* Function Statements */}
                  {func.statements && func.statements.length > 0 && (
                     <div className="ml-4 mt-1">
                        <div className="text-sm font-medium text-muted-foreground">Statements</div>
                        <div className="ml-2">
                           {func.statements.map((statement, stmtIndex) => (
                              <StatementNode
                                key={`func-${funcIndex}-stmt-${stmtIndex}`}
                                statement={statement}
                                selectedNode={selectedNode}
                                setSelectedNode={setSelectedNode}
                                onNavigate={onNavigate} // Pass down onNavigate
                                path={['function', funcIndex, 'stmt', stmtIndex]}
                              />
                           ))}
                        </div>
                     </div>
                  )}
               </div>
             ))}
          </>
        )}
      </div>
    </div>
  );
};

// --- Helper Components (Moved Outside Main Component) ---

// Helper component to render a variable node
const VariableNode = ({ variable, selectedNode, setSelectedNode, highlightVariable, path }: {
  variable: PLCVariable;
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  highlightVariable: (variable: PLCVariable) => void;
  path: (string | number)[]; // Path for selection tracking
}) => {
  const nodeId = `${path.join('-')}`;
  const isSelected = selectedNode?.type === 'variable' && selectedNode?.id === nodeId;

  return (
    <div
      className={`flex items-center gap-1 text-sm cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`} // Added flex layout
      onClick={() => {
        setSelectedNode({ type: 'variable', id: nodeId, path });
        highlightVariable(variable); // Highlight occurrences
        // Optionally navigate to declaration line if needed in the future:
        // if (variable.lineNumber > 0) navigateToElement(variable.lineNumber);
      }}
    >
      {/* Optional: Add an icon based on scope? */}
      <span className="text-xs text-muted-foreground w-16 flex-shrink-0">({variable.scope})</span> {/* Fixed width for alignment */}
      <span className="truncate">{variable.name}: {variable.type}</span> {/* Allow name/type to truncate */}
      {variable.initialValue && <span className="text-xs text-muted-foreground ml-1"> := {variable.initialValue}</span>}
      {variable.comment && <span className="text-xs text-muted-foreground italic ml-1"> // {variable.comment}</span>}
    </div>
  );
};


// Helper component to render different statement types
const StatementNode = ({ statement, selectedNode, setSelectedNode, onNavigate, path }: {
  statement: PLCStatement;
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  onNavigate: (lineNumber: number) => void; // Use onNavigate here too for consistency
  path: (string | number)[]; // Array of strings/indices to uniquely identify the node
}) => {
  // Construct a unique ID for the statement node for selection tracking
  const nodeId = `${path.join('-')}`; // Use path directly for ID
  const isSelected = selectedNode?.type === 'statement' && selectedNode?.id === nodeId;

  const handleClick = () => {
    setSelectedNode({ type: 'statement', id: nodeId, path }); // Store the generated ID and path
    if (statement.lineNumber > 0) onNavigate(statement.lineNumber); // Navigate to statement line
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
                onNavigate={onNavigate}
                path={[...path, 'then', thenIndex]} // Append index for nested path
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
                onClick={() => onNavigate(elsifBlock.statements[0]?.lineNumber || statement.lineNumber)} // Navigate to first statement or IF line
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
                      onNavigate={onNavigate}
                      path={[...path, 'elsif', elsifIndex, innerIndex]} // Append indices for nested path
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
                 onClick={() => onNavigate(statement.elseStatements[0]?.lineNumber || statement.lineNumber)} // Navigate to first statement or IF line
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
                       onNavigate={onNavigate}
                       path={[...path, 'else', innerIndex]} // Append index for nested path
                    />
                 ))}
              </div>
           </div>
        )}
        <div
           className={`text-xs cursor-pointer hover:bg-secondary rounded p-1 ${isSelected ? 'bg-secondary' : ''}`} // Selection might need refinement for END_IF
           onClick={() => onNavigate(statement.lineNumber)} // Navigate back to IF line for END_IF
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
