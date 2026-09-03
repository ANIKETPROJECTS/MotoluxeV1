import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Beaker,
  CarFront,
  ChevronRight,
  CircleCheck,
  Headset,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import heroImg from "@/assets/hero-banner.jpg";
import heroVideo from "@/assets/motoluxe-chain-hero.mp4";
import { categories, featuredProducts, products } from "@/data/catalog";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Motoluxe — Autocare That Works As Hard As You Do" },
      {
        name: "description",
        content:
          "Explore the Motoluxe autocare range: Chain Cleaner, Chain Lube, MX 40 Rust Cleaner, RATGO Rat Repellent and Upholstery Cleaner.",
      },
      {
        property: "og:title",
        content: "Motoluxe — Autocare That Works As Hard As You Do",
      },
      {
        property: "og:description",
        content:
          "Five dependable care essentials for riders, detailers, workshops and dealers.",
      },
    ],
  }),
  component: Home,
});

const highlights = [
  { value: "05", label: "Core products" },
  { value: "01", label: "Care standard" },
  { value: "24/7", label: "Machines in motion" },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "Care that earns trust",
    body: "Clear application guidance, practical formats and products selected for the way real vehicles are used.",
  },
  {
    icon: Beaker,
    title: "Built with purpose",
    body: "Every product has a job in the routine—from the first clean to the final presentation before handover.",
  },
  {
    icon: Headset,
    title: "Support beyond the shelf",
    body: "Ask us about product use, workshop supply, dealer requirements or building a care kit for your customers.",
  },
];

const careSteps = [
  {
    number: "01",
    title: "Clean the build-up",
    copy: "Start with Chain Cleaner or Upholstery Cleaner to reset the surface.",
  },
  {
    number: "02",
    title: "Protect the weak points",
    copy: "Use Chain Lube and MX 40 Rust Cleaner where wear and moisture show up first.",
  },
  {
    number: "03",
    title: "Store with confidence",
    copy: "Add RATGO Rat Repellent to the garage routine when the machine is parked.",
  },
];

