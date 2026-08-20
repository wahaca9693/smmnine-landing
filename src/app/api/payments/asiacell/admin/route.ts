import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAdminRow, adminLogin, adminVerify, adminLogout, setAdminRow, checkRecordsAndCredit, cleanPhone } from "@/lib/asiacell-gateway";

type AdminActionBody = {
  action?: unknown;
  phone?: unknown;
  otp?: unknown;
  rate?: unknown;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error";
}

export async function GET() {
  try {
    await requireAdmin();
    const admin = await getAdminRow();
    return NextResponse.json({
      authenticated: !!admin?.authenticated,
      phone: admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
      store_phone: admin?.store_phone || admin?.phone || "",
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body: AdminActionBody = await request.json();
    const action = body.action;

    if (action === "login") {
      const result = await adminLogin(typeof body.phone === "string" ? body.phone : "");
      return NextResponse.json(result);
    }

    if (action === "verify") {
      const result = await adminVerify(typeof body.otp === "string" ? body.otp : "");
      return NextResponse.json(result);
    }

    if (action === "logout") {
      await adminLogout();
      return NextResponse.json({ success: true });
    }

    if (action === "set-store-phone") {
      const phone = cleanPhone(typeof body.phone === "string" ? body.phone : "");
      if (!/^07\d{9}$/.test(phone)) {
        return NextResponse.json({ error: "رقم آسياسيل يجب أن يكون 07XXXXXXXXX" }, { status: 400 });
      }
      await setAdminRow({ store_phone: phone });
      return NextResponse.json({ success: true, store_phone: phone });
    }

    if (action === "set-rate") {
      const rate = Number(body.rate);
      if (!rate || rate <= 0) {
        return NextResponse.json({ error: "سعر الصرف غير صالح" }, { status: 400 });
      }
      await setAdminRow({ exchange_rate: rate });
      return NextResponse.json({ success: true, exchange_rate: rate });
    }

    if (action === "check-records") {
      const result = await checkRecordsAndCredit();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Asiacell Admin]", error);
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
