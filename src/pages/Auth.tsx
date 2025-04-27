
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { Lock, AlertCircle } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Parse error messages from URL parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    const errorParam = url.hash ? new URLSearchParams(url.hash.substring(1)).get('error') : null;
    const errorDescription = url.hash ? new URLSearchParams(url.hash.substring(1)).get('error_description') : null;
    
    if (errorParam) {
      // Replace URL without error parameters to prevent showing the error again on refresh
      window.history.replaceState({}, document.title, '/auth');
      
      // Show appropriate error message
      if (errorParam === 'access_denied' && errorDescription?.includes('expired')) {
        toast.error('Password reset link has expired. Please request a new one.');
        setIsResetPassword(true);
      } else {
        toast.error(errorDescription || 'An error occurred. Please try again.');
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isResetPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success('Check your email for the password reset link');
        setIsResetPassword(false);
      } else if (isSignUp) {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in instead.');
          } else {
            throw error;
          }
        } else {
          toast.success('Check your email to confirm your account');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login')) {
            toast.error('Invalid email or password. Please try again.');
          } else {
            throw error;
          }
        } else {
          navigate('/');
        }
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <Lock className="h-8 w-8" />
          </div>
          <CardTitle>
            {isResetPassword
              ? 'Reset Password'
              : isSignUp
              ? 'Create Account'
              : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isResetPassword
              ? 'Enter your email to receive a password reset link'
              : isSignUp
              ? 'Sign up to save and manage your PLC code'
              : 'Sign in to access your PLC code'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {!isResetPassword && (
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading
                ? 'Loading...'
                : isResetPassword
                ? 'Send Reset Link'
                : isSignUp
                ? 'Sign Up'
                : 'Sign In'}
            </Button>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setIsResetPassword(false);
                  setIsSignUp(!isSignUp);
                }}
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
              </Button>
              {!isResetPassword && !isSignUp && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsResetPassword(true)}
                >
                  Forgot your password?
                </Button>
              )}
              {isResetPassword && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsResetPassword(false)}
                >
                  Back to Sign In
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