function Home() {
  return (
    <>
      <section className="relative isolate min-h-[calc(100svh-6.5rem)] overflow-hidden border-b border-border">
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={heroImg}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <img
          src={heroImg}
          alt="Motorcycle chain being treated with Motoluxe chain lubricant"
          width={1920}
          height={720}
          className="absolute inset-0 -z-10 h-full w-full object-cover object-center"
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,11,0.94)_0%,rgba(8,9,11,0.74)_40%,rgba(8,9,11,0.22)_100%)]" />
        <div className="absolute inset-0 grid-lines opacity-20" />

        <div className="relative mx-auto grid min-h-[calc(100svh-6.5rem)] max-w-7xl items-end gap-12 px-5 pb-14 pt-20 lg:grid-cols-[1fr_320px] lg:items-center lg:pb-20">
          <div className="max-w-3xl rise-in">
            <span className="slash-tag inline-block bg-primary px-3.5 py-1.5 pr-7 font-display text-[11px] uppercase tracking-[0.28em] text-primary-foreground">
              Motoluxe autocare
            </span>
            <h1 className="mt-7 max-w-2xl font-sans text-5xl font-medium normal-case leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Care for the <span className="text-primary">machine.</span>
              <br />
              Respect the <span className="text-accent">miles.</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Purpose-built care essentials for riders, workshops and dealers
              who know that the details show up in every mile.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/category/$category"
                params={{ category: "chain-care" }}
                className="group inline-flex items-center gap-3 bg-primary px-7 py-4 font-display text-sm uppercase tracking-[0.22em] text-primary-foreground transition-all hover:shadow-[0_16px_40px_-16px_rgba(230,30,35,0.95)]"
              >
                Shop all products
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 border border-white/25 bg-black/20 px-7 py-4 font-display text-sm uppercase tracking-[0.22em] text-foreground backdrop-blur transition-colors hover:border-accent hover:text-accent"
              >
                Dealer enquiries
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="hidden border border-white/20 bg-black/45 p-5 backdrop-blur-md lg:block">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <span className="eyebrow text-accent">The Motoluxe edit</span>
              <Sparkles className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-5 font-display text-3xl font-semibold uppercase leading-none">
              Five essentials.
              <br />
              <span className="text-primary">Zero guesswork.</span>
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white/70">
              {products.slice(0, 3).map((product) => (
                <li key={product.slug} className="flex items-center gap-3">
                  <CircleCheck className="h-4 w-4 text-accent" />
                  {product.name}
                </li>
              ))}
              <li className="font-display text-xs uppercase tracking-[0.18em] text-white/40">
                + two more care essentials
              </li>
            </ul>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1 hazard-stripes" />
      </section>

      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl divide-y divide-border px-5 md:grid-cols-3 md:divide-x md:divide-y-0">
          {highlights.map((highlight) => (
            <div
              key={highlight.label}
              className="flex items-center gap-4 px-0 py-6 md:px-8 first:md:pl-0"
            >
              <span className="font-display text-4xl font-bold text-primary">
                {highlight.value}
              </span>
              <span className="eyebrow text-muted-foreground">
                {highlight.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-7xl px-5 py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="eyebrow text-primary">Shop the essentials</span>
              <h2 className="mt-3 text-2xl font-semibold sm:text-3xl">
                Pick your product
              </h2>
            </div>
            <span className="text-sm text-muted-foreground">
              Tap any product to view details and add it to your cart.
            </span>
          </div>
          <div className="mt-9 grid grid-cols-2 gap-7 sm:grid-cols-5 sm:gap-5">
            {products.map((product) => (
              <Link
                key={product.slug}
                to="/product/$product"
                params={{ product: product.slug }}
                className="group flex flex-col items-center text-center"
              >
                <span className="relative grid h-28 w-28 place-items-center overflow-hidden rounded-full border border-border bg-surface p-1 transition-all duration-500 group-hover:scale-105 group-hover:border-primary group-hover:shadow-[0_14px_35px_-18px_rgba(230,30,35,0.9)] sm:h-32 sm:w-32">
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    width={256}
                    height={256}
                    className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute inset-0 rounded-full bg-linear-to-t from-black/50 via-transparent to-transparent" />
                  <ArrowUpRight className="absolute bottom-3 right-3 h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="mt-4 max-w-[9rem] font-display text-sm uppercase tracking-[0.08em] text-foreground transition-colors group-hover:text-primary">
                  {product.name}
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  View product
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <SectionHead
            eyebrow="Shop by need"
            title="One standard. Every surface."
          />
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground lg:justify-self-end">
            From the chain under load to the upholstery your customer touches,
            Motoluxe makes it easier to build a consistent care routine. Start
            with the job in front of you.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to="/category/$category"
              params={{ category: category.slug }}
              className="group relative min-h-[360px] overflow-hidden border border-border bg-card transition-all duration-500 hover:-translate-y-1 hover:border-primary"
            >
              <img
                src={category.image}
                alt={category.name}
                loading="lazy"
                width={960}
                height={720}
                className="absolute inset-0 h-full w-full object-cover opacity-60 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/55 to-transparent" />
              <div className="absolute right-5 top-5 font-display text-6xl font-bold text-white/15 transition-colors group-hover:text-primary/50">
                {category.index}
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6">
                <span className="eyebrow text-primary">{category.short}</span>
                <h2 className="mt-3 text-3xl font-bold">{category.name}</h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {category.blurb}
                </p>
                <span className="mt-5 inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.22em] text-accent">
                  Explore category
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <SectionHead
              eyebrow="The five essentials"
              title="The Motoluxe range"
            />
            <Link
              to="/contact"
              className="group inline-flex items-center gap-2 font-display text-xs uppercase tracking-[0.2em] text-accent"
            >
              Need a dealer pack?
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featuredProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 lg:py-32">
        <div className="absolute inset-0 grid-lines opacity-20" />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <SectionHead eyebrow="The care routine" title="Small steps. Better ownership." />
            <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground">
              Good maintenance is not complicated. It is consistent. Build a
              routine that protects the machine and makes every handover feel
              considered.
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-flex items-center gap-2 border-b border-primary pb-2 font-display text-xs uppercase tracking-[0.2em] text-primary transition-colors hover:text-accent"
            >
              Talk to Motoluxe
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="border-l border-primary/40 pl-6 lg:pl-12">
            <div className="space-y-0">
              {careSteps.map((step) => (
                <div
                  key={step.number}
                  className="group grid gap-4 border-b border-border py-7 sm:grid-cols-[80px_1fr]"
                >
                  <span className="font-display text-4xl font-bold text-primary/45 transition-colors group-hover:text-primary">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="text-2xl font-semibold">{step.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                      {step.copy}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:py-20">
          <div>
            <span className="eyebrow text-primary-foreground/65">
              For riders, detailers &amp; dealers
            </span>
            <h2 className="mt-4 max-w-3xl text-4xl font-bold sm:text-6xl">
              Stock the right care.
              <br />
              Keep the right standard.
            </h2>
          </div>
          <div className="lg:justify-self-end">
            <p className="max-w-md text-sm leading-relaxed text-primary-foreground/75">
              Looking for bulk supply, product guidance or a care range for
              your dealership? Tell us what you work on and we will point you
              to the right starting line.
            </p>
            <Link
              to="/contact"
              className="group mt-7 inline-flex items-center gap-3 bg-background px-6 py-4 font-display text-xs uppercase tracking-[0.2em] text-foreground transition-colors hover:bg-accent"
            >
              Start an enquiry
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:py-28">
        <SectionHead eyebrow="Why Motoluxe" title="Made for the real routine." />
        <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-3">
          {trust.map((item) => (
            <div
              key={item.title}
              className="group bg-card p-8 transition-colors hover:bg-surface-raised"
            >
              <div className="grid h-12 w-12 place-items-center border border-primary/40 bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-7 text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <MiniProof icon={BadgeCheck} text="Quality-led selection" />
          <MiniProof icon={Wrench} text="Workshop-minded formulas" />
          <MiniProof icon={CarFront} text="Built around real vehicles" />
        </div>
      </section>
    </>
  );
}

function MiniProof({
  icon: Icon,
  text,
}: {
  icon: typeof BadgeCheck;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 border border-border bg-surface px-4 py-4">
      <Icon className="h-4 w-4 text-accent" />
      <span className="font-display text-xs uppercase tracking-[0.16em] text-muted-foreground">
        {text}
      </span>
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <span className="eyebrow flex items-center gap-3 text-primary">
        <span className="h-px w-8 bg-primary" />
        {eyebrow}
      </span>
      <h2 className="mt-4 max-w-3xl text-4xl font-bold sm:text-5xl">{title}</h2>
    </div>
  );
}