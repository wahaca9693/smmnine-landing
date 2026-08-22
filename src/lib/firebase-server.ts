import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const firebaseKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"));

type FirebaseClaims = JWTPayload & {
  user_id?: string;
  email?: string;
  email_verified?: boolean;
  firebase?: { sign_in_provider?: string };
};

function getProjectId() {
  return String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "").trim();
}

export type VerifiedFirebaseEmail = {
  uid: string;
  email: string;
  emailVerified: boolean;
  authTime: number;
};

export async function verifyFirebaseEmailIdToken(idToken: string, requireVerified = true): Promise<VerifiedFirebaseEmail> {
  const projectId = getProjectId();
  if (!projectId) throw new Error("FIREBASE_NOT_CONFIGURED");
  if (!idToken || idToken.length > 10000) throw new Error("FIREBASE_TOKEN_INVALID");

  const { payload } = await jwtVerify(idToken, firebaseKeys, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
  const claims = payload as FirebaseClaims;
  const uid = String(claims.user_id || claims.sub || "").trim();
  const email = String(claims.email || "").trim().toLowerCase();
  const provider = String(claims.firebase?.sign_in_provider || "").trim();
  const emailVerified = claims.email_verified === true;
  const authTime = Number(claims.auth_time || 0);

  if (!uid || uid.length > 256 || !email || !["password", "emailLink"].includes(provider) || !Number.isFinite(authTime) || authTime <= 0) {
    throw new Error("FIREBASE_EMAIL_TOKEN_INVALID");
  }
  if (requireVerified && !emailVerified) throw new Error("FIREBASE_EMAIL_VERIFICATION_REQUIRED");
  return { uid, email, emailVerified, authTime };
}
