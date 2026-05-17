import { useQuery } from "@tanstack/react-query";
import { api, User } from "../api/client";

export function useAuth() {
  const { data, isLoading, error } = useQuery<{ user: User }>({
    queryKey: ["auth", "me"],
    queryFn: () => api.get("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    isAuthenticated: !!data?.user,
    error,
  };
}
