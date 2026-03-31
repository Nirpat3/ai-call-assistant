import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, EyeOff, Lock, Mail, Phone, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface ForgotPasswordData {
  email: string;
}

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    password: "",
    rememberMe: false
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [loginError, setLoginError] = useState("");

  // Load saved credentials on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem("rememberedCredentials");
    if (savedCredentials) {
      try {
        const parsed = JSON.parse(savedCredentials);
        setCredentials({
          email: parsed.email || "",
          password: parsed.password || "",
          rememberMe: true
        });
      } catch (error) {
        console.error("Failed to parse saved credentials:", error);
      }
    }
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (loginData: LoginCredentials) => {
      setLoginError("");
      return await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password
        }),
      });
    },
    onSuccess: (data) => {
      // Save credentials if remember me is checked
      if (credentials.rememberMe) {
        localStorage.setItem("rememberedCredentials", JSON.stringify({
          email: credentials.email,
          password: credentials.password
        }));
      } else {
        localStorage.removeItem("rememberedCredentials");
      }

      // Save auth token
      if (data.token) {
        localStorage.setItem("authToken", data.token);
      }

      toast({ title: "Login successful", description: "Welcome to AI Call Assistant" });
      
      // Force a page reload to trigger authentication check
      window.location.href = "/";
    },
    onError: (error: any) => {
      setLoginError(error.message || "Invalid email or password. Please try again.");
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      return await apiRequest("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({ 
        title: "Reset link sent", 
        description: "Check your email for password reset instructions" 
      });
      setShowForgotPassword(false);
      setForgotEmail("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Reset failed", 
        description: error.message || "Failed to send reset email",
        variant: "destructive" 
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.email || !credentials.password) {
      setLoginError("Please enter both email and password.");
      return;
    }

    if (!isValidEmail(credentials.email)) {
      setLoginError("Please enter a valid email address.");
      return;
    }

    loginMutation.mutate(credentials);
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      toast({ 
        title: "Email required", 
        description: "Please enter your email address",
        variant: "destructive" 
      });
      return;
    }

    if (!isValidEmail(forgotEmail)) {
      toast({ 
        title: "Invalid email", 
        description: "Please enter a valid email address",
        variant: "destructive" 
      });
      return;
    }

    forgotPasswordMutation.mutate({ email: forgotEmail });
  };

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRememberMeChange = (checked: boolean) => {
    setCredentials(prev => ({ ...prev, rememberMe: checked }));
    
    // If unchecking remember me, remove saved credentials
    if (!checked) {
      localStorage.removeItem("rememberedCredentials");
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
            <CardDescription className="text-center">
              Enter your email address and we'll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="Enter your email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
                
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Phone className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">AI Call Assistant</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your intelligent call management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={credentials.email}
                  onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10 pr-10"
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={credentials.rememberMe}
                  onCheckedChange={handleRememberMeChange}
                />
                <Label htmlFor="remember-me" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Remember me
                </Label>
              </div>
              <Button
                type="button"
                variant="link"
                className="px-0 font-normal"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot password?
              </Button>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Button variant="link" className="px-0 font-normal">
                Contact your administrator
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}