import { execFile } from "node:child_process";
import fs from "node:fs";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PropertyListing } from "../../src/types.js";

const execFileAsync = promisify(execFile);
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const scraperCandidates = [
  path.resolve(currentDir, "../scrapers/zoopla_scraper.py"),
  path.resolve(currentDir, "../../../server/scrapers/zoopla_scraper.py")
];
const scraperPath = scraperCandidates.find((candidate) => fs.existsSync(candidate)) ?? scraperCandidates[0];

export type LiveQuery = {
  counties: string[];
  town: string;
  maxPrice: number;
  minBeds: number;
  minBaths: number;
  garden: boolean;
};

export async function fetchZooplaListings(query: LiveQuery): Promise<PropertyListing[]> {
  if (!query.counties.length && !query.town) {
    return [];
  }

  try {
    const payload = JSON.stringify(query);
    const { stdout } = await execFileAsync("python", [scraperPath, payload], {
      timeout: 90000,
      maxBuffer: 10 * 1024 * 1024
    });
    return JSON.parse(stdout) as PropertyListing[];
  } catch {
    return [];
  }
}
