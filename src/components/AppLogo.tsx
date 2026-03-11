import logoBlack from "@/assets/logo-orlando-fastpass.png";

interface AppLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-8",
  md: "h-10",
  lg: "h-14",
};

export function AppLogo({ className = "", size = "md" }: AppLogoProps) {
  return (
    <img
      src={logoBlack}
      alt="Orlando Fast Pass"
      className={`${sizeMap[size]} w-auto object-contain ${className}`}
    />
  );
}
