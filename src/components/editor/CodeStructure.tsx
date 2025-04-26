
import { PLCFunctionBlock, PLCMethod, PLCProperty } from "@/types/plc";

interface CodeStructureProps {
  functionBlocks: PLCFunctionBlock[];
  selectedNode: any;
  setSelectedNode: (node: any) => void;
  navigateToElement: (lineNumber: number) => void;
}

export const CodeStructure = ({ functionBlocks, selectedNode, setSelectedNode, navigateToElement }: CodeStructureProps) => {
  return (
    <div className="w-1/4 bg-background border-r overflow-auto p-2">
      <h2 className="font-semibold mb-2">Structure</h2>
      {functionBlocks.map((fb, fbIndex) => (
        <div key={fbIndex} className="mb-4">
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
                  className="text-sm cursor-pointer hover:bg-secondary rounded p-1"
                  onClick={() => setSelectedNode({ type: 'var', fbIndex, varIndex: vIndex })}
                >
                  <span className="text-xs text-muted-foreground">{v.scope}: </span> 
                  {v.name}: {v.type}
                  {v.initialValue && <span className="text-xs text-muted-foreground"> := {v.initialValue}</span>}
                </div>
              ))}
            </div>
          </div>
          
          {/* Methods */}
          {fb.methods.length > 0 && (
            <div className="ml-4 mt-2">
              <div className="text-sm font-medium text-muted-foreground">Methods</div>
              <div className="ml-2">
                {fb.methods.map((method, methodIndex) => (
                  <div 
                    key={methodIndex}
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
                ))}
              </div>
            </div>
          )}
          
          {/* Properties */}
          {fb.properties.length > 0 && (
            <div className="ml-4 mt-2">
              <div className="text-sm font-medium text-muted-foreground">Properties</div>
              <div className="ml-2">
                {fb.properties.map((prop, propIndex) => (
                  <div 
                    key={propIndex}
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
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
