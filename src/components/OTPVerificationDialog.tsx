import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2 } from 'lucide-react';
import { ConfirmationResult } from 'firebase/auth';

interface OTPVerificationDialogProps {
  open: boolean;
  phoneNumber: string;
  confirmationResult: ConfirmationResult | null;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onClose: () => void;
}

export const OTPVerificationDialog: React.FC<OTPVerificationDialogProps> = ({
  open,
  phoneNumber,
  confirmationResult,
  onVerify,
  onResend,
  onClose,
}) => {
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);

  // Reset OTP when dialog opens
  useEffect(() => {
    if (open) {
      setOtp('');
      setResendCooldown(60);
    }
  }, [open]);

  // Start countdown timer when dialog opens
  useEffect(() => {
    if (open && resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [open, resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!confirmationResult) {
      return;
    }

    if (otp.length !== 6) {
      return;
    }

    setIsVerifying(true);
    try {
      await onVerify(otp);
      setOtp('');
    } catch (error) {
      // Error handling is done in parent component
      setOtp('');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    
    setIsResending(true);
    try {
      await onResend();
      setResendCooldown(60);
      setOtp('');
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing by clicking outside during mandatory verification
      if (!isOpen) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Two-Step Authentication Required</DialogTitle>
          <DialogDescription>
            Enter the 6-digit verification code sent to {phoneNumber} to complete sign-in
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp-input">Verification Code</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
                disabled={isVerifying}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isVerifying || otp.length !== 6 || !confirmationResult}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending || !confirmationResult}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend OTP in ${resendCooldown}s`
              ) : (
                'Resend OTP'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

