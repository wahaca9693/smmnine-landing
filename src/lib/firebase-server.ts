import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const GOOGLE_CERTS_URL = new URL("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
const googleKeys = createRemoteJWKSet(GOOGLE_CERTS_URL);

type FirebaseClaims = JWTPayload & {
  user_id?: string;
  phone_number?: string;
  email?: string;
  firebase?: { sign_in_provider?: string; identities?: Record<string, unknown> };
};

function projectId(): string {
  return String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "").trim();
}

export type VerifiedFirebasePhone = {
  uid: string;
  phoneNumber: string;
  email?: string;
  authTime: number;
};

export async function verifyFirebasePhoneIdToken(idToken: string): Promise<VerifiedFirebasePhone> {
  const configuredProjectId = projectId();
  if (!configuredProjectId) throw new Error("FIREBASE_NOT_CONFIGURED");
  if (!idToken || idToken.length > 10000) throw new Error("FIREBASE_TOKEN_INVALID");

  const { payload } = await jwtVerify(idToken, googleKeys, {
    algorithms: ["RS256"],
    audience: configuredProjectId,
    issuer: `https://securetoken.google.com/${configuredProjectId}`,
  });
  const claims = payload as FirebaseClaims;
  const uid = String(claims.user_id || claims.sub || "").trim();
  const phoneNumber = String(claims.phone_number || "").trim();
  const provider = String(claims.firebase?.sign_in_provider || "").trim();
  const authTime = Number(claims.auth_time || 0);

  if (!uid || uid.length > 256 || !phoneNumber || provider !== "phone" || !Number.isFinite(authTime) || authTime <= 0) {
    throw new Error("FIREBASE_PHONE_TOKEN_REQUIRED");
  }
  return { uid, phoneNumber, email: claims.email ? String(claims.email) : undefined, authTime };
}
