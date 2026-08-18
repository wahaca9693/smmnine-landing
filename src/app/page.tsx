import { redirect } from "next/navigation";

export default function Home() {
  // ابدأ من بوابة الدخول مباشرة بدل المرور بصفحة الخدمات المحمية.
  redirect("/login");
}
