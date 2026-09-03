import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Admin = {
  id: string;
  username: string;
  role: "owner" | "manager" | "catalog_editor" | "operations" | "support" | "viewer";
  active: boolean;
};

type AdminAuthContextValue = {
  admin: Admin | null;
  checking: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as {
    admin?: Admin | null;
    error?: string;
  };
  if (!response.ok) throw new Error(payload.error ?? "Something went wrong. Please try again.");
  return payload;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/admin/auth/me", { credentials: "same-origin" })
      .then(parseResponse)
      .then((payload) => setAdmin(payload.admin ?? null))
      .catch(() => setAdmin(null))
      .finally(() => setChecking(false));
  }, []);

  async function login(username: string, password: string) {
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ username, password }),
    });
    const payload = await parseResponse(response);
    if (!payload.admin) throw new Error("We could not sign you in.");
    setAdmin(payload.admin);
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setAdmin(null);
  }

  return (
    <AdminAuthContext.Provider
      value={{ admin, checking, authenticated: Boolean(admin), login, logout }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}