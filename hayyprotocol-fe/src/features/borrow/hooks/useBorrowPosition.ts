import { BORROW_REGISTRY_ID } from "@/constants/contract/sui";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { hayyProtocolAPI } from "@/lib/api";
import { PRICES_USD } from "@/data/tokens";

export interface BorrowPosition {
  borrower: string;
  sbtcCollateralSui: number;
  sbtcCollateralStacks: number;
  stxCollateralStacks: number;
  usdcBorrowed: number;
  debtOpenedAt: number;
  lastInterestUpdate: number;
  isLiquidatable: boolean;
  // Calculated values
  totalCollateralUsd: number;
  maxBorrowUsd: number;
  healthFactor: number;
}
export function useBorrowPosition() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  return useQuery({
    queryKey: ["borrow-position", currentAccount?.address],
    queryFn: async (): Promise<BorrowPosition | null> => {
      if (!currentAccount?.address) return null;

      try {
        // First try our API for more reliable data
        console.log("Trying API lookup for address:", currentAccount.address);
        
        try {
          const apiResponse = await hayyProtocolAPI.getPositionBySuiAddress(currentAccount.address);
          
          if (apiResponse.success && apiResponse.position) {
            console.log("Found position via API:", apiResponse.position);
            
            const position: BorrowPosition = {
              borrower: apiResponse.position.suiAddress,
              sbtcCollateralSui: apiResponse.position.sbtcCollateral,
              sbtcCollateralStacks: 0,
              stxCollateralStacks: apiResponse.position.stxCollateral,
              usdcBorrowed: apiResponse.position.usdcBorrowed,
              debtOpenedAt: 0,
              lastInterestUpdate: 0,
              isLiquidatable: apiResponse.position.isLiquidatable,
              totalCollateralUsd: apiResponse.position.stxCollateral * PRICES_USD.STX + apiResponse.position.sbtcCollateral * PRICES_USD.sBTC,
              // Calculate max borrow (70% LTV for both sBTC and STX)
              maxBorrowUsd: (apiResponse.position.stxCollateral * PRICES_USD.STX + apiResponse.position.sbtcCollateral * PRICES_USD.sBTC) * 0.7,
              healthFactor: apiResponse.position.usdcBorrowed > 0 ?
                (apiResponse.position.stxCollateral * PRICES_USD.STX + apiResponse.position.sbtcCollateral * PRICES_USD.sBTC) / apiResponse.position.usdcBorrowed : 999,
            };
            
            console.log("Processed API position:", position);
            return position;
          }
        } catch (apiError) {
          console.log("API call failed, falling back to on-chain:", apiError);
        }

        console.log("API lookup failed, trying on-chain...");
        
        // Fallback to on-chain query
        // Get the borrow registry object
        const registryObject = await suiClient.getObject({
          id: BORROW_REGISTRY_ID,
          options: {
            showContent: true,
            showType: true,
          },
        });
        console.log("Borrow Registry:", registryObject);

        // Check if user has a position by checking dynamic fields
        const dynamicFields = await suiClient.getDynamicFields({
          parentId: BORROW_REGISTRY_ID,
        });

        console.log("Dynamic Fields:", dynamicFields);
        console.log("User Address:", currentAccount.address);

        // Look for user's position in dynamic fields
        const userField = dynamicFields.data.find((field: any) => {
          if (field.name && field.name.value === currentAccount.address) {
            return true;
          }
          return false;
        });

        if (!userField) {
          console.log("No position found for user");
          return null;
        }

        // Get the position data
        const positionObject = await suiClient.getObject({
          id: userField.objectId,
          options: {
            showContent: true,
            showType: true,
          },
        });

        console.log("Position Object:", positionObject);

        if (
          positionObject.data?.content &&
          "fields" in positionObject.data.content
        ) {
          const fields = positionObject.data.content.fields as any;

          console.log("Raw position fields:", fields);

          // Extract the actual BorrowPosition from the dynamic field value
          if (fields.value && fields.value.fields) {
            const positionFields = fields.value.fields;

            console.log("BorrowPosition fields:", positionFields);

            // Use centralized prices from PRICES_USD
            const sbtcPriceUsd = PRICES_USD.sBTC;
            const stxPriceUsd = PRICES_USD.STX;

            const sbtcCollateralSui =
              parseInt(positionFields.sbtc_collateral_sui || "0") / 100_000_000; // sBTC has 8 decimals
            const sbtcCollateralStacks =
              parseInt(positionFields.sbtc_collateral_stacks || "0") /
              100_000_000;
            const stxCollateralStacks =
              parseInt(positionFields.stx_collateral_stacks || "0") / 1_000_000; // STX has 6 decimals
            const usdcBorrowed =
              parseInt(positionFields.usdc_borrowed || "0") / 1_000_000; // USDC has 6 decimals

            // Calculate total collateral value in USD
            const totalCollateralUsd =
              (sbtcCollateralSui + sbtcCollateralStacks) * sbtcPriceUsd +
              stxCollateralStacks * stxPriceUsd;

            // Calculate max borrow (70% LTV for both sBTC and STX to match backend)
            const maxBorrowFromSbtc =
              (sbtcCollateralSui + sbtcCollateralStacks) * sbtcPriceUsd * 0.7;
            const maxBorrowFromStx = stxCollateralStacks * stxPriceUsd * 0.7;
            const maxBorrowUsd = maxBorrowFromSbtc + maxBorrowFromStx;

            // Calculate health factor (collateral value / borrowed value)
            const healthFactor =
              usdcBorrowed > 0 ? totalCollateralUsd / usdcBorrowed : 999;

            const position: BorrowPosition = {
              borrower: positionFields.borrower || "",
              sbtcCollateralSui,
              sbtcCollateralStacks,
              stxCollateralStacks,
              usdcBorrowed,
              debtOpenedAt: parseInt(positionFields.debt_opened_at || "0"),
              lastInterestUpdate: parseInt(
                positionFields.last_interest_update || "0",
              ),
              isLiquidatable: positionFields.is_liquidatable || false,
              totalCollateralUsd,
              maxBorrowUsd,
              healthFactor,
            };

            console.log("Processed position:", position);
            return position;
          }
        }

        return null;
      } catch (error) {
        console.error("Error fetching borrow position:", error);
        return null;
      }
    },
    enabled: !!currentAccount?.address,
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

