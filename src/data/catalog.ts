import chainCleaner from "@/assets/p-chain-cleaner.jpg";
import chainLube from "@/assets/p-chain-lube.jpg";
import mx40RustCleaner from "@/assets/p-oil-booster.jpg";
import ratgoRepellent from "@/assets/p-wax.jpg";
import upholsteryCleaner from "@/assets/p-detailer.jpg";

import catChain from "@/assets/cat-chain-care.jpg";
import catGarage from "@/assets/cat-engine-care.jpg";
import catInterior from "@/assets/cat-body-detailing.jpg";

export type CategorySlug = "chain-care" | "garage-protection" | "interior-care";

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  price: string;
  size: string;
  image: string;
  badge?: string;
  description: string;
  benefits: string[];
  usage: string[];
};

export type Category = {
  slug: CategorySlug;
  name: string;
  short: string;
  blurb: string;
  details: string[];
  image: string;
  index: string;
};

export const categories: Category[] = [
  {
    slug: "chain-care",
    name: "Chain Care",
    short: "Clean. Lube. Ride.",
    blurb:
      "The essential two-step system for a smoother, quieter and better-protected motorcycle chain.",
    details: [
      "Reset the chain before fresh lubrication",
      "Keep friction, road film and abrasive dust in check",
      "Build a repeatable care routine at home or in the workshop",
    ],
    image: catChain,
    index: "01",
  },
  {
    slug: "garage-protection",
    name: "Garage Protection",
    short: "Defend every bay.",
    blurb:
      "Smart protection for the machines, storage spaces and workshop surfaces that keep you moving.",
    details: [
      "Release surface rust before it becomes a bigger repair",
      "Make parked vehicles less inviting to rodents",
      "Protect the tools, hardware and spaces behind every ride",
    ],
    image: catGarage,
    index: "02",
  },
  {
    slug: "interior-care",
    name: "Interior Care",
    short: "Fresh, ready, professional.",
    blurb:
      "Restore the clean, cared-for finish customers notice first, from seats to cabin touch points.",
    details: [
      "Lift everyday marks from upholstery and interior surfaces",
      "Prepare vehicles for handover, display or the next drive",
      "Keep the finish consistent across home and professional care",
    ],
    image: catInterior,
    index: "03",
  },
];

export const products: Product[] = [
  {
    slug: "chain-cleaner",
    name: "Chain Cleaner",
    tagline: "Lift the grime before it becomes wear.",
    category: "chain-care",
    price: "Request price",
    size: "Retail pack",
    image: chainCleaner,
    badge: "Workshop essential",
    description:
      "A deep-cleaning chain formula made to loosen road film, old lubricant and abrasive dust before your next maintenance cycle.",
    benefits: [
      "Helps lift stubborn road grime and old lubricant",
      "Designed for routine motorcycle chain maintenance",
      "Prepares the surface for a fresh protective film",
      "A practical first step for home and workshop use",
    ],
    usage: [
      "Place the motorcycle securely and cover nearby painted surfaces.",
      "Apply evenly across the chain while rotating the rear wheel slowly.",
      "Allow the cleaner to work, then agitate with a suitable chain brush.",
      "Wipe clean and let the chain dry completely before lubrication.",
    ],
  },
  {
    slug: "chain-lube",
    name: "Chain Lube",
    tagline: "A clean, tenacious film for every ride.",
    category: "chain-care",
    price: "Request price",
    size: "Retail pack",
    image: chainLube,
    badge: "Rider favourite",
    description:
      "A high-tack chain lubricant for riders who want dependable protection after a clean, without a messy finish on the surrounding wheel.",
    benefits: [
      "Helps reduce friction between chain and sprocket",
      "Creates a durable film for everyday riding",
      "Suitable for scheduled motorcycle chain care",
      "Easy to pair with Motoluxe Chain Cleaner",
    ],
    usage: [
      "Use only on a clean and fully dry chain.",
      "Apply to the inner run while rotating the rear wheel.",
      "Give the film time to settle before starting the motorcycle.",
      "Wipe away excess product from the outer plates.",
    ],
  },
  {
    slug: "mx-40-rust-cleaner",
    name: "MX 40 Rust Cleaner",
    tagline: "Release rust. Recover the surface.",
    category: "garage-protection",
    price: "Request price",
    size: "Retail pack",
    image: mx40RustCleaner,
    badge: "Workshop pick",
    description:
      "A focused rust-cleaning treatment for the hardware, tools and metal surfaces that see humidity, dust and hard use.",
    benefits: [
      "Helps loosen surface rust and oxidation",
      "Useful across common workshop metal surfaces",
      "Makes follow-up cleaning and protection easier",
      "Built for regular garage and service-bay use",
    ],
    usage: [
      "Remove loose dirt and wipe the target surface dry.",
      "Apply MX 40 Rust Cleaner to the affected area.",
      "Allow the product to work, then agitate with a soft brush.",
      "Wipe clean and follow with suitable surface protection.",
    ],
  },
  {
    slug: "ratgo-rat-repellent",
    name: "RATGO Rat Repellent",
    tagline: "Keep parked machines protected.",
    category: "garage-protection",
    price: "Request price",
    size: "Retail pack",
    image: ratgoRepellent,
    badge: "Garage essential",
    description:
      "A practical deterrent for vehicle owners and workshops looking to protect parked machines from unwanted rodent attention.",
    benefits: [
      "Designed for parked vehicles and garage spaces",
      "Helps create a less inviting environment for rodents",
      "A simple addition to long-term vehicle storage",
      "Useful for homes, workshops and dealer stock yards",
    ],
    usage: [
      "Clean the intended area and remove food or nesting material.",
      "Place or apply the product as directed on the pack.",
      "Keep the treatment area dry and easy to inspect.",
      "Refresh the treatment as part of your vehicle storage routine.",
    ],
  },
  {
    slug: "upholstery-cleaner",
    name: "Upholstery Cleaner",
    tagline: "Bring back the clean customers feel.",
    category: "interior-care",
    price: "Request price",
    size: "Retail pack",
    image: upholsteryCleaner,
    badge: "Detailing essential",
    description:
      "A surface-friendly cleaner for upholstery and interior touch points, made for the final presentation of cars, bikes and customer vehicles.",
    benefits: [
      "Helps lift everyday marks and grime from upholstery",
      "Ideal for detailing and vehicle handover preparation",
      "Supports a cleaner, more cared-for cabin finish",
      "A useful staple for detailers and dealerships",
    ],
    usage: [
      "Vacuum loose dust and test a hidden area first.",
      "Apply a small amount to the cloth or target surface.",
      "Work gently in overlapping passes without soaking the material.",
      "Allow the surface to dry, then inspect and repeat if needed.",
    ],
  },
];

export const getCategory = (slug: string) => categories.find((category) => category.slug === slug);

export const getProductsByCategory = (slug: string) =>
  products.filter((product) => product.category === slug);

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);

export const featuredProducts = products;
