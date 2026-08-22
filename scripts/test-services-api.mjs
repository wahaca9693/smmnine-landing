import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("/tmp/services_body_final.json", "utf8"));
const ids = (data.services || []).map((service) => String(service.service));
const providerPrefix = ids.filter((id) => id.startsWith("provider:"));
const opaque = ids.filter((id) => id.startsWith("svc_"));
const invalidOpaque = opaque.filter((id) => !/^svc_[a-f0-9]{20}$/.test(id));
const report = {
  count: data.count,
  services: data.services?.length,
  opaqueCount: opaque.length,
  providerPrefixCount: providerPrefix.length,
  invalidOpaqueCount: invalidOpaque.length,
  platforms: data.platforms?.map((platform) => platform.id).slice(0, 40),
  sample: data.services?.slice(0, 3),
};
console.log(JSON.stringify(report, null, 2));
if (report.count < 1 || providerPrefix.length > 0 || invalidOpaque.length > 0) {
  process.exit(1);
}
