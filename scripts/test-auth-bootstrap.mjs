const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const publicRoutes = ["/services", "/api/services", "/terms", "/updates"];
const protectedPages = ["/deposit", "/api-access", "/profile", "/transactions", "/settings/security", "/orders/new", "/admin"];
const protectedApis = ["/api/user", "/api/deposit", "/api/transactions", "/api/admin/analytics"];

async function check(path) {
  const response = await fetch(`${base}${path}`, {
    redirect: "manual",
    headers: { "cache-control": "no-cache" },
  });
  const body = await response.text();
  return { path, status: response.status, location: response.headers.get("location"), body };
}

const results = [];
for (const path of [...publicRoutes, ...protectedPages, ...protectedApis]) {
  results.push(await check(path));
}

const publicFailures = results.filter((item) => publicRoutes.includes(item.path) && (item.status < 200 || item.status >= 400));
const serverFailures = results.filter((item) => item.status >= 500);
const apiUser = results.find((item) => item.path === "/api/user");
const frameworkShellMatches = results.filter((item) => protectedPages.includes(item.path) && /إلغاء أو تسريع الطلبات|شحن الرصيد|سجل المعاملات|إدارة الموقع/.test(item.body));

console.log(JSON.stringify({
  base,
  public: results.filter((item) => publicRoutes.includes(item.path)).map(({ path, status, location }) => ({ path, status, location })),
  protectedPages: results.filter((item) => protectedPages.includes(item.path)).map(({ path, status, location }) => ({ path, status, location })),
  protectedApis: results.filter((item) => protectedApis.includes(item.path)).map(({ path, status, location }) => ({ path, status, location })),
  apiUserGuestStatus: apiUser?.status,
  publicFailures: publicFailures.map(({ path, status }) => ({ path, status })),
  serverFailures: serverFailures.map(({ path, status }) => ({ path, status })),
  frameworkShellMatches: frameworkShellMatches.map(({ path }) => path),
}, null, 2));

if (publicFailures.length || serverFailures.length || apiUser?.status !== 401) process.exit(1);
