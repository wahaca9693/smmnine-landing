"use client";

export default function Footer() {
  return (
    <footer className="bg-[#0a2463] px-5 py-7 text-center text-sm text-white/70">
      <p>
        © {new Date().getFullYear()} SmmNine. جميع الحقوق محفوظة.
      </p>
    </footer>
  );
}
