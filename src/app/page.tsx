import { redirect } from "next/navigation";

export default function Home() {
  // الخدمات عامة للزائر؛ الصفحات الحساسة تستخدم بوابة الحساب عند الحاجة.
  redirect("/services");
}
