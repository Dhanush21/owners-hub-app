import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmationResult } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OTPVerificationDialog } from '@/components/OTPVerificationDialog';
import PhoneOTPAuth from '@/components/PhoneOTPAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Home, UserPlus, LogIn, Users } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [signUpData, setSignUpData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'resident' as 'owner' | 'resident',
    referralCode: '',
  });
  const [signInData, setSignInData] = useState({
    email: '',
    password: '',
  });

  // OTP Verification state
  const [showOTPDialog, setShowOTPDialog] = useState(false);
  const [otpPhoneNumber, setOtpPhoneNumber] = useState('');
  const [showPhoneOtpDialog, setShowPhoneOtpDialog] = useState(false);
  const [isSignupOTP, setIsSignupOTP] = useState(false); // Track if OTP is for signup
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  const { signUp, signIn, signInAsGuest, resetPassword, sendOTP, verifyOTP, linkPhoneNumber, logout } =
    useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const formatToE164 = (phone: string) => {
    if (!phone) return '';
    console.log(phone)
    const cleaned = phone.replace(/\D/g, '');
    return phone.startsWith('+') ? `+${cleaned}` : `+91${cleaned}`; // defaulting to +91 when no + present

  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate phone number if provided
      let formattedPhone: string | undefined;
      if (signUpData.phoneNumber.trim()) {
        formattedPhone = formatToE164(signUpData.phoneNumber);

        // Basic phone validation: after formatting at least 10 digits (country code included)
        if (formattedPhone.replace(/\D/g, '').length < 10) {
          throw new Error('Please enter a valid phone number with country code');
        }
      }

      // Create account
      await signUp(
        signUpData.email,
        signUpData.password,
        signUpData.fullName,
        signUpData.role,
        signUpData.referralCode,
        formattedPhone
      );

      // If phone number provided, send OTP for verification
      if (formattedPhone) {
        try {
          const result = await linkPhoneNumber(formattedPhone); // returns ConfirmationResult
          setConfirmationResult(result);
          setOtpPhoneNumber(formattedPhone);
          setIsSignupOTP(true);
          setShowOTPDialog(true);
          toast({
            title: 'Account created!',
            description: 'Please verify your phone number with the OTP sent to your phone.',
          });
        } catch (otpError: any) {
          // If OTP send fails, still allow account creation
          toast({
            title: 'Account created!',
            description: `Welcome to CoHub! Your ${signUpData.role} account has been created. Phone verification failed: ${otpError?.message ?? otpError}`,
            variant: 'default',
          });
          navigate('/');
        }
      } else {
        // No phone number, redirect directly
        toast({
          title: 'Account created!',
          description: `Welcome to CoHub! Your ${signUpData.role} account has been created successfully.`,
        });
        navigate('/');
      }
    } catch (error: any) {
      toast({
        title: 'Sign up failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Step 1: Sign in with email and password
      const userProfile = await signIn(signInData.email, signInData.password);

      // Step 2: Check if user has phone number - OTP verification is MANDATORY
      if (!userProfile?.phoneNumber) {
        // No phone number - log out and show error
        await logout();
        toast({
          title: 'Phone number required',
          description: 'Your account must have a verified phone number. Please contact support or sign up with a phone number.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // Step 3: Send OTP to phone number - MANDATORY for sign-in
      try {
        const formattedPhone = userProfile.phoneNumber.startsWith('+')
          ? userProfile.phoneNumber
          : formatToE164(userProfile.phoneNumber);
        const result = await linkPhoneNumber(formattedPhone);
        setConfirmationResult(result);
        setOtpPhoneNumber(formattedPhone);
        setIsSignupOTP(false); // This is for login, not signup
        setShowOTPDialog(true);
        toast({
          title: 'Step 1 Complete!',
          description: 'Please verify your phone number with the OTP sent to your phone to complete sign-in.',
        });
      } catch (otpError: any) {
        // If OTP send fails, log out the user
        await logout();
        toast({
          title: 'OTP Send Failed',
          description: `Could not send OTP: ${otpError?.message ?? otpError}. Please try again.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Sign in failed',
        description: error?.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (otp: string) => {
    if (!otpPhoneNumber) {
      throw new Error('Phone number not found. Please start over.');
    }
    if (!confirmationResult) {
      throw new Error('Verification session not found. Please request a new OTP.');
    }

    try {
      await verifyOTP(confirmationResult, otp);
      toast({
        title: isSignupOTP ? 'Phone Verified!' : 'Sign-in Complete!',
        description: isSignupOTP ? 'Your phone number was verified.' : 'Your phone number has been verified. Welcome back!',
      });
      setShowOTPDialog(false);
      setOtpPhoneNumber('');
      setIsSignupOTP(false);
      setConfirmationResult(null);

      // Redirect to dashboard after successful OTP verification
      navigate('/');
    } catch (error: any) {
      // Re-throw or show toast — the dialog can show the specific message if needed
      throw error;
    }
  };

  const handleOTPResend = async () => {
    if (!otpPhoneNumber) {
      throw new Error('Phone number not found.');
    }
    setIsLoading(true);
    try {
      const result = await sendOTP(otpPhoneNumber);
      setConfirmationResult(result);
      toast({
        title: 'OTP Resent!',
        description: 'A new verification code has been sent to your phone.',
      });
    } catch (error: any) {
      toast({
        title: 'Resend failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestSignIn = async () => {
    setIsLoading(true);

    try {
      await signInAsGuest();
      toast({
        title: 'Welcome!',
        description: "You're now browsing as a guest.",
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Guest access failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Phone OTP dialog handlers (uses native Capacitor plugin via PhoneOTPAuth)
  const handlePhoneSignInSuccess = (res?: any) => {
    setShowPhoneOtpDialog(false);
    toast({ title: 'Signed in', description: 'Phone sign-in was successful.' });
    navigate('/');
  };

  const handlePhoneSignInError = (err: any) => {
    setShowPhoneOtpDialog(false);
    toast({ title: 'Phone sign-in failed', description: err?.message || 'Please try again.', variant: 'destructive' });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetEmailSent(true);
      toast({
        title: 'Password reset email sent!',
        description: 'Check your email for instructions to reset your password.',
      });
    } catch (error: any) {
      toast({
        title: 'Reset failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    if (resetEmailSent) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle>Email Sent!</CardTitle>
              <CardDescription>We've sent a password reset link to your email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetEmailSent(false);
                  setResetEmail('');
                }}
                className="w-full"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Reset Password</CardTitle>
            <CardDescription>Enter your email address and we'll send you a reset link.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="Enter your email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Email'
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              CoHub
            </h1>
          </div>
          <p className="text-muted-foreground">Your all-in-one property management platform</p>
        </div>

        {/* Auth Tabs */}
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin" className="flex items-center gap-2">
              <LogIn className="h-4 w-4" />
              Sign In
            </TabsTrigger>
            <TabsTrigger value="signup" className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Sign Up
            </TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Welcome back</CardTitle>
                <CardDescription>Sign in to your account to continue</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Enter your password"
                      value={signInData.password}
                      onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  <Button type="button" variant="link" className="w-full" onClick={() => setShowForgotPassword(true)}>
                    Forgot Password?
                  </Button>
                  <Button type="button" variant="outline" className="w-full" onClick={() => setShowPhoneOtpDialog(true)}>
                    Sign in with phone (OTP)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create an account</CardTitle>
                <CardDescription>Join CoHub to manage your property efficiently</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Enter your full name"
                      value={signUpData.fullName}
                      onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number (Required for verification)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+91XXXXXXXXXX (with country code)"
                      value={signUpData.phoneNumber}
                      onChange={(e) => setSignUpData({ ...signUpData, phoneNumber: e.target.value })}
                      required
                    />
                    <p className="text-xs text-muted-foreground">You'll receive an OTP to verify this number</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Account Type</Label>
                    <select
                      id="signup-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      value={signUpData.role}
                      onChange={(e) => setSignUpData({ ...signUpData, role: e.target.value as 'owner' | 'resident' })}
                    >
                      <option value="resident">Resident</option>
                      <option value="owner">Property Owner</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-referral">Referral Code (Optional)</Label>
                    <Input
                      id="signup-referral"
                      type="text"
                      placeholder="Enter referral code if you have one"
                      value={signUpData.referralCode}
                      onChange={(e) => setSignUpData({ ...signUpData, referralCode: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Guest Mode */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-medium">Continue as Guest</h3>
                <p className="text-sm text-muted-foreground">Explore CoHub with limited access</p>
              </div>
              <Button variant="outline" className="w-full" onClick={handleGuestSignIn} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Continue as Guest'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone OTP Dialog (native Capacitor plugin) */}
      <Dialog open={showPhoneOtpDialog} onOpenChange={(open) => setShowPhoneOtpDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in with phone (OTP)</DialogTitle>
          </DialogHeader>
          <PhoneOTPAuth
            defaultCountryCode={''}
            onSuccess={(res) => handlePhoneSignInSuccess(res)}
            onError={(err) => handlePhoneSignInError(err)}
          />
        </DialogContent>
      </Dialog>

      {/* OTP Verification Dialog - MANDATORY for Sign-in */}
      <OTPVerificationDialog
        open={showOTPDialog}
        phoneNumber={otpPhoneNumber}
        confirmationResult={confirmationResult}
        onVerify={handleOTPVerify}
        onResend={handleOTPResend}
        onClose={async () => {
          // If OTP dialog is closed during sign-in (not signup), log out the user
          if (!isSignupOTP) {
            try {
              await logout();
              toast({
                title: 'Sign-in cancelled',
                description:
                  'OTP verification is required. Please sign in again and verify your phone number.',
                variant: 'default',
              });
            } catch {
              // Ignore logout errors
            }
          } else {
            // For signup, allow closing (user can verify later)
            navigate('/');
          }
          setShowOTPDialog(false);
          setOtpPhoneNumber('');
          setIsSignupOTP(false);
          setConfirmationResult(null);
        }}
      />
    </div>
  );
};

export default Auth;
