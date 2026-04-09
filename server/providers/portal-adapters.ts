import type { PropertyListing } from "../../src/types.js";
import { properties } from "../data/properties.js";
import { fetchZooplaListings, type LiveQuery } from "./zoopla-live.js";

export type PropertyPortalAdapter = {
  name: string;
  fetchListings: (query?: LiveQuery) => Promise<PropertyListing[]>;
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

export const zooplaAdapter: PropertyPortalAdapter = {
  name: "zoopla-live",
  async fetchListings(query) {
    if (!query) return [];
    return fetchZooplaListings(query);
  }
};
