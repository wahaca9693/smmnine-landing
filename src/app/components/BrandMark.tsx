"use client";

import { useTheme } from "./ThemeProvider";

/* Dynamic admin-managed image URLs intentionally use a plain img element. */
/* eslint-disable @next/next/no-img-element */

type BrandMarkProps = {
  className?: string;
  imageClassName?: string;
  nameClassName?: string;
  showName?: boolean;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-12 w-12 rounded-2xl",
} as const;

export default function BrandMark({
  className = "",
  imageClassName = "",
  nameClassName = "",
  showName = true,
  size = "md",
}: BrandMarkProps) {
  const { settings } = useTheme();
  const name = settings.siteName?.trim() || "smmnine";
  const mediaUrl = settings.brandMediaUrl?.trim();
  const mediaType = settings.brandMediaType === "video" ? "video" : "image";
  const mediaClassName = `${sizeClasses[size]} shrink-0 object-cover ${imageClassName}`;

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      {mediaUrl && mediaType === "video" ? (
        <video
          key={mediaUrl}
          src={mediaUrl}
          className={mediaClassName}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-label={name}
        />
      ) : (
        <img
          key={mediaUrl || "default-brand"}
          src={mediaUrl || "/logo.gif"}
          alt={name}
          className={mediaClassName}
          loading="eager"
        />
      )}
      {showName && <span className={`min-w-0 truncate ${nameClassName}`}>{name}</span>}
    </div>
  );
}
