import type { PropertyListing } from "../../src/types.js";
import { properties } from "../data/properties.js";

export type PropertyPortalAdapter = {
  name: string;
  fetchListings: () => Promise<PropertyListing[]>;
};

// This repo ships with a seeded adapter so the UI works immediately.
// Real adapters for specific portals can implement the same contract and
// merge public listing data with enrichment services.
export const seededAdapter: PropertyPortalAdapter = {
  name: "seeded-demo",
  async fetchListings() {
    return properties;
  }
};
