import { loadServiceCatalog } from "../src/lib/service-catalog.ts";

const services = await loadServiceCatalog();
const identities = new Set();
const publicIds = new Set();
let duplicateInternal = 0;
let duplicatePublic = 0;
for (const service of services) {
  const identity = `${service.source}:${service.providerId ?? "follower"}:${service.providerServiceId ?? service.remoteServiceId}`;
  const publicId = service.serviceId;
  if (identities.has(identity)) duplicateInternal += 1;
  if (publicIds.has(publicId)) duplicatePublic += 1;
  identities.add(identity);
  publicIds.add(publicId);
}
const providerCounts = Object.entries(
  services.reduce((counts, service) => {
    const key = `${service.source}:${service.providerId ?? "follower"}`;
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {}),
).slice(0, 20);
console.log(JSON.stringify({
  total: services.length,
  uniqueInternalIdentities: identities.size,
  duplicateInternalIdentity: duplicateInternal,
  uniquePublicServiceIds: publicIds.size,
  duplicatePublicServiceId: duplicatePublic,
  providerCounts,
  samples: services.slice(0, 8).map((service) => ({
    source: service.source,
    providerId: service.providerId,
    providerServiceId: service.providerServiceId,
    remoteServiceId: service.remoteServiceId,
    serviceId: service.serviceId,
    name: service.name,
    nameAr: service.nameAr,
  })),
}, null, 2));
