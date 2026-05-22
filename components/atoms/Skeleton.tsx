"use client";

type SkeletonVariant = "text" | "circular" | "rectangular" | "bar";

interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  variant = "rectangular",
  width,
  height,
  borderRadius,
  className = "",
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius:
      borderRadius ?? variant === "circular"
        ? "9999px"
        : variant === "bar"
          ? "9999px"
          : "8px",
  };

  return <div className={`skeleton skeleton--${variant} ${className}`} style={style} />;
}
