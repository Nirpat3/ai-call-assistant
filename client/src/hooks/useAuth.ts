import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

export function useAuth(): AuthState & {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
} {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("authToken")
  );
  
  const queryClient = useQueryClient();

  const { data: user, isLoading, refetch } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      return response;
    },
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem("authToken", data.token);
        setToken(data.token);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }
    },
    onError: () => {
      logout();
    },
  });

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("rememberedCredentials");
    setToken(null);
    queryClient.clear();
    window.location.href = "/login";
  };

  const checkAuth = () => {
    const savedToken = localStorage.getItem("authToken");
    if (savedToken !== token) {
      setToken(savedToken);
    }
  };

  // Check for token changes and refetch user data
  useEffect(() => {
    const handleStorageChange = () => {
      const newToken = localStorage.getItem("authToken");
      if (newToken !== token) {
        setToken(newToken);
        if (newToken) {
          // Force refetch user data when token changes
          refetch();
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Also check on mount and token changes
    const currentToken = localStorage.getItem("authToken");
    if (currentToken !== token) {
      setToken(currentToken);
      if (currentToken) {
        refetch();
      }
    }
    
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [token, queryClient, refetch]);

  // Auto-logout on token expiration
  useEffect(() => {
    if (token && user === undefined && !isLoading) {
      // Token exists but user fetch failed, likely expired
      logout();
    }
  }, [token, user, isLoading]);

  return {
    user: user || null,
    isLoading,
    isAuthenticated: !!token && !!user,
    token,
    login: async (email: string, password: string) => {
      await loginMutation.mutateAsync({ email, password });
    },
    logout,
    checkAuth,
  };
}