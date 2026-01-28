import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutateMintMockUsdc } from "@/features/faucet/hooks/useMutateMintMockUsdc";
import { Coins } from "lucide-react";
import { useMutateMintMockSbtc } from "../hooks/useMutateMintMockSbtc";

interface TestTokenMinterProps {
  onMintSuccess?: (token: string, amount: number) => void;
}

export const TestTokenMinter: React.FC<TestTokenMinterProps> = ({
  onMintSuccess,
}) => {
  const [usdcAmount, setUsdcAmount] = useState("1000");
  const [sbtcAmount, setSbtcAmount] = useState("0.01");

  const {
    mutateAsync: mutateMintMockUsdc,
    isPending: isMutateMintMockUsdcPending,
  } = useMutateMintMockUsdc();

  const {
    mutateAsync: mutateMintMockSbtc,
    isPending: isMutateMintMockSbtcPending,
  } = useMutateMintMockSbtc();

  const isLoading = isMutateMintMockUsdcPending || isMutateMintMockSbtcPending;

  const handleMintUSDC = async () => {
    const amount = parseFloat(usdcAmount);
    if (!amount || amount <= 0) return;

    try {
      await mutateMintMockUsdc({ amount });
      onMintSuccess?.("USDC", amount);
      setUsdcAmount("1000");
    } catch (error) {
      console.error("USDC mint failed:", error);
    }
  };

  const handleMintSBTC = async () => {
    const amount = parseFloat(sbtcAmount);
    if (!amount || amount <= 0) return;

    try {
      await mutateMintMockSbtc({ amount });
      onMintSuccess?.("sBTC", amount);
      setSbtcAmount("0.01");
    } catch (error) {
      console.error("sBTC mint failed:", error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* USDC Faucet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">$</span>
            </div>
            Mint USDC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="usdc-amount">Amount (USDC)</Label>
            <Input
              id="usdc-amount"
              type="number"
              value={usdcAmount}
              onChange={(e) => setUsdcAmount(e.target.value)}
              placeholder="1000"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUsdcAmount("1000")}
            >
              1K
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUsdcAmount("5000")}
            >
              5K
            </Button>
          </div>

          <Button
            onClick={handleMintUSDC}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? <>Minting...</> : <>Mint {usdcAmount} USDC</>}
          </Button>
        </CardContent>
      </Card>

      {/* sBTC Faucet */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">₿</span>
            </div>
            Mint sBTC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sbtc-amount">Amount (sBTC)</Label>
            <Input
              id="sbtc-amount"
              type="number"
              value={sbtcAmount}
              onChange={(e) => setSbtcAmount(e.target.value)}
              placeholder="0.01"
              step="0.001"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSbtcAmount("0.01")}
            >
              0.01
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSbtcAmount("0.005")}
            >
              0.005
            </Button>
          </div>

          <Button
            onClick={handleMintSBTC}
            disabled={isLoading}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {isLoading ? <>Minting...</> : <>Mint {sbtcAmount} sBTC</>}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
