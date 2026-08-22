import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("/tmp/services-page1.json", "utf8"));
const services = Array.isArray(data.services) ? data.services : [];
const samples = services
  .filter((service) => {
    const name = String(service.name ?? "");
    return /[A-Za-z]{3,}/.test(name) && !/[\u0600-\u06ff]/.test(name);
  })
  .slice(0, 8)
  .map((service) => ({
    service: service.service,
    name: service.name,
    nameAr: service.nameAr,
    description: service.description,
    descriptionAr: service.descriptionAr,
  }));

console.log(JSON.stringify({ sampleCount: samples.length, samples }, null, 2));
