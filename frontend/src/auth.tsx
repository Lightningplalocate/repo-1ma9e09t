import React, { createContext, useContext, useEffect, useState } from "react";
import { api, CurrentUser } from "./api";

interface AuthCtx {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  has: (perm: string) => boolean;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      const { data } = await api.get<CurrentUser>("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("token")) fetchMe();
    else setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const body = new URLSearchParams({ username, password });
    const { data } = await api.post("/auth/login", body);
    localStorage.setItem("token", data.access_token);
    await fetchMe();
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  const has = (perm: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    return user.permissions.includes(perm);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, logout, has }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
