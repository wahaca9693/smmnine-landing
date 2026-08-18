import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import {
  getAdminRow,
  customerLogin,
  customerVerify,
  topupCard,
  startTransfer,
  confirmTransfer,
  resendTransferOtp,
} from "@/lib/asiacell-gateway";

export async function GET() {
  try {
    await requireAuth();
    const admin = await getAdminRow();
    return NextResponse.json({
      connected: !!admin?.store_phone || !!admin?.phone,
      admin_connected: !!admin?.authenticated,
      store_phone: admin?.store_phone || admin?.phone || "",
      exchange_rate: admin?.exchange_rate || 1666,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const userSession = await requireAuth();
    const body = await request.json();
    const action = body.action;
    const admin = await getAdminRow();

    if (action === "login") {
      const result = await customerLogin(userSession.userId!, body.phone);
      return NextResponse.json(result);
    }

    if (action === "verify-otp") {
      const result = await customerVerify(body.sessionId, body.otp);
      return NextResponse.json(result);
    }

    if (action === "topup") {
      const sessionId = typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : undefined;
      const result = await topupCard(userSession.userId!, sessionId, body.voucher, admin);
      return NextResponse.json(result);
    }

    if (action === "transfer") {
      const result = await startTransfer(userSession.userId!, body.sessionId, parseInt(body.amount, 10), admin);
      return NextResponse.json(result);
    }

    if (action === "confirm") {
      const result = await confirmTransfer(userSession.userId!, body.sessionId, body.otp, admin);
      return NextResponse.json(result);
    }

    if (action === "resend") {
      const result = await resendTransferOtp(body.sessionId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (err: any) {
    console.error("[Asiacell Customer]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
