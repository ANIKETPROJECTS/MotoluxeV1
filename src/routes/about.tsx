import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Gauge, ShieldCheck, Wrench } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Motoluxe — Care Without Guesswork" },
      {
        name: "description",
        content:
          "Motoluxe makes practical, purpose-built autocare products for riders, detailers, workshops and dealers.",
      },
      { property: "og:title", content: "About Motoluxe — Care Without Guesswork" },
      {
        property: "og:description",
        content:
          "Purpose-built care essentials for the machines, workshops and vehicles that keep moving.",
      },
    ],
  }),
  component: AboutPage,
});

const principles = [
  {
    number: "01",
    icon: Wrench,
    title: "Purpose-built",
    copy: "Every formula starts with a real maintenance job, from a chain under load to the finish customers see first.",
  },
  {
    number: "02",
    icon: Gauge,
    title: "Clear by design",
    copy: "Straightforward products, practical application and guidance that helps people do the job properly.",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Ready for routine",
    copy: "Care works best when it is consistent, so our range is made to earn a place in everyday kits and workshops.",
  },
];

function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-linear-to-bl from-primary/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <span className="eyebrow flex items-center gap-3 text-primary">
            <span className="h-px w-8 bg-primary" />
            About Motoluxe
          </span>
          <h1 className="mt-5 max-w-4xl text-6xl font-bold sm:text-8xl">
            Care without
            <span className="block text-primary">guesswork.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Motoluxe makes practical care essentials for riders, detailers, workshops and dealers
            who know that the small details show up in every mile.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/category/$category"
              params={{ category: "chain-care" }}
              className="group inline-flex items-center gap-2 bg-primary px-7 py-4 font-display text-xs uppercase tracking-[0.22em] text-primary-foreground transition-shadow hover:ember-glow"
            >
              Explore the range
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 border border-border px-7 py-4 font-display text-xs uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              Talk to Motoluxe
            </Link>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 hazard-stripes" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <div>
          <span className="eyebrow text-accent">The Motoluxe standard</span>
          <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Better care is a habit.</h2>
        </div>
        <div className="space-y-6 text-base leading-relaxed text-muted-foreground">
          <p>
            A clean chain, a protected surface and a well-finished interior are not separate ideas.
            They are part of owning, running and handing over a machine with pride.
          </p>
          <p>
            We bring those jobs into one focused range, with formulas and instructions made to be
            useful in the garage, on the workshop floor and at the point of handover.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:py-24">
          <div className="max-w-xl">
            <span className="eyebrow text-primary">What we stand for</span>
            <h2 className="mt-4 text-4xl font-bold sm:text-5xl">Made for the work.</h2>
          </div>
          <div className="mt-12 grid gap-px border border-border bg-border lg:grid-cols-3">
            {principles.map((principle) => (
              <article key={principle.number} className="bg-card p-7">
                <div className="flex items-start justify-between">
                  <principle.icon className="h-6 w-6 text-primary" />
                  <span className="font-display text-4xl font-bold text-primary/35">
                    {principle.number}
                  </span>
                </div>
                <h3 className="mt-10 text-2xl font-semibold">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {principle.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8 px-5 py-20 lg:py-24">
          <div>
            <span className="eyebrow text-accent">Keep moving</span>
            <h2 className="mt-4 max-w-2xl text-4xl font-bold sm:text-6xl">
              Start with the job in front of you.
            </h2>
          </div>
          <Link
            to="/contact"
            className="group inline-flex items-center gap-2 border-b border-primary pb-2 font-display text-xs uppercase tracking-[0.2em] text-primary transition-colors hover:text-accent"
          >
            Speak with our team
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
