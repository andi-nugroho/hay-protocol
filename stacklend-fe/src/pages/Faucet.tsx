import { SEO } from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Droplets,
  Zap,
  ExternalLink,
  Info,
  Coins,
  ArrowRight,
} from "lucide-react";
import { TestTokenMinter } from "@/features/faucet/components/TestTokenMinter";

const Faucet = () => {
  return (
    <>
      <SEO
        title="StackLend — Test Faucet"
        description="Get test tokens for testing StackLend protocol on Sui testnet"
        canonical="/faucet"
      />

      <section className="space-y-6 animate-enter">
        <header className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Test Token Faucet
            </h1>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Get test USDC and sBTC tokens to test lending, borrowing, and
            bootstrap functionality on Sui testnet. These tokens have no real
            value and are for testing purposes only.
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              <Zap className="h-3 w-3 mr-1" />
              Sui Testnet
            </Badge>
            <Badge variant="outline">Free Testing Tokens</Badge>
          </div>
        </header>

        {/* Main Faucet Component */}
        <TestTokenMinter />

        {/* What to do next */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              What to do next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <Coins className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold">Start Lending</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Supply your tokens to earn yield and help bootstrap liquidity
                  pools
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/lend")}
                  className="flex items-center gap-2"
                >
                  Go to Lend
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Droplets className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold">Try Borrowing</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Use your tokens as collateral to borrow other assets
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = "/borrow")}
                  className="flex items-center gap-2"
                >
                  Go to Borrow
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  window.open(
                    "https://docs.sui.io/guides/developer/getting-started",
                    "_blank",
                  )
                }
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Sui Documentation
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  window.open("https://suiexplorer.com/", "_blank")
                }
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Sui Explorer
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://discord.gg/sui", "_blank")}
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Sui Discord
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </>
  );
};

export default Faucet;
