import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppState } from "@/hooks/use-app-state";
import { useStacks } from "@/hooks/use-stacks";
import { toast } from "@/hooks/use-toast";
import { LogOutIcon, Wallet } from "lucide-react";
import {
  ConnectModal,
  useCurrentAccount,
  useDisconnectWallet,
} from "@mysten/dapp-kit";

export const WalletConnect = () => {
  const { wallet, connectStacks, disconnect } = useAppState();
  const { isConnected: stacksConnected, address: stacksAddress } = useStacks();
  const [open, setOpen] = useState(false);

  const [isSuiWalletOpen, setIsSuiWalletOpen] = useState(false);
  const suiAccount = useCurrentAccount();
  const { mutate: suiWalletDisconnect } = useDisconnectWallet();

  const onConnectStacks = () => {
    connectStacks();
    toast({ title: "Stacks wallet connected" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {wallet || stacksConnected ? (
          <Button variant="brutal" className="hover-scale">
            <Wallet className="mr-2" />
            Switch Wallet
          </Button>
        ) : (
          <Button variant="brutal" className="hover-scale">
            <Wallet className="mr-2" />
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="card-brut max-w-md">
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
          <DialogDescription>Select a wallet to continue</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          {/* Stacks Wallet Button */}
          {!stacksConnected ? (
            <Button
              variant="outline"
              className="border-2 border-border"
              onClick={onConnectStacks}
            >
              Connect Stacks (Hiro)
            </Button>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 text-xs">
                <div className="flex items-center">
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: "#f7931a" }}
                  />
                  Stacks
                </div>
              </Button>

              <Button variant="outline" className="flex-1 text-xs">
                {stacksAddress
                  ? `${stacksAddress.slice(0, 6)}...${stacksAddress.slice(-4)}`
                  : "Connected"}
              </Button>
            </div>
          )}

          {/* Sui Wallet Connect Button */}
          {!suiAccount ? (
            <ConnectModal
              trigger={
                <Button
                  variant="outline"
                  className="border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600 transition-all cursor-pointer"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Connect Wallet</span>
                  <span className="sm:hidden">Connect</span>
                </Button>
              }
              open={isSuiWalletOpen}
              onOpenChange={(isSuiWalletOpen) =>
                setIsSuiWalletOpen(isSuiWalletOpen)
              }
            />
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 text-xs">
                <div className="flex items-center">Sui</div>
              </Button>

              <Button variant="outline" className="flex-1 text-xs">
                {suiAccount.address
                  ? `${suiAccount.address.slice(0, 6)}...${suiAccount.address.slice(-4)}`
                  : "Connected"}
              </Button>

              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => suiWalletDisconnect()}
              >
                <LogOutIcon />
              </Button>
            </div>
          )}

          {(wallet || stacksConnected) && (
            <Button
              variant="destructive"
              onClick={() => {
                disconnect();
                toast({ title: "Disconnected" });
                setOpen(false);
              }}
            >
              Disconnect
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

