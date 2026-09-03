import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

export const Route = createFileRoute("/admin/setup")({
  head: () => ({
    meta: [
      { title: "Admin Setup — Motoluxe" },
      { name: "description", content: "Create the first Motoluxe admin owner account." },
    ],
  }),
  component: AdminSetupPage,
});

function AdminSetupPage() {
  const [hasAdmin, setHasAdmin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    fetch("/api/admin/auth/status", { credentials: "same-origin", signal: controller.signal })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as {
          hasAdmin?: boolean;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "We could not check admin setup.");
        return payload;
      })
      .then((payload) => setHasAdmin(Boolean(payload.hasAdmin)))
      .catch((statusError) => {
        setError(
          statusError instanceof Error ? statusError.message : "We could not check admin setup.",
        );
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username, password, confirmation }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "We could not create the owner account.");
      setCreated(true);
      setHasAdmin(true);
    } catch (setupError) {
      setError(
        setupError instanceof Error ? setupError.message : "We could not create the owner account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="flex min-h-[75vh] items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md border border-border bg-card shadow-2xl">
        <div className="hazard-stripes h-1" />
        <div className="p-7 sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center bg-primary/15 font-display text-xs uppercase tracking-[0.12em] text-primary">
            {created ? "OK" : "ML"}
          </div>
          <span className="eyebrow mt-7 block text-primary">One-time owner setup</span>
          <h1 className="mt-3 text-4xl font-bold">
            {created ? "Owner account ready." : "Create admin access."}
          </h1>

          {created ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                The owner account is now stored securely. Use it to sign in to the Motoluxe control
                room.
              </p>
              <Link
                to="/admin/login"
                className="group mt-8 inline-flex items-center gap-2 bg-primary px-6 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Continue to login
              </Link>
            </>
          ) : hasAdmin ? (
            <>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Admin setup is already complete. Sign in with an existing administrator account.
              </p>
              <Link
                to="/admin/login"
                className="group mt-8 inline-flex items-center gap-2 bg-primary px-6 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground"
              >
                Go to admin login
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <p className="border border-accent/30 bg-accent/10 px-4 py-3 text-xs leading-relaxed text-accent">
                Create the owner credentials you will use to enter the control room. This setup is
                available only until the first admin account is created.
              </p>
              <div>
                <label
                  htmlFor="setup-username"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Owner username
                </label>
                <input
                  id="setup-username"
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
                <label
                  htmlFor="setup-password"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="setup-password"
                    required
                    minLength={12}
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 12 characters"
                    className="w-full border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute inset-y-0 right-0 w-14 text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="setup-confirmation"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="setup-confirmation"
                    required
                    minLength={12}
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    placeholder="Repeat the password"
                    className="w-full border border-input bg-background px-4 py-3 pr-12 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmation ? "Hide password confirmation" : "Show password confirmation"
                    }
                    aria-pressed={showConfirmation}
                    onClick={() => setShowConfirmation((visible) => !visible)}
                    className="absolute inset-y-0 right-0 w-14 text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showConfirmation ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Creating account" : "Create owner account"}
              </button>
              {error && (
                <p
                  role="alert"
                  className="border border-primary/40 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary"
                >
                  {error}
                </p>
              )}
            </form>
          )}

          {!created && error && hasAdmin && (
            <p
              role="alert"
              className="mt-5 border border-primary/40 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary"
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
