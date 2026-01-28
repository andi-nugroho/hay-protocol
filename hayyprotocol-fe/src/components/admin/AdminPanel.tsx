import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminUnlockCollateral, adminEmergencyWithdraw } from '@/lib/stacks-transactions';
import { toast } from '@/hooks/use-toast';

export const AdminPanel = () => {
  const [userAddress, setUserAddress] = useState('');
  const [unlockAmount, setUnlockAmount] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  
  const [emergencyRecipient, setEmergencyRecipient] = useState('');
  const [emergencyAmount, setEmergencyAmount] = useState('');
  const [isEmergencyWithdrawing, setIsEmergencyWithdrawing] = useState(false);

  const handleUnlockCollateral = async () => {
    if (!userAddress || !unlockAmount) {
      toast({
        title: "Error",
        description: "Please fill in user address and unlock amount",
        variant: "destructive"
      });
      return;
    }

    setIsUnlocking(true);
    try {
      await adminUnlockCollateral(
        userAddress,
        unlockAmount,
        (data) => {
          console.log('Unlock success:', data);
          toast({
            title: "Success!",
            description: `Unlocked ${(parseInt(unlockAmount) / 1000000).toFixed(6)} STX for user`,
          });
          setUserAddress('');
          setUnlockAmount('');
        },
        () => {
          toast({
            title: "Cancelled",
            description: "Unlock operation was cancelled",
            variant: "destructive"
          });
        }
      );
    } catch (error) {
      console.error('Unlock failed:', error);
      toast({
        title: "Error",
        description: "Failed to unlock collateral",
        variant: "destructive"
      });
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!emergencyRecipient || !emergencyAmount) {
      toast({
        title: "Error", 
        description: "Please fill in recipient address and emergency amount",
        variant: "destructive"
      });
      return;
    }

    setIsEmergencyWithdrawing(true);
    try {
      await adminEmergencyWithdraw(
        emergencyRecipient,
        emergencyAmount,
        (data) => {
          console.log('Emergency withdraw success:', data);
          toast({
            title: "Success!",
            description: `Emergency withdrawal of ${(parseInt(emergencyAmount) / 1000000).toFixed(6)} STX completed`,
          });
          setEmergencyRecipient('');
          setEmergencyAmount('');
        },
        () => {
          toast({
            title: "Cancelled",
            description: "Emergency withdrawal was cancelled",
            variant: "destructive"
          });
        }
      );
    } catch (error) {
      console.error('Emergency withdraw failed:', error);
      toast({
        title: "Error",
        description: "Failed to perform emergency withdrawal",
        variant: "destructive"
      });
    } finally {
      setIsEmergencyWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          <strong>Admin Panel:</strong> These functions are for manual operations normally handled by the relayer.
          Only contract admin can execute these functions.
        </AlertDescription>
      </Alert>

      {/* Unlock Collateral */}
      <Card>
        <CardHeader>
          <CardTitle>🔓 Unlock User Collateral</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="userAddress">User Address (Principal)</Label>
            <Input
              id="userAddress"
              placeholder="ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="unlockAmount">Amount to Unlock (microSTX)</Label>
            <Input
              id="unlockAmount"
              type="number"
              placeholder="1000000 (= 1 STX)"
              value={unlockAmount}
              onChange={(e) => setUnlockAmount(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {unlockAmount && `= ${(parseInt(unlockAmount) / 1000000).toFixed(6)} STX`}
            </p>
          </div>

          <Button 
            onClick={handleUnlockCollateral}
            disabled={isUnlocking || !userAddress || !unlockAmount}
            className="w-full"
          >
            {isUnlocking ? 'Unlocking...' : 'Unlock Collateral'}
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Withdrawal */}
      <Card>
        <CardHeader>
          <CardTitle>🚨 Emergency Withdrawal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="emergencyRecipient">Recipient Address</Label>
            <Input
              id="emergencyRecipient"
              placeholder="ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF"
              value={emergencyRecipient}
              onChange={(e) => setEmergencyRecipient(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="emergencyAmount">Amount (microSTX)</Label>
            <Input
              id="emergencyAmount"
              type="number"
              placeholder="1000000 (= 1 STX)"
              value={emergencyAmount}
              onChange={(e) => setEmergencyAmount(e.target.value)}
            />
            <p className="text-sm text-gray-500 mt-1">
              {emergencyAmount && `= ${(parseInt(emergencyAmount) / 1000000).toFixed(6)} STX`}
            </p>
          </div>

          <Button 
            onClick={handleEmergencyWithdraw}
            disabled={isEmergencyWithdrawing || !emergencyRecipient || !emergencyAmount}
            className="w-full"
            variant="destructive"
          >
            {isEmergencyWithdrawing ? 'Processing...' : 'Emergency Withdraw'}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            onClick={() => {
              // Auto-fill current user address for self-unlock
              setUserAddress('ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF');
              setUnlockAmount('100'); // 0.0001 STX - the amount from your request
            }}
            variant="outline"
            className="w-full"
          >
            🔄 Auto-fill My Address & Requested Amount (100 microSTX)
          </Button>
          
          <Button 
            onClick={() => {
              setUserAddress('ST1WVZNYKMK1MS2V2B728ZWJ2C76TAN49C6HSY7JF');
              setUnlockAmount('200100000'); // All collateral
            }}
            variant="outline" 
            className="w-full"
          >
            💰 Unlock All My Collateral (200.1 STX)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};