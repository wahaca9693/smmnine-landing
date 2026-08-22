const base = process.env.BASE_URL || "http://127.0.0.1:3000";

async function request(path, options = {}) {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, { redirect: "manual", ...options });
  const text = await response.text();
  return {
    path,
    status: response.status,
    elapsedMs: Date.now() - started,
    contentType: response.headers.get("content-type") || "",
    text,
  };
}

function parseJson(result) {
  try {
    return JSON.parse(result.text);
  } catch {
    return null;
  }
}

const results = [];
results.push(await request("/api/health"));
results.push(await request("/api/catalog-platforms"));
results.push(await request("/api/services"));
results.push(await request("/api/user/security"));
results.push(await request("/api/user/security/settings", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ is2faEnabled: true, securityCode: "123456" }),
}));
results.push(await request("/services"));

const services = parseJson(results.find((item) => item.path === "/api/services"));
const platforms = parseJson(results.find((item) => item.path === "/api/catalog-platforms"));
const health = parseJson(results.find((item) => item.path === "/api/health"));
const securityGet = results.find((item) => item.path === "/api/user/security");
const securityPost = results.find((item) => item.path === "/api/user/security/settings");
const servicesPage = results.find((item) => item.path === "/services");

const serviceRows = Array.isArray(services?.services) ? services.services : [];
const platformRows = Array.isArray(platforms?.platforms) ? platforms.platforms : [];
const visibleTextFields = ["name", "nameAr", "description", "descriptionAr", "category", "categoryAr", "platform", "serviceType"];
const leakedIds = serviceRows.filter((service) => visibleTextFields.some((field) => typeof service[field] === "string" && /svc_[A-Za-z0-9_-]+/.test(service[field]))).length;
const translatedRows = serviceRows.filter((service) => typeof service.nameAr === "string" && service.nameAr.trim().length > 0).length;
const describedRows = serviceRows.filter((service) => typeof service.descriptionAr === "string" && service.descriptionAr.trim().length > 0).length;
const defaultPlatformNames = ["فيسبوك", "تيك توك", "إنستغرام", "واتساب", "تويتر / X", "يوتيوب", "تيليجرام", "ديسكورد", "سناب شات", "ثريدز", "تويتش", "كواي", "لايكي", "سبوتيفاي", "أخرى"];
const pageHasRefill = /إعادة التعبئة|التعبئة التلقائية|auto-refill|autoRefill/i.test(servicesPage.text);

const report = {
  base,
  health: { status: results[0].status, body: health, elapsedMs: results[0].elapsedMs },
  catalogPlatforms: { status: results[1].status, count: platformRows.length, elapsedMs: results[1].elapsedMs },
  services: {
    status: results[2].status,
    count: serviceRows.length,
    translatedRows,
    describedRows,
    leakedIds,
    elapsedMs: results[2].elapsedMs,
    sample: serviceRows.slice(0, 3).map(({ service, name, nameAr, description, descriptionAr, platform }) => ({ service, name, nameAr, description, descriptionAr, platform })),
  },
  securityUnauthenticated: { getStatus: securityGet.status, postStatus: securityPost.status, getElapsedMs: securityGet.elapsedMs, postElapsedMs: securityPost.elapsedMs },
  servicesPage: { status: servicesPage.status, elapsedMs: servicesPage.elapsedMs, pageHasRefill, hasAllDefaultPlatformLabels: defaultPlatformNames.every((label) => servicesPage.text.includes(label)) },
};

console.log(JSON.stringify(report, null, 2));

if (report.health.status !== 200) process.exitCode = 1;
if (report.catalogPlatforms.status !== 200) process.exitCode = 1;
if (report.services.status !== 200 || serviceRows.length === 0) process.exitCode = 1;
if (translatedRows !== serviceRows.length || describedRows !== serviceRows.length || leakedIds !== 0) process.exitCode = 1;
if (securityGet.status !== 401 || securityPost.status !== 401) process.exitCode = 1;
if (servicesPage.status !== 200 || pageHasRefill) process.exitCode = 1;
