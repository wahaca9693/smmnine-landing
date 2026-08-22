import fs from "node:fs";

const file = process.argv[2] ?? "/tmp/services-final-built.json";
const payload = JSON.parse(fs.readFileSync(file, "utf8"));
const services = Array.isArray(payload.services) ? payload.services : [];
const opaqueInText = services.filter((service) => {
  const values = [service.name, service.nameAr, service.description, service.descriptionAr];
  return values.some((value) => /svc_[a-z0-9]+/i.test(String(value ?? "")));
});
const missingArabic = services.filter((service) => !String(service.nameAr ?? "").trim());
const missingDescription = services.filter((service) => !String(service.descriptionAr ?? "").trim());
const duplicateIdentity = new Set();
const duplicates = [];
for (const service of services) {
  const identity = `${service.provider_id ?? service.providerId ?? "follower"}:${service.remote_service_id ?? service.remoteServiceId ?? service.service}`;
  if (duplicateIdentity.has(identity)) duplicates.push(identity);
  duplicateIdentity.add(identity);
}
const providers = new Set(services.map((service) => service.provider_id ?? service.providerId ?? service.source ?? "unknown"));
console.log(JSON.stringify({
  total: services.length,
  providers: providers.size,
  hasArabicName: services.length - missingArabic.length,
  hasArabicDescription: services.length - missingDescription.length,
  opaqueIdsInVisibleText: opaqueInText.length,
  duplicateProviderRemoteIdentity: duplicates.length,
  samples: services.slice(0, 5).map((service) => ({
    service: service.service,
    remote_service_id: service.remote_service_id,
    provider_id: service.provider_id,
    name: service.name,
    nameAr: service.nameAr,
    descriptionAr: service.descriptionAr,
  })),
}, null, 2));
