import { Suspense } from "react";
import NewOrderContent from "./NewOrderContent";

export default function NewOrderPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-[var(--color-bg)]"><div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" /></div>}>
      <NewOrderContent />
    </Suspense>
  );
}
