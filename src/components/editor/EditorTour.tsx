
import { useEffect, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TourStep {
  targetId: string;
  content: string;
  placement?: "top" | "bottom" | "left" | "right";
}

const tourSteps: TourStep[] = [
  {
    targetId: "editor",
    content: "This is your main code editor. Write your PLC code here.",
    placement: "bottom",
  },
  {
    targetId: "file-manager",
    content: "Manage your files, create new ones, or switch between existing files.",
    placement: "right",
  },
  {
    targetId: "code-structure",
    content: "View and navigate your code's structure - functions, methods, and properties.",
    placement: "right",
  },
];

export const EditorTour = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("plcEditorTourSeen");
    if (!hasSeenTour) {
      setIsTourActive(true);
    }
  }, []);

  const completeTour = () => {
    setIsTourActive(false);
    localStorage.setItem("plcEditorTourSeen", "true");
  };

  if (!isTourActive) return null;

  const currentTourStep = tourSteps[currentStep];

  return (
    <TooltipProvider>
      {isTourActive && currentTourStep && (
        <Tooltip open={true}>
          <TooltipTrigger asChild>
            <div
              className="absolute z-50"
              style={{
                top: `var(--tour-${currentTourStep.targetId}-top, 50%)`,
                left: `var(--tour-${currentTourStep.targetId}-left, 50%)`,
              }}
            />
          </TooltipTrigger>
          <TooltipContent
            side={currentTourStep.placement}
            className="p-4 max-w-xs"
          >
            <p>{currentTourStep.content}</p>
            <div className="flex justify-between mt-2">
              <button
                className="text-sm text-primary"
                onClick={() =>
                  setCurrentStep((prev) =>
                    prev > 0 ? prev - 1 : tourSteps.length - 1
                  )
                }
              >
                Previous
              </button>
              {currentStep === tourSteps.length - 1 ? (
                <button
                  className="text-sm font-semibold text-primary"
                  onClick={completeTour}
                >
                  Finish
                </button>
              ) : (
                <button
                  className="text-sm text-primary"
                  onClick={() =>
                    setCurrentStep((prev) =>
                      prev < tourSteps.length - 1 ? prev + 1 : 0
                    )
                  }
                >
                  Next
                </button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};
