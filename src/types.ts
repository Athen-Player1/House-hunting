export type SchoolBand = "A" | "B" | "C" | "D" | "E" | "F";

export type CrimeBand = "Very low" | "Low" | "Moderate" | "High";

export type PropertyListing = {
  id: string;
  source: string;
  title: string;
  listingUrl: string;
  isLiveListing: boolean;
  county: string;
  town: string;
  postcode: string;
  latitude: number;
  longitude: number;
  price: number;
  originalPrice: number;
  reducedBy: number;
  reductionPercent: number;
  beds: number;
  baths: number;
  areaSqFt: number;
  features: string[];
  lotLabel: string;
  garden: boolean;
  propertyType: string;
  dealScore: number;
  schoolBand: SchoolBand;
  schoolSummary: string;
  crimeBand: CrimeBand;
  crimeRate: number;
  estimatedValue: number;
  valueConfidence: "Indicative" | "Medium" | "High";
  saleComparable: string;
  marketMomentum: string;
  floodRisk: "Very low" | "Low" | "Moderate" | "High";
  planningPressure: string;
  broadband: string;
  trainMins: number;
  epc: string;
  image: string;
  summary: string;
  listedDaysAgo: number;
};

export type PropertyResponse = {
  items: PropertyListing[];
  nextCursor: string | null;
  total: number;
  availableCounties: string[];
  availableTowns: string[];
  townsByCounty: Record<string, string[]>;
  availablePropertyTypes: string[];
  availableFeatures: string[];
};
