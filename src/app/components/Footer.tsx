"use client";

import { useTheme } from "./ThemeProvider";

export default function Footer() {
  const { settings } = useTheme();
  const brandName = settings.siteName || "follower";
  return (
    <footer className="bg-[#0a2463] px-5 py-7 text-center text-sm text-white/70">
      <p>
        © {new Date().getFullYear()} {brandName}. جميع الحقوق محفوظة.
      </p>
    </footer>
  );
}
