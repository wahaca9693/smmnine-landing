"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import { Palette, Save, RefreshCcw, AlertCircle } from "lucide-react";

const fields = [
  { key: "primaryColor", label: "اللون الرئيسي (أزرار/عناوين)" },
  { key: "backgroundColor", label: "لون الخلفية العام" },
  { key: "cardColor", label: "لون البطاقات" },
  { key: "surfaceColor", label: "لون السطوح الداخلية" },
  { key: "borderColor", label: "لون الحدود" },
];

export default function AdminThemePage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setSettings(data.settings || {});
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    setSaving(false);
    setMessage(data.error || "تم حفظ الألوان بنجاح");
    if (!data.error) {
      // refresh page to apply fully
      window.location.reload();
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-border)] border-t-[var(--color-primary)]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="text-[var(--color-primary)]" size={28} />
          <h1 className="text-2xl font-black text-white">محرر الألوان</h1>
        </div>

        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
          {fields.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3">
              <label className="text-sm font-bold text-zinc-300">{f.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings[f.key] || "#000000"}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-[var(--color-border)] bg-transparent"
                />
                <input
                  type="text"
                  value={settings[f.key] || ""}
                  onChange={(e) => setSettings({ ...settings, [f.key]: e.target.value })}
                  className="w-28 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-primary)]"
                />
              </div>
            </div>
          ))}

          <div className="rounded-xl bg-[var(--color-surface)] p-4">
            <div className="text-xs text-zinc-500 mb-2">معاينة الألوان</div>
            <div className="flex gap-2">
              <div className="h-10 flex-1 rounded-lg" style={{ background: settings.primaryColor }} />
              <div className="h-10 flex-1 rounded-lg" style={{ background: settings.backgroundColor }} />
              <div className="h-10 flex-1 rounded-lg" style={{ background: settings.cardColor }} />
              <div className="h-10 flex-1 rounded-lg" style={{ background: settings.surfaceColor }} />
              <div className="h-10 flex-1 rounded-lg" style={{ background: settings.borderColor }} />
            </div>
          </div>

          {message && (
            <div className={`rounded-xl p-3 text-sm font-bold ${message.includes("خطأ") || message.includes("فشل") ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"}`}>
              {message}
            </div>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-dark)] py-3.5 font-black text-white disabled:opacity-50"
          >
            {saving ? <RefreshCcw className="animate-spin" size={18} /> : <Save size={18} />}
            {saving ? "جاري الحفظ..." : "حفظ الألوان"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
