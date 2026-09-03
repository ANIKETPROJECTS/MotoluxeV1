import { ArrowLeft, ArrowRight, LoaderCircle, UserRound, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

export type Customer = {
  id: string;
  phone: string;
  name?: string;
  email?: string;
};

type AuthContextValue = {
  customer: Customer | null;
  checking: boolean;
  authenticated: boolean;
  openAuth: (callback?: () => void) => void;
  closeAuth: () => void;
  logout: () => Promise<void>;
};

type AuthResponse = {
  customer?: Customer | null;
  error?: string;
  developmentOtp?: string;
};

const CustomerAuthContext = createContext<AuthContextValue | null>(null);

async function parseResponse(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as AuthResponse;
  if (!response.ok) {
    throw new Error(payload.error ?? "Something went wrong. Please try again.");
  }
  return payload;
}

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [checking, setChecking] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [developmentOtp, setDevelopmentOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pendingAction = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "same-origin" })
      .then(parseResponse)
      .then((payload) => setCustomer(payload.customer ?? null))
      .catch(() => setCustomer(null))
      .finally(() => setChecking(false));
  }, []);

  function openAuth(callback?: () => void) {
    if (customer) {
      callback?.();
      return;
    }
    pendingAction.current = callback;
    setError("");
    setName("");
    setPhone("");
    setOtp("");
    setStep("phone");
    setIsOpen(true);
  }

  function closeAuth() {
    pendingAction.current = undefined;
    setIsOpen(false);
    setError("");
  }

  function completeAuthentication(nextCustomer: Customer) {
    setCustomer(nextCustomer);
    const callback = pendingAction.current;
    pendingAction.current = undefined;
    setIsOpen(false);
    setError("");
    callback?.();
  }

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, phone }),
      });
      const payload = await parseResponse(response);
      setDevelopmentOtp(payload.developmentOtp ?? "");
      setOtp("");
      setStep("otp");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "We could not send a code.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name, phone, otp }),
      });
      const payload = await parseResponse(response);
      const verifiedCustomer = payload.customer;
      if (!verifiedCustomer) throw new Error("We could not sign you in.");

      completeAuthentication(verifiedCustomer);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "We could not verify that code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    }).catch(() => undefined);
    setCustomer(null);
  }

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        checking,
        authenticated: Boolean(customer),
        openAuth,
        closeAuth,
        logout,
      }}
    >
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/65 px-5 py-8 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Close sign in"
            onClick={closeAuth}
            className="absolute inset-0 cursor-default"
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-auth-title"
            className="relative z-10 w-full max-w-md overflow-hidden border border-border bg-background shadow-2xl"
          >
            <div className="hazard-stripes h-1" />
            <header className="flex items-start justify-between border-b border-border px-6 py-5">
              <div>
                <span className="eyebrow text-primary">Motoluxe customer account</span>
                <h2 id="customer-auth-title" className="mt-2 text-2xl font-semibold">
                  {step === "phone" ? "Sign in to continue" : "Enter your code"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close sign in"
                onClick={closeAuth}
                className="grid h-9 w-9 place-items-center border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="px-6 py-6">
              {step === "phone" && (
                <form onSubmit={requestOtp} className="space-y-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Enter your name and phone number to create or access your Motoluxe customer
                    account.
                  </p>
                  <div>
                    <label htmlFor="auth-name" className="eyebrow mb-2 block text-muted-foreground">
                      Full name
                    </label>
                    <input
                      id="auth-name"
                      autoFocus
                      required
                      minLength={2}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your full name"
                      className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-phone"
                      className="eyebrow mb-2 block text-muted-foreground"
                    >
                      Phone number
                    </label>
                    <input
                      id="auth-phone"
                      required
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Send one-time code
                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                </form>
              )}

              {step === "otp" && (
                <form onSubmit={verifyOtp} className="space-y-5">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Enter the six-digit code sent to the number ending in{" "}
                    <strong className="text-foreground">
                      {phone.replace(/\D/g, "").slice(-4)}
                    </strong>
                    .
                  </p>
                  {developmentOtp && (
                    <div className="border border-accent/40 bg-accent/10 px-4 py-3 text-xs leading-relaxed text-accent">
                      Development-only code:{" "}
                      <strong className="font-display tracking-[0.18em]">{developmentOtp}</strong>
                    </div>
                  )}
                  <div>
                    <label htmlFor="auth-otp" className="eyebrow mb-2 block text-muted-foreground">
                      One-time code
                    </label>
                    <input
                      id="auth-otp"
                      autoFocus
                      required
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      className="w-full border border-input bg-background px-4 py-3 font-display text-lg tracking-[0.35em] text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex w-full items-center justify-center gap-2 bg-primary px-5 py-4 font-display text-xs uppercase tracking-[0.2em] text-primary-foreground disabled:cursor-wait disabled:opacity-60"
                  >
                    {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                    Verify and continue
                    {!loading && (
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setStep("phone");
                    }}
                    className="mx-auto flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Edit name or number
                  </button>
                </form>
              )}

              {error && (
                <p
                  role="alert"
                  className="mt-4 border border-primary/40 bg-primary/10 px-4 py-3 text-xs leading-relaxed text-primary"
                >
                  {error}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error("useCustomerAuth must be used inside CustomerAuthProvider");
  }
  return context;
}

export function AccountIcon() {
  return <UserRound className="h-4 w-4" />;
}
