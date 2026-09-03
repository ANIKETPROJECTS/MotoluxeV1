import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import heroImg from "@/assets/hero-banner.jpg";

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
    label: "The brief",
    title: "Purpose-built",
    copy: "Every formula starts with a real maintenance job, from a chain under load to the finish customers see first.",
  },
  {
    number: "02",
    label: "The approach",
    title: "Clear by design",
    copy: "Straightforward products, practical application and guidance that helps people do the job properly.",
  },
  {
    number: "03",
    label: "The promise",
    title: "Ready for routine",
    copy: "Care works best when it is consistent, so our range is made to earn a place in everyday kits and workshops.",
  },
];

const routine = [
  {
    number: "01",
    title: "Reset the surface",
    copy: "Remove the build-up, residue and road film that hide the condition of the machine.",
  },
  {
    number: "02",
    title: "Protect what works hard",
    copy: "Give chains, metalwork and high-contact areas the protection they need before the next ride.",
  },
  {
    number: "03",
    title: "Finish with intention",
    copy: "A clean, considered finish is part of ownership—and part of the trust customers place in a workshop.",
  },
  {
    number: "04",
    title: "Repeat without friction",
    copy: "Keep the routine simple enough to follow, whether the machine is in a garage or on a workshop floor.",
  },
];

function AboutPage() {
  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-border">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-linear-to-bl from-primary/20 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-20 lg:py-28">
          <div className="lg:pr-[43%]">
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
          <div className="relative mt-14 max-w-xl border border-border bg-card p-2 lg:absolute lg:bottom-12 lg:right-5 lg:mt-0 lg:w-[38%]">
            <div className="relative overflow-hidden">
              <img
                src={heroImg}
                alt="Motoluxe chain care applied to a motorcycle"
                width={960}
                height={640}
                className="aspect-[1.25] w-full object-cover grayscale-[0.2]"
              />
              <div className="absolute inset-0 bg-linear-to-tr from-background/80 via-transparent to-primary/15" />
              <span className="absolute bottom-5 left-5 font-display text-xs uppercase tracking-[0.2em] text-white/80">
                Built for the miles ahead
              </span>
            </div>
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
          <p>
            We are not interested in adding more bottles to the shelf. We are interested in making
            the next job clearer: what to use, where to use it and how to keep the result
            consistent.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px border border-border bg-border sm:grid-cols-4 lg:col-span-2">
          {[
            ["05", "Care essentials"],
            ["03", "Working environments"],
            ["01", "Clear standard"],
            ["24/7", "Machines in motion"],
          ].map(([value, label]) => (
            <div key={label} className="bg-card p-5 sm:p-6">
              <span className="font-display text-3xl font-bold text-primary">{value}</span>
              <span className="mt-2 block font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
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
                <div className="flex items-center justify-between border-b border-border pb-5">
                  <span className="font-display text-5xl font-bold text-primary/70">
                    {principle.number}
                  </span>
                  <span className="font-display text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {principle.label}
                  </span>
                </div>
                <div className="mt-8 h-1 w-10 bg-primary" />
                <h3 className="mt-6 text-2xl font-semibold">{principle.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {principle.copy}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.72fr_1.28fr]">
          <div>
            <span className="eyebrow text-primary">How we think about care</span>
            <h2 className="mt-4 max-w-md text-4xl font-bold sm:text-5xl">
              A better result starts before the spray.
            </h2>
            <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
              The best care routines are not complicated. They are visible, repeatable and built
              around the way people actually use their machines.
            </p>
          </div>
          <div className="border-l border-primary/40 pl-6 lg:pl-12">
            {routine.map((step) => (
              <article
                key={step.number}
                className="group grid gap-4 border-b border-border py-6 sm:grid-cols-[80px_1fr]"
              >
                <span className="font-display text-4xl font-bold text-primary/45 transition-colors group-hover:text-primary">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {step.copy}
                  </p>
                </div>
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
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </>
  );
}
