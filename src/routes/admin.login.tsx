import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useAdminAuth } from "@/components/AdminAuthContext";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Admin Login — Motoluxe" },
      { name: "description", content: "Secure Motoluxe administration login." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { admin, checking, login } = useAdminAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!checking && admin) void navigate({ to: "/admin", replace: true });
  }, [admin, checking, navigate]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(username, password);
      await navigate({ to: "/admin", replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "We could not sign you in.");
    } finally {
      setLoading(false);
    }
  }

  if (checking || admin) {
    return (
      <section className="flex min-h-[75vh] items-center justify-center px-5 py-20">
        <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
      </section>
    );
  }

  return (
    <section className="flex min-h-[75vh] items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md border border-border bg-card shadow-2xl">
        <div className="hazard-stripes h-1" />
        <div className="p-7 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center bg-primary/15 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <span className="eyebrow mt-7 block text-primary">Motoluxe control room</span>
          <h1 className="mt-3 text-4xl font-bold">Admin sign in</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Use your Motoluxe administrator credentials to manage the storefront.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="admin-username" className="eyebrow mb-2 block text-muted-foreground">
                Username
              </label>
              <input
                id="admin-username"
                autoFocus
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="eyebrow mb-2 block text-muted-foreground">
                Password
              </label>
              <input
                id="admin-password"
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your admin password"
                className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
              {loading ? "Signing in" : "Sign in securely"}
              {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </button>
            {error && (
              <p role="alert" className="border border-primary/40 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary">
                {error}
              </p>
            )}
          </form>

          <p className="mt-7 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
            First time setting up the control room?{" "}
            <Link to="/admin/setup" className="text-accent transition-colors hover:text-primary">
              Create the owner account
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}