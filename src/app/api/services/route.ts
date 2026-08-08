import { NextResponse } from "next/server";
import { getServices } from "@/lib/smmnine";
import { detectPlatform, detectServiceType } from "@/lib/platform-mapping";

const platforms = [
  { id: "facebook", name: "فيسبوك", color: "#1877F2" },
  { id: "tiktok", name: "تيك توك", color: "#000000" },
  { id: "instagram", name: "إنستغرام", color: "#E4405F" },
  { id: "whatsapp", name: "واتساب", color: "#25D366" },
  { id: "twitter", name: "تويتر / X", color: "#1DA1F2" },
  { id: "youtube", name: "يوتيوب", color: "#FF0000" },
  { id: "telegram", name: "تيليجرام", color: "#229ED9" },
  { id: "discord", name: "ديسكورد", color: "#5865F2" },
  { id: "snapchat", name: "سناب جات", color: "#FFFC00" },
  { id: "threads", name: "ثريدز", color: "#000000" },
  { id: "twitch", name: "تويتش", color: "#9146FF" },
  { id: "kuaishou", name: "كواي", color: "#FF6600" },
  { id: "likee", name: "كيك", color: "#FF0050" },
  { id: "spotify", name: "سبوتيفاي", color: "#1DB954" },
  { id: "other", name: "أخرى", color: "#6B7280" },
  { id: "all", name: "الكل", color: "var(--color-primary)" },
];

export async function GET() {
  try {
    const services = await getServices();
    const enrichedServices = services.map((s: any) => ({
      ...s,
      platform: detectPlatform(s.category || "", s.name || ""),
      serviceType: detectServiceType(s.name || ""),
    }));

    const categories = [...new Set(services.map((s: any) => s.category || "عام"))].sort();

    return NextResponse.json({
      services: enrichedServices,
      categories,
      platforms,
      count: services.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
