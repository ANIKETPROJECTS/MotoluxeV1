import logoAsset from "@/assets/motoluxe-logo.png";
import logoOnDarkAsset from "@/assets/motoluxe-logo-on-dark.png";

export function Logo({
  size = "md",
  variant = "default",
}: {
  size?: "md" | "lg";
  variant?: "default" | "onDark";
}) {
  return (
    <span className="inline-flex shrink-0 items-center">
      <img
        src={variant === "onDark" ? logoOnDarkAsset : logoAsset}
        alt="Motoluxe"
        className={size === "lg" ? "h-9 w-auto" : "h-7 w-auto"}
      />
    </span>
  );
}
