import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  isPluginAvailable,
  signInWithPhoneNumberNative,
  startPhoneNumberVerificationNative,
  signInWithVerificationCodeNative,
  verifyPhoneNumberNative,
} from '@/integrations/firebase/capacitorAuth';

type Status = 'idle' | 'sending' | 'sent' | 'verifying' | 'success';

interface Props {
  onSuccess?: (result?: unknown) => void;
  onError?: (err: { code?: string; message: string }) => void;
  defaultCountryCode?: string;
  resendCooldown?: number; // seconds
}

function isE164(value: string) {
  return /^\+[1-9]\d{1,14}$/.test(value);
}

function mapErrorMessage(err: unknown) {
  const maybe = err as { message?: string; code?: unknown } | undefined;
  const msg = maybe?.message ?? String(err ?? 'Unknown error');
  const key = String(maybe?.code ?? msg).toLowerCase();
  if (key.includes('too-many-requests')) return 'Too many requests. Try again later.';
  if (key.includes('invalid-code') || key.includes('invalid-verification') || key.includes('wrong-code'))
    return 'The code you entered is invalid.';
  if (key.includes('invalid-phone')) return 'Invalid phone number. Use E.164 format (e.g. +15551234567).';
  if (key.includes('quota') || key.includes('quota-exceeded')) return 'SMS quota exceeded. Try again later.';
  if (key.includes('network') || key.includes('timeout')) return 'Network error. Check your connection and retry.';
  return msg;
}

export const PhoneOTPAuth: React.FC<Props> = ({ onSuccess, onError, defaultCountryCode = '+91', resendCooldown = 60 }) => {
  const { toast } = useToast();
  const [phone, setPhone] = useState<string>(defaultCountryCode);
  const [code, setCode] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = (seconds: number) => {
    setResendTimer(seconds);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const normalizePhone = (value: string) => {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return trimmed;
    if (trimmed.startsWith('+')) return trimmed;
    // attempt to prepend default country code
    const digits = trimmed.replace(/[^\d]/g, '');
    return `${defaultCountryCode}${digits}`;
  };

  const handleError = (err: unknown) => {
    const message = mapErrorMessage(err);
    const maybe = err as { code?: string } | undefined;
    setError(message);
    if (onError) onError({ message, code: maybe?.code });
    toast({ title: 'Phone Auth Error', description: message, variant: 'destructive' });
  };

  const sendOtp = async () => {
    setError(null);

    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError('Please enter a phone number.');
      return;
    }

    if (!isE164(normalized)) {
      setError('Phone number must be in E.164 format, e.g. +15551234567');
      return;
    }

    setStatus('sending');

    try {
      const pluginAvailable = await isPluginAvailable();
      if (!pluginAvailable) throw new Error('Native auth plugin is not available on this platform.');

      // Prefer explicit "start" API if available
      let res: unknown = null;
      try {
        res = await startPhoneNumberVerificationNative({ phoneNumber: normalized });
      } catch (e) {
        // fallback to signIn variant if start is not implemented
        res = await signInWithPhoneNumberNative({ phoneNumber: normalized });
      }

      // Many plugin responses include verificationId or id
      type VerificationResponse = { verificationId?: string; id?: string; session?: string; user?: unknown; signedIn?: boolean };
      const v = res as VerificationResponse | null;
      const vId = v?.verificationId ?? v?.id ?? v?.session ?? null;

      // If plugin returns no verification id and seems to have auto-signed-in, treat as success
      if (!vId && (res?.user || res?.signedIn)) {
        setStatus('success');
        toast({ title: 'Signed in', description: 'Signed in successfully via native auth.' });
        if (onSuccess) onSuccess(res);
        return;
      }

      if (!vId) {
        throw new Error('Native plugin did not return a verification session.');
      }

      setVerificationId(String(vId));
      setStatus('sent');
      startCooldown(resendCooldown);
      toast({ title: 'OTP sent', description: `Verification code sent to ${normalized}` });
    } catch (err) {
      setStatus('idle');
      handleError(err);
    }
  };

  const verifyCode = async () => {
    setError(null);
    if (!verificationId) return setError('No verification in progress. Please request a code first.');
    if (!code || !code.trim()) return setError('Enter the verification code.');

    setStatus('verifying');
    try {
      // Prefer explicit sign-in with verification code API
      let res: unknown;
      try {
        res = await signInWithVerificationCodeNative({ verificationId, verificationCode: code.trim() });
      } catch (e) {
        // fallback to verifyPhoneNumber-style API
        res = await verifyPhoneNumberNative({ verificationId, verificationCode: code.trim() });
      }

      setStatus('success');
      toast({ title: 'Success', description: 'Phone verified and signed in.' });
      if (onSuccess) onSuccess(res);
    } catch (err) {
      setStatus('sent');
      handleError(err);
    }
  };

  const resend = async () => {
    if (resendTimer > 0) return;
    setCode('');
    setVerificationId(null);
    await sendOtp();
  };

  const reset = () => {
    setPhone(defaultCountryCode);
    setCode('');
    setVerificationId(null);
    setStatus('idle');
    setError(null);
    setResendTimer(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div className="phone-otp-auth">
      <div className="space-y-4">
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={defaultCountryCode}
            disabled={status === 'sending' || status === 'verifying' || status === 'success'}
          />
        </div>

        {!verificationId && (
          <div className="flex gap-2">
            <Button onClick={sendOtp} disabled={status === 'sending' || status === 'success'}>
              {status === 'sending' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                'Send OTP'
              )}
            </Button>
            <Button variant="outline" onClick={reset} disabled={status === 'sending'}>
              Reset
            </Button>
          </div>
        )}

        {verificationId && status !== 'success' && (
          <>
            <div>
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                disabled={status === 'verifying'}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={verifyCode} disabled={status === 'verifying' || !code.trim()}>
                {status === 'verifying' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
              <Button onClick={resend} disabled={resendTimer > 0 || status === 'verifying'} variant="outline">
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </Button>
              <Button onClick={reset} variant="ghost" disabled={status === 'verifying'}>
                Cancel
              </Button>
            </div>
          </>
        )}

        {status === 'success' && <div className="text-green-600 font-semibold">Signed in successfully ✅</div>}

        {error && <div role="alert" className="text-destructive font-medium">{error}</div>}
      </div>
    </div>
  );
};

export default PhoneOTPAuth;
