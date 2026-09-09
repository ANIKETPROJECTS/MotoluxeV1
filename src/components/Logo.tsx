import logoAsset from "@/assets/motoluxe-logo.png";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center bg-white ${
        size === "lg" ? "px-2 py-1.5" : "px-1.5 py-1"
      }`}
    >
      <img src={logoAsset} alt="Motoluxe" className={size === "lg" ? "h-9 w-auto" : "h-7 w-auto"} />
    </span>
  );
}
