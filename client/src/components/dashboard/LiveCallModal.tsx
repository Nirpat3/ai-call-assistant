import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LiveCallModalProps {
  callData: any;
  onClose: () => void;
}

export default function LiveCallModal({ callData, onClose }: LiveCallModalProps) {
  const handleTakeCall = () => {
    console.log("Taking over active call...");
    onClose();
  };

  const handleLetAIContinue = () => {
    console.log("Letting AI continue handling call...");
    onClose();
  };

  return (
    <Dialog open={!!callData} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogTitle className="sr-only">Live Call Management</DialogTitle>
        <DialogDescription className="sr-only">
          Manage an active call - you can take over or let AI continue handling it
        </DialogDescription>
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-phone text-accent text-2xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Call in Progress</h3>
          <p className="text-sm text-gray-600 mb-1">
            {callData?.CallerName || "Unknown Caller"}
          </p>
          <p className="text-xs text-gray-500 mb-4">{callData?.From}</p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-900 font-medium mb-2">AI Response:</p>
            <p className="text-sm text-gray-600 italic">
              "I understand you're calling for assistance. Let me help you with that right away."
            </p>
          </div>
          
          <div className="flex space-x-3">
            <Button 
              onClick={handleTakeCall}
              className="flex-1"
            >
              Take Call
            </Button>
            <Button 
              variant="outline"
              onClick={handleLetAIContinue}
              className="flex-1"
            >
              Let AI Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
