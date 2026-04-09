import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { properties } from "./data/properties.js";
import { ukCounties } from "./data/uk-counties.js";
import { seededAdapter, zooplaAdapter } from "./providers/portal-adapters.js";
import type { PropertyListing } from "../src/types.js";

const app = express();
const port = Number(process.env.PORT ?? 8787);
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const distDir = path.resolve(currentDir, "../../dist");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/properties", async (request, response) => {
  const limit = Number(request.query.limit ?? 6);
  const cursor = Number(request.query.cursor ?? 0);
  const counties = String(request.query.counties ?? "")
    .split(",")
    .map((county) => county.trim())
    .filter(Boolean);
  const town = String(request.query.town ?? "").trim();
  const search = String(request.query.search ?? "").trim().toLowerCase();
  const maxPrice = Number(request.query.maxPrice ?? Number.MAX_SAFE_INTEGER);
  const minReduction = Number(request.query.minReduction ?? 0);
  const minBeds = Number(request.query.minBeds ?? 3);
  const minBaths = Number(request.query.minBaths ?? 0);
  const propertyType = String(request.query.propertyType ?? "").trim();
  const epc = String(request.query.epc ?? "").trim();
  const garden = request.query.garden === "true";
  const featureList = String(request.query.features ?? "")
    .split(",")
    .map((feature) => feature.trim())
    .filter(Boolean);

  const liveListings = await zooplaAdapter.fetchListings({
    counties,
    town,
    maxPrice,
    minBeds,
    minBaths,
    garden
  });
  const seededListings = await seededAdapter.fetchListings();
  const catalog = [...liveListings, ...seededListings].filter(
    (property, index, list) =>
      list.findIndex(
        (candidate) => candidate.listingUrl === property.listingUrl || candidate.id === property.id
      ) === index
  );

  const filtered = catalog.filter((property: PropertyListing) => {
    const haystack =
      `${property.title} ${property.town} ${property.county} ${property.postcode} ${property.summary} ${property.features.join(" ")}`.toLowerCase();

    return (
      (!counties.length || counties.includes(property.county)) &&
      (!town || property.town === town) &&
      (Number.isNaN(maxPrice) || property.price <= maxPrice) &&
      (Number.isNaN(minBeds) || property.beds >= minBeds) &&
      (Number.isNaN(minBaths) || property.baths >= minBaths) &&
      (!propertyType || property.propertyType === propertyType) &&
      (!epc || property.epc === epc) &&
      (!garden || property.garden) &&
      featureList.every((feature) => property.features.includes(feature)) &&
      property.reducedBy >= minReduction &&
      (!search || haystack.includes(search))
    );
  });

  const availableCounties = ukCounties;
  const availableTowns = [...new Set(catalog.map((property) => property.town).filter(Boolean))];
  const availablePropertyTypes = [...new Set(catalog.map((property) => property.propertyType))];
  const availableFeatures = [...new Set(catalog.flatMap((property) => property.features))].sort();
  const townsByCounty = Object.fromEntries(
    availableCounties.map((entryCounty) => [
      entryCounty,
      [
        ...new Set(
          catalog
            .filter((property: PropertyListing) => property.county === entryCounty)
            .map((property: PropertyListing) => property.town)
        )
      ]
    ])
  );
  const items = filtered.slice(cursor, cursor + limit);
  const nextCursor = cursor + limit < filtered.length ? String(cursor + limit) : null;

  response.json({
    items,
    nextCursor,
    total: filtered.length,
    availableCounties,
    availableTowns,
    townsByCounty,
    availablePropertyTypes,
    availableFeatures
  });
});

app.use(express.static(distDir));

app.get("*", (request, response, next) => {
  if (request.path.startsWith("/api")) {
    next();
    return;
  }

  response.sendFile(path.join(distDir, "index.html"), (error) => {
    if (error) {
      next();
    }
  });
});

app.listen(port, () => {
  console.log(`Editorial Estate API running on http://localhost:${port}`);
});
