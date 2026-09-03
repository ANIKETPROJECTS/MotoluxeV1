import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Motoluxe — Help & Support" },
      {
        name: "description",
        content:
          "Reach the Motoluxe team for product questions, application advice, compatibility help, or support with an issue.",
      },
      {
        property: "og:title",
        content: "Contact Motoluxe — Help & Support",
      },
      {
        property: "og:description",
        content:
          "Talk to the Motoluxe team about product questions, compatibility, or support.",
      },
    ],
  }),
  component: ContactPage,
});

const details = [
  { icon: Mail, label: "Email", value: "care@motoluxe.in" },
  { icon: Phone, label: "Phone", value: "+91 98200 44120" },
  {
    icon: MapPin,
    label: "Works",
    value: "Unit 14, MIDC Industrial Estate, Pune 411019",
  },
  { icon: Clock, label: "Hours", value: "Mon–Sat · 09:30 to 18:30 IST" },
];

const inputClass =
  "w-full border border-input bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary";

function ContactPage() {
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-20">
      <span className="eyebrow flex items-center gap-3 text-primary">
        <span className="h-px w-8 bg-primary" />
        Contact Us
      </span>
      <h1 className="mt-4 max-w-2xl text-5xl font-bold sm:text-6xl">
        How Can We Help?
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
        Have a product question, compatibility problem, or another issue? Send
        us the details and our team will respond within one working day.
      </p>

      <div className="mt-14 grid gap-10 lg:grid-cols-5">
        <div className="border border-border bg-card p-8 lg:col-span-3">
          {sent ? (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <CheckCircle2 className="h-12 w-12 text-accent" />
              <h2 className="mt-6 text-3xl font-bold">Message Logged</h2>
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                This is a UI demo — nothing was sent. In production our team
                reviews your message and replies within one working day.
              </p>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="mt-8 border border-border px-6 py-3 font-display text-xs uppercase tracking-[0.24em] transition-colors hover:border-primary hover:text-primary"
              >
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Your full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="message"
                  className="eyebrow mb-2 block text-muted-foreground"
                >
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                   placeholder="Tell us about your question or problem, including the product and vehicle model if relevant."
                  className={`${inputClass} resize-none`}
                />
              </div>
              <button
                type="submit"
                className="group inline-flex items-center gap-2 bg-primary px-8 py-4 font-display text-sm uppercase tracking-[0.22em] text-primary-foreground transition-all hover:ember-glow"
              >
                Send Message
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </form>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="grid gap-px border border-border bg-border">
            {details.map((d) => (
              <div key={d.label} className="flex gap-4 bg-card p-6">
                <div className="grid h-10 w-10 shrink-0 place-items-center border border-primary/40 bg-primary/10 text-primary">
                  <d.icon className="h-4 w-4" />
                </div>
                <div>
                  <span className="eyebrow text-muted-foreground">
                    {d.label}
                  </span>
                  <p className="mt-1.5 text-sm leading-snug text-foreground">
                    {d.value}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 skew-cut-tl border border-accent/30 bg-accent/10 p-6">
            <h3 className="text-lg font-semibold text-accent">
              Distributor Programme
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Workshops and retailers get tiered pricing, display units and
              training material. Mention "DISTRIBUTOR" in your message.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
