import fs from "node:fs";

const payload = JSON.parse(fs.readFileSync("/tmp/services-final.json", "utf8"));
const services = Array.isArray(payload.services) ? payload.services : [];
const matches = services
  .filter((service) => /Targeted|Real|For|USA|Italy|India|Nigeria|Cheapest|Chepest/i.test(String(service.name ?? "")))
  .slice(0, 20)
  .map((service) => ({
    service: service.service,
    name: service.name,
    nameAr: service.nameAr,
    descriptionAr: service.descriptionAr,
  }));
console.log(JSON.stringify(matches, null, 2));
