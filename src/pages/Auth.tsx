
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/sonner';
import { Lock, AlertCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // ADMIN CREDENTIALS FOR DEVELOPMENT ACCESS
  const ADMIN_EMAIL = 'admin@example.com';
  const ADMIN_PASSWORD = 'adminaccess123';

  // Handle auth state changes and process recovery tokens
  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
    
    // Handle recovery token from URL hash
    const processRecoveryToken = () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
        try {
          // Remove the hash to clean up the URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Show the password reset form
          setShowRecoveryForm(true);
          toast.success('You can now set a new password');
        } catch (error) {
          setRecoveryError('There was a problem processing the recovery link');
          toast.error('There was a problem processing the recovery link');
        }
      }
    };
    
    // Handle URL error parameters for expired tokens etc
    const handleErrorParams = () => {
      const url = new URL(window.location.href);
      const errorParam = url.hash ? new URLSearchParams(url.hash.substring(1)).get('error') : null;
      const errorDescription = url.hash ? new URLSearchParams(url.hash.substring(1)).get('error_description') : null;
      
      if (errorParam) {
        // Replace URL without error parameters to prevent showing the error again on refresh
        window.history.replaceState({}, document.title, '/auth');
        
        // Show appropriate error message
        if (errorParam === 'access_denied' && errorDescription?.includes('expired')) {
          setRecoveryError('Password reset link has expired. Please request a new one.');
          toast.error('Password reset link has expired. Please request a new one.');
          setIsResetPassword(true);
        } else {
          setRecoveryError(errorDescription || 'An error occurred. Please try again.');
          toast.error(errorDescription || 'An error occurred. Please try again.');
        }
      }
    };

    processRecoveryToken();
    handleErrorParams();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isResetPassword) {
        // Reset password flow
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/auth',
        });
        if (error) throw error;
        toast.success('Check your email for the password reset link');
        setIsResetPassword(false);
      } else if (isSignUp) {
        // Sign up flow
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
        // Handle admin login shortcut
        if (showAdminLogin && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
          // For admin login, we'll create a custom sign-in that works for development
          const { error } = await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
          });
          
          if (error) {
            // If admin login fails with password auth, try creating an account
            const { error: signUpError } = await supabase.auth.signUp({
              email: ADMIN_EMAIL,
              password: ADMIN_PASSWORD,
            });
            
            if (signUpError) {
              throw signUpError;
            } else {
              // Try signing in again after creating the account
              const { error: retryError } = await supabase.auth.signInWithPassword({
                email: ADMIN_EMAIL,
                password: ADMIN_PASSWORD,
              });
              
              if (retryError) throw retryError;
              toast.success('Logged in as admin');
              navigate('/');
            }
          } else {
            toast.success('Logged in as admin');
            navigate('/');
          }
        } else {
          // Regular sign in flow
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
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated successfully');
      
      // Short delay before navigating to allow the user to see the success message
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAdminLogin = () => {
    setShowAdminLogin(!showAdminLogin);
    if (!showAdminLogin) {
      setEmail(ADMIN_EMAIL);
      setPassword(ADMIN_PASSWORD);
    } else {
      setEmail('');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            {showAdminLogin ? <Shield className="h-8 w-8 text-red-500" /> : <Lock className="h-8 w-8" />}
          </div>
          <CardTitle>
            {showRecoveryForm
              ? 'Set New Password'
              : isResetPassword
              ? 'Reset Password'
              : showAdminLogin
              ? 'Admin Access'
              : isSignUp
              ? 'Create Account'
              : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {showRecoveryForm
              ? 'Enter your new password below'
              : isResetPassword
              ? 'Enter your email to receive a password reset link'
              : showAdminLogin
              ? 'Sign in with admin credentials'
              : isSignUp
              ? 'Sign up to save and manage your PLC code'
              : 'Sign in to access your PLC code'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recoveryError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{recoveryError}</AlertDescription>
            </Alert>
          )}
          
          {showRecoveryForm ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Processing...' : 'Update Password'}
              </Button>
            </form>
          ) : (
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
              <Button 
                type="submit" 
                className={`w-full ${showAdminLogin ? 'bg-red-600 hover:bg-red-700' : ''}`}
                disabled={isLoading}
              >
                {isLoading
                  ? 'Loading...'
                  : isResetPassword
                  ? 'Send Reset Link'
                  : showAdminLogin
                  ? 'Admin Login'
                  : isSignUp
                  ? 'Sign Up'
                  : 'Sign In'}
              </Button>
              <div className="flex flex-col gap-2">
                {!showAdminLogin && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsResetPassword(false);
                      setIsSignUp(!isSignUp);
                      setRecoveryError('');
                    }}
                  >
                    {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                  </Button>
                )}
                
                {!isResetPassword && !isSignUp && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsResetPassword(true);
                      setRecoveryError('');
                    }}
                  >
                    Forgot your password?
                  </Button>
                )}
                
                {isResetPassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsResetPassword(false);
                      setRecoveryError('');
                    }}
                  >
                    Back to Sign In
                  </Button>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full mt-4 ${showAdminLogin ? 'border-red-500 text-red-500' : ''}`}
                  onClick={toggleAdminLogin}
                >
                  {showAdminLogin ? 'Back to Regular Login' : 'Use Admin Login'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
