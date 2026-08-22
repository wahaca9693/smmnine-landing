import SuperTokens from "supertokens-node";
import Passwordless from "supertokens-node/recipe/passwordless";

type OtpResult = {
  status: "OK";
  preAuthSessionId: string;
  deviceId: string;
  codeLifetime: number;
};

type OtpCheckResult =
  | { status: "OK"; consumedDevice?: { email?: string; preAuthSessionId?: string } }
  | { status: "INCORRECT_USER_INPUT_CODE_ERROR" | "EXPIRED_USER_INPUT_CODE_ERROR"; failedCodeInputAttemptCount?: number; maximumCodeInputAttempts?: number }
  | { status: "RESTART_FLOW_ERROR" };

const TENANT_ID = String(process.env.SUPERTOKENS_TENANT_ID || "public").trim() || "public";
let initialized = false;

function requiredSetting(name: string): string {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error("SUPERTOKENS_NOT_CONFIGURED");
  return value;
}

function ensureInitialized(): void {
  if (initialized) return;
  const connectionURI = requiredSetting("SUPERTOKENS_CONNECTION_URI").replace(/\/$/, "");
  const apiKey = requiredSetting("SUPERTOKENS_API_KEY");
  const appUrl = String(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  SuperTokens.init({
    supertokens: { connectionURI, apiKey },
    appInfo: {
      appName: String(process.env.SUPERTOKENS_APP_NAME || "follower"),
      apiDomain: appUrl,
      websiteDomain: appUrl,
      apiBasePath: "/api/auth",
      websiteBasePath: "/login",
    },
    recipeList: [
      Passwordless.init({ contactMethod: "EMAIL", flowType: "USER_INPUT_CODE" }),
    ],
  });
  initialized = true;
}

export async function startEmailOtp(email: string): Promise<OtpResult> {
  ensureInitialized();
  const result = await Passwordless.createCode({ email, tenantId: TENANT_ID });
  return {
    status: "OK",
    preAuthSessionId: result.preAuthSessionId,
    deviceId: result.deviceId,
    codeLifetime: result.codeLifetime,
  };
}

export async function checkEmailOtp(input: {
  preAuthSessionId: string;
  deviceId: string;
  userInputCode: string;
}): Promise<OtpCheckResult> {
  ensureInitialized();
  return Passwordless.checkCode({
    tenantId: TENANT_ID,
    preAuthSessionId: input.preAuthSessionId,
    deviceId: input.deviceId,
    userInputCode: input.userInputCode,
  });
}

export async function resendEmailOtp(input: {
  deviceId: string;
}): Promise<OtpResult | { status: "RESTART_FLOW_ERROR" | "USER_INPUT_CODE_ALREADY_USED_ERROR" }> {
  ensureInitialized();
  const result = await Passwordless.createNewCodeForDevice({
    tenantId: TENANT_ID,
    deviceId: input.deviceId,
  });
  if (result.status !== "OK") return result;
  return {
    status: "OK",
    preAuthSessionId: result.preAuthSessionId,
    deviceId: result.deviceId,
    codeLifetime: result.codeLifetime,
  };
}

export function superTokensOtpConfigured(): boolean {
  return Boolean(String(process.env.SUPERTOKENS_CONNECTION_URI || "").trim() && String(process.env.SUPERTOKENS_API_KEY || "").trim());
}
