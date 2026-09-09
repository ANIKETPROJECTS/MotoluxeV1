import logoAsset from "@/assets/motoluxe-logo.png";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <img src={logoAsset} alt="Motoluxe" className={size === "lg" ? "h-9 w-auto" : "h-7 w-auto"} />
    </span>
  );
}
