import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

export const BridgeDialog = ({ open }: { open: boolean }) => {
  return (
    <Dialog open={open}>
      <DialogContent className="card-brut max-w-sm">
        <div className="flex flex-col items-center text-center gap-3 py-4">
          <Loader2 className="size-8 animate-spin" />
          <h3 className="font-semibold text-lg">Bridge in progress…</h3>
          <p className="text-sm text-muted-foreground">Your assets are moving securely. This will only take a moment.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
