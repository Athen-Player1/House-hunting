import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { PropertyListing, PropertyResponse } from "./types";

const PAGE_SIZE = 6;
const SAVED_KEY = "editorial-estate.saved";
const ALERT_KEY = "editorial-estate.alerts";
const ALERT_FEED_KEY = "editorial-estate.alert-feed";
const SNAPSHOT_KEY = "editorial-estate.price-snapshots";

type TabId = "feed" | "saved" | "map" | "settings";

type Filters = {
  counties: string[];
  town: string;
  search: string;
  maxPrice: number;
  minReduction: number;
  minBeds: number;
  minBaths: number;
  propertyType: string;
  epc: string;
  featureSelections: string[];
  gardenOnly: boolean;
};

type PriceAlert = {
  id: string;
  propertyId: string;
  previousPrice: number;
  newPrice: number;
  createdAt: string;
  read: boolean;
};

const defaultFilters: Filters = {
  counties: [],
  town: "",
  search: "",
  maxPrice: 750000,
  minReduction: 5000,
  minBeds: 3,
  minBaths: 1,
  propertyType: "",
  epc: "",
  featureSelections: ["Garden"],
  gardenOnly: true
};

function currency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function valuationDelta(property: PropertyListing) {
  return property.estimatedValue - property.price;
}

function scoreTone(score: number) {
  if (score >= 88) return "bg-[#0f3b26] text-white";
  if (score >= 78) return "bg-secondary-container text-on-secondary-container";
  if (score >= 68) return "bg-[#f5eadf] text-[#6d3f00]";
  return "bg-error-container text-on-error-container";
}

function openListing(property: PropertyListing) {
  window.open(property.listingUrl, "_blank", "noopener,noreferrer");
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("feed");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [items, setItems] = useState<PropertyListing[]>([]);
  const [catalog, setCatalog] = useState<PropertyListing[]>([]);
  const [availableCounties, setAvailableCounties] = useState<string[]>([]);
  const [availableTowns, setAvailableTowns] = useState<string[]>([]);
  const [townsByCounty, setTownsByCounty] = useState<Record<string, string[]>>({});
  const [availablePropertyTypes, setAvailablePropertyTypes] = useState<string[]>([]);
  const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>(() => readStored(SAVED_KEY, []));
  const [alertPropertyIds, setAlertPropertyIds] = useState<string[]>(() => readStored(ALERT_KEY, []));
  const [alertFeed, setAlertFeed] = useState<PriceAlert[]>(() => readStored(ALERT_FEED_KEY, []));
  const [priceSnapshots, setPriceSnapshots] = useState<Record<string, number>>(() =>
    readStored(SNAPSHOT_KEY, {})
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const buildParams = useCallback(
    (cursor?: string) =>
      new URLSearchParams({
        limit: String(PAGE_SIZE),
        ...(cursor ? { cursor } : {}),
        counties: filters.counties.join(","),
        town: filters.town,
        search: filters.search,
        maxPrice: String(filters.maxPrice),
        minReduction: String(filters.minReduction),
        minBeds: String(filters.minBeds),
        minBaths: String(filters.minBaths),
        propertyType: filters.propertyType,
        epc: filters.epc,
        features: filters.featureSelections.join(","),
        garden: String(filters.gardenOnly)
      }),
    [filters]
  );

  const resetAndLoad = useCallback(async () => {
    setIsLoading(true);
    const response = await fetch(`/api/properties?${buildParams().toString()}`);
    const data = (await response.json()) as PropertyResponse;

    setItems(data.items);
    setAvailableCounties(data.availableCounties);
    setAvailableTowns(data.availableTowns);
    setTownsByCounty(data.townsByCounty);
    setAvailablePropertyTypes(data.availablePropertyTypes);
    setAvailableFeatures(data.availableFeatures);
    setNextCursor(data.nextCursor);
    setHasLoaded(true);
    setIsLoading(false);
  }, [buildParams]);

  const loadCatalog = useCallback(async () => {
    const params = new URLSearchParams({
      limit: "300",
      maxPrice: "5000000",
      minReduction: "0",
      minBeds: "0",
      minBaths: "0",
      garden: "false"
    });

    const response = await fetch(`/api/properties?${params.toString()}`);
    const data = (await response.json()) as PropertyResponse;
    setCatalog(data.items);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading || activeTab !== "feed") return;

    setIsLoading(true);
    const response = await fetch(`/api/properties?${buildParams(nextCursor).toString()}`);
    const data = (await response.json()) as PropertyResponse;

    setItems((current) => [...current, ...data.items]);
    setNextCursor(data.nextCursor);
    setIsLoading(false);
  }, [activeTab, buildParams, isLoading, nextCursor]);

  useEffect(() => {
    void resetAndLoad();
  }, [resetAndLoad]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || activeTab !== "feed") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "400px 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [activeTab, loadMore]);

  useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedIds));
  }, [savedIds]);

  useEffect(() => {
    localStorage.setItem(ALERT_KEY, JSON.stringify(alertPropertyIds));
  }, [alertPropertyIds]);

  useEffect(() => {
    localStorage.setItem(ALERT_FEED_KEY, JSON.stringify(alertFeed));
  }, [alertFeed]);

  useEffect(() => {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(priceSnapshots));
  }, [priceSnapshots]);

  useEffect(() => {
    if (!catalog.length) return;

    const nextSnapshots = { ...priceSnapshots };
    const newAlerts: PriceAlert[] = [];
    let changed = false;

    for (const propertyId of alertPropertyIds) {
      const property = catalog.find((entry) => entry.id === propertyId);
      if (!property) continue;

      const previous = nextSnapshots[propertyId];
      if (previous === undefined) {
        nextSnapshots[propertyId] = property.price;
        changed = true;
        continue;
      }

      if (previous !== property.price) {
        newAlerts.unshift({
          id: `${property.id}-${property.price}-${Date.now()}`,
          propertyId: property.id,
          previousPrice: previous,
          newPrice: property.price,
          createdAt: new Date().toISOString(),
          read: false
        });
        nextSnapshots[propertyId] = property.price;
        changed = true;
      }
    }

    if (changed) setPriceSnapshots(nextSnapshots);
    if (newAlerts.length) setAlertFeed((current) => [...newAlerts, ...current]);
  }, [alertPropertyIds, catalog, priceSnapshots]);

  const filteredTowns = useMemo(() => {
    if (!filters.counties.length) return availableTowns;
    return [...new Set(filters.counties.flatMap((county) => townsByCounty[county] ?? []))];
  }, [availableTowns, filters.counties, townsByCounty]);

  const savedProperties = useMemo(
    () => savedIds.map((id) => catalog.find((property) => property.id === id)).filter(Boolean) as PropertyListing[],
    [catalog, savedIds]
  );

  const unreadAlerts = useMemo(() => alertFeed.filter((alert) => !alert.read), [alertFeed]);
  const mapProperties = activeTab === "saved" ? savedProperties : items;

  const toggleFeature = useCallback((feature: string) => {
    setFilters((current) => ({
      ...current,
      featureSelections: current.featureSelections.includes(feature)
        ? current.featureSelections.filter((entry) => entry !== feature)
        : [...current.featureSelections, feature]
    }));
  }, []);

  const toggleCounty = useCallback((county: string) => {
    setFilters((current) => ({
      ...current,
      counties: current.counties.includes(county)
        ? current.counties.filter((entry) => entry !== county)
        : [...current.counties, county],
      town: ""
    }));
  }, []);

  const toggleSaved = useCallback((propertyId: string) => {
    setSavedIds((current) =>
      current.includes(propertyId)
        ? current.filter((entry) => entry !== propertyId)
        : [propertyId, ...current]
    );
  }, []);

  const toggleAlert = useCallback(
    (propertyId: string) => {
      setAlertPropertyIds((current) =>
        current.includes(propertyId)
          ? current.filter((entry) => entry !== propertyId)
          : [propertyId, ...current]
      );

      if (!savedIds.includes(propertyId)) {
        setSavedIds((current) => [propertyId, ...current]);
      }
    },
    [savedIds]
  );

  const markAlertsRead = useCallback(() => {
    setAlertFeed((current) => current.map((entry) => ({ ...entry, read: true })));
  }, []);

  const activeFilterCount =
    filters.counties.length +
    filters.featureSelections.length +
    Number(Boolean(filters.town)) +
    Number(Boolean(filters.propertyType)) +
    Number(Boolean(filters.epc)) +
    Number(filters.maxPrice < 750000) +
    Number(filters.minBeds > 3) +
    Number(filters.minBaths > 1) +
    Number(filters.minReduction > 5000);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <header className="sticky top-0 z-50 border-b border-outline-variant/20 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary-container">home_work</span>
            <div>
              <p className="font-label text-[11px] uppercase tracking-[0.28em] text-outline">
                UK Deal Stream
              </p>
              <h1 className="font-headline text-xl font-extrabold tracking-tight text-primary-container">
                The Editorial Estate
              </h1>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <TopNavButton active={activeTab === "feed"} label="Feed" onClick={() => setActiveTab("feed")} />
            <TopNavButton active={activeTab === "saved"} label={`Saved ${savedIds.length ? `(${savedIds.length})` : ""}`} onClick={() => setActiveTab("saved")} />
            <TopNavButton active={activeTab === "map"} label="Map" onClick={() => setActiveTab("map")} />
            <TopNavButton active={activeTab === "settings"} label="Settings" onClick={() => setActiveTab("settings")} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6">
        <section className="sticky top-[73px] z-40 -mx-4 border-b border-outline-variant/10 bg-background/85 px-4 py-4 backdrop-blur-xl sm:mx-0 sm:rounded-b-xl sm:px-0">
          <div className="md:hidden">
            <label className="relative block">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
                search
              </span>
              <input
                className="h-14 w-full rounded-full border-none bg-surface-container-lowest pl-12 pr-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
                placeholder="Search town, postcode, phrase..."
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({ ...current, search: event.target.value }))
                }
              />
            </label>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              <button
                className="inline-flex items-center gap-2 rounded-full bg-primary-container px-4 py-3 font-label text-sm font-semibold text-white"
                onClick={() => setShowMobileFilters(true)}
                type="button"
              >
                <span className="material-symbols-outlined text-base">tune</span>
                Filters
                <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{activeFilterCount}</span>
              </button>
              {filters.counties.slice(0, 2).map((county) => (
                <FilterPill key={county} text={county} />
              ))}
              {filters.counties.length > 2 && <FilterPill text={`+${filters.counties.length - 2} counties`} />}
              <FilterPill text={`Up to ${currency(filters.maxPrice)}`} />
            </div>
          </div>

          <div className="hidden md:block">
            <FilterControls
              availableCounties={availableCounties}
              availableFeatures={availableFeatures}
              availablePropertyTypes={availablePropertyTypes}
              filteredTowns={filteredTowns}
              filters={filters}
              setFilters={setFilters}
              toggleCounty={toggleCounty}
              toggleFeature={toggleFeature}
            />
          </div>
        </section>

        {showMobileFilters && (
          <div className="fixed inset-0 z-[60] bg-black/35 md:hidden" onClick={() => setShowMobileFilters(false)}>
            <div
              className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-[1.5rem] bg-background p-4 shadow-editorial"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-outline-variant/70" />
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="font-label text-[11px] uppercase tracking-[0.24em] text-outline">Refine</p>
                  <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary-container">
                    Mobile filters
                  </h2>
                </div>
                <button
                  className="rounded-full bg-surface-container-high px-4 py-2 font-label text-sm font-semibold text-on-surface"
                  onClick={() => setShowMobileFilters(false)}
                  type="button"
                >
                  Done
                </button>
              </div>
              <FilterControls
                availableCounties={availableCounties}
                availableFeatures={availableFeatures}
                availablePropertyTypes={availablePropertyTypes}
                filteredTowns={filteredTowns}
                filters={filters}
                setFilters={setFilters}
                toggleCounty={toggleCounty}
                toggleFeature={toggleFeature}
              />
            </div>
          </div>
        )}

        {activeTab === "feed" && (
          <section className="mt-6 grid gap-5">
            {!hasLoaded && (
              <div className="rounded-xl bg-surface-container-low p-6 shadow-soft">
                <p className="font-label text-sm text-on-surface-variant">
                  Loading the first page of 3-bed garden deals...
                </p>
              </div>
            )}

            {items.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSaved={savedIds.includes(property.id)}
                alertsEnabled={alertPropertyIds.includes(property.id)}
                onToggleAlert={toggleAlert}
                onToggleSaved={toggleSaved}
              />
            ))}

            {hasLoaded && items.length === 0 && <EmptyState title="No matches yet" body="Try widening the counties, max price, or features." />}
            <div ref={sentinelRef} />
            {isLoading && hasLoaded && (
              <div className="rounded-xl bg-surface-container-low p-4 text-center shadow-soft">
                <p className="font-label text-sm text-on-surface-variant">
                  Pulling in more deals for the stream...
                </p>
              </div>
            )}
          </section>
        )}

        {activeTab === "saved" && (
          <section className="mt-6 grid gap-5">
            <div className="rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-soft">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-label text-[11px] uppercase tracking-[0.24em] text-outline">Saved intelligence</p>
                  <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary-container">
                    {savedProperties.length} saved properties
                  </h2>
                </div>
                <button
                  className="rounded-full bg-surface-container-high px-4 py-2 font-label text-sm font-semibold text-on-surface"
                  onClick={markAlertsRead}
                  type="button"
                >
                  Mark alerts read
                </button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <InsightCard label="Saved" value={String(savedProperties.length)} detail="Your shortlist across the UK feed" />
                <InsightCard label="Unread alerts" value={String(unreadAlerts.length)} detail="Triggered when a tracked saved listing changes price" />
              </div>
            </div>

            {alertFeed.length > 0 && (
              <div className="rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-lowest p-5 shadow-soft">
                <p className="font-label text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                  Price Alerts
                </p>
                <div className="mt-4 grid gap-3">
                  {alertFeed.slice(0, 8).map((alert) => {
                    const property = catalog.find((entry) => entry.id === alert.propertyId);
                    if (!property) return null;

                    return (
                      <div
                        key={alert.id}
                        className={`rounded-xl px-4 py-4 ${alert.read ? "bg-surface-container-low" : "bg-secondary-container/45"}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-headline text-lg font-bold tracking-tight text-primary">
                              {property.title}
                            </p>
                            <p className="font-label text-sm text-on-surface-variant">
                              {currency(alert.previousPrice)} to {currency(alert.newPrice)}
                            </p>
                          </div>
                          <button
                            className="rounded-full bg-surface-container-lowest px-4 py-2 font-label text-sm font-semibold text-primary"
                            onClick={() => openListing(property)}
                            type="button"
                          >
                            {property.isLiveListing ? "Open listing" : "Open market search"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {savedProperties.length === 0 && <EmptyState title="Nothing saved yet" body="Tap the heart on any listing to build your shortlist." />}

            {savedProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                isSaved
                alertsEnabled={alertPropertyIds.includes(property.id)}
                onToggleAlert={toggleAlert}
                onToggleSaved={toggleSaved}
              />
            ))}
          </section>
        )}

        {activeTab === "map" && (
          <section className="mt-6 grid gap-5">
            <MapPanel
              onOpenListing={(property) => openListing(property)}
              properties={mapProperties}
            />
            {mapProperties.length === 0 && (
              <EmptyState title="No properties to map" body="Try the Feed tab, or save a few homes first." />
            )}
          </section>
        )}

        {activeTab === "settings" && (
          <section className="mt-6 grid gap-5">
            <div className="rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-lowest p-6 shadow-soft">
              <p className="font-label text-[11px] uppercase tracking-[0.24em] text-outline">Settings</p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-primary-container">
                Tracking preferences
              </h2>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <InsightCard label="Saved homes" value={String(savedIds.length)} detail="Properties in your shortlist" />
                <InsightCard label="Alert subscriptions" value={String(alertPropertyIds.length)} detail="Saved properties with price alerts enabled" />
                <InsightCard label="Alert feed" value={String(alertFeed.length)} detail="Historic price-change events stored locally" />
              </div>
              <div className="mt-5 rounded-xl bg-surface-container-low p-4">
                <p className="font-label text-sm text-on-surface-variant">
                  Alerts are stored locally in this browser. When a saved tracked property&apos;s price changes in the feed, it appears in your Saved tab alert feed.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-outline-variant/10 bg-background/80 px-4 pb-6 pt-3 backdrop-blur-xl md:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          <BottomTab active={activeTab === "feed"} icon="explore" label="Feed" onClick={() => setActiveTab("feed")} />
          <BottomTab active={activeTab === "saved"} badge={savedIds.length} icon="favorite" label="Saved" onClick={() => setActiveTab("saved")} />
          <BottomTab active={activeTab === "map"} icon="map" label="Map" onClick={() => setActiveTab("map")} />
          <BottomTab active={activeTab === "saved"} badge={unreadAlerts.length} icon="notifications" label="Alerts" onClick={() => setActiveTab("saved")} />
        </div>
      </nav>

      {activeTab !== "map" && (
        <div className="fixed bottom-24 right-6 z-50 md:hidden">
          <button
            className="flex items-center gap-2 rounded-full bg-primary-container px-5 py-4 font-label text-sm font-bold text-white shadow-editorial"
            onClick={() => setActiveTab("map")}
            type="button"
          >
            <span className="material-symbols-outlined text-base">map</span>
            Map
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyCard({
  property,
  isSaved,
  alertsEnabled,
  onToggleAlert,
  onToggleSaved
}: {
  property: PropertyListing;
  isSaved: boolean;
  alertsEnabled: boolean;
  onToggleAlert: (propertyId: string) => void;
  onToggleSaved: (propertyId: string) => void;
}) {
  const propBarWidth = `${Math.max(12, Math.min(100, property.reductionPercent * 3.3))}%`;

  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
      <div className="relative aspect-[16/11] overflow-hidden md:aspect-[21/9]">
        <button className="block h-full w-full" onClick={() => openListing(property)} type="button">
          <img
            alt={property.title}
            className="h-full w-full object-cover transition duration-700 hover:scale-[1.03]"
            src={property.image}
          />
        </button>

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4">
          <span className="rounded-full bg-surface-container-lowest/90 px-3 py-1 font-label text-[11px] font-bold uppercase tracking-[0.22em] text-primary shadow-soft">
            {property.source}
          </span>

          <div className="flex items-center gap-2">
            <button
              className={`rounded-full p-2 shadow-soft ${isSaved ? "bg-[#8f1336] text-white" : "bg-surface-container-lowest/90 text-primary"}`}
              onClick={() => onToggleSaved(property.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-base">{isSaved ? "favorite" : "favorite_border"}</span>
            </button>
            <button
              className={`rounded-full p-2 shadow-soft ${alertsEnabled ? "bg-primary-container text-white" : "bg-surface-container-lowest/90 text-primary"}`}
              onClick={() => onToggleAlert(property.id)}
              type="button"
            >
              <span className="material-symbols-outlined text-base">{alertsEnabled ? "notifications_active" : "notifications"}</span>
            </button>
            <span className={`rounded-full px-3 py-1 font-label text-[11px] font-bold uppercase tracking-[0.22em] ${scoreTone(property.dealScore)}`}>
              Deal score {property.dealScore}
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 text-white">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <p className="font-headline text-3xl font-extrabold tracking-tight">{currency(property.price)}</p>
              <p className="font-label text-sm text-white/85">
                {property.town}, {property.county} · {property.postcode}
              </p>
            </div>
            <div className="rounded-full bg-white/12 px-3 py-1 font-label text-xs font-semibold backdrop-blur">
              {property.listedDaysAgo}d live
            </div>
          </div>

          <div className="rounded-xl bg-white/12 p-3 backdrop-blur-sm">
            <div className="mb-2 flex items-center justify-between font-label text-xs uppercase tracking-[0.18em] text-white/82">
              <span>PropBar</span>
              <span>Down {currency(property.reducedBy)} from {currency(property.originalPrice)}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20">
              <div className="h-2 rounded-full bg-[#ffb68d]" style={{ width: propBarWidth }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="flex flex-wrap items-center gap-5 border-b border-outline-variant/15 pb-4">
            <Metric label="Beds" value={String(property.beds)} />
            <Metric label="Baths" value={String(property.baths)} />
            <Metric label="Area" value={`${property.areaSqFt.toLocaleString()} sqft`} />
            <Metric label="Garden" value={property.garden ? "Yes" : "No"} />
          </div>
          <div className="mt-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary">
                {property.title}
              </h2>
              <p className="mt-2 max-w-2xl font-label text-sm leading-6 text-on-surface-variant">
                {property.summary}
              </p>
            </div>
            <button
              className="hidden rounded-full bg-primary-container px-4 py-3 font-label text-sm font-semibold text-white sm:inline-flex"
              onClick={() => openListing(property)}
              type="button"
            >
              {property.isLiveListing ? "Open listing" : "Open market search"}
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InsightCard label="School rank" value={property.schoolBand} detail={property.schoolSummary} />
            <InsightCard label="Crime" value={property.crimeBand} detail={`${property.crimeRate} incidents per 1,000 residents`} />
            <InsightCard
              label="Valuation"
              value={currency(property.estimatedValue)}
              detail={`${property.valueConfidence} confidence · ${valuationDelta(property) >= 0 ? "£" : "-£"}${Math.abs(valuationDelta(property)).toLocaleString()} vs ask`}
            />
            <InsightCard label="Station" value={`${property.trainMins} mins`} detail="Typical rail drive time" />
            <InsightCard label="EPC" value={property.epc} detail={`${property.propertyType} · ${property.lotLabel}`} />
            <InsightCard label="Flood risk" value={property.floodRisk} detail={property.planningPressure} />
            <InsightCard label="Broadband" value={property.broadband} detail={property.marketMomentum} />
            <InsightCard
              label="Listing"
              value={property.source}
              detail={property.isLiveListing ? "Tap image to open the original listing" : "Tap image to open a live market search matching this card"}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {property.features.map((feature) => (
              <span
                key={feature}
                className="rounded-full bg-surface-container-high px-3 py-1.5 font-label text-xs font-semibold text-on-surface-variant"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>

        <aside className="rounded-xl bg-surface-container p-4">
          <p className="font-label text-[11px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
            Why it ranks well
          </p>
          <ul className="mt-4 space-y-3">
            {[
              `${property.reductionPercent}% cut against original ask`,
              `${property.schoolBand} school band with ${property.crimeBand.toLowerCase()} crime`,
              `${currency(property.estimatedValue)} indicative fair value`,
              `${property.trainMins} mins to the nearest station`,
              `${property.areaSqFt.toLocaleString()} sqft with ${property.lotLabel.toLowerCase()}`,
              property.saleComparable
            ].map((point) => (
              <li key={point} className="rounded-xl bg-surface-container-lowest px-4 py-3 font-label text-sm text-on-surface-variant">
                {point}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </article>
  );
}

function MapPanel({
  properties,
  onOpenListing
}: {
  properties: PropertyListing[];
  onOpenListing: (property: PropertyListing) => void;
}) {
  const bounds = useMemo(() => {
    if (!properties.length) return null;
    const lats = properties.map((property) => property.latitude);
    const lngs = properties.map((property) => property.longitude);
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs)
    };
  }, [properties]);

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-outline-variant/10 bg-surface-container-lowest shadow-editorial">
      <div className="border-b border-outline-variant/10 p-5">
        <p className="font-label text-[11px] uppercase tracking-[0.24em] text-outline">Map view</p>
        <h2 className="font-headline text-2xl font-extrabold tracking-tight text-primary-container">
          Geographic spread of your current results
        </h2>
      </div>

      <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_top,#dce9f7,transparent_40%),linear-gradient(180deg,#f8f9fa_0%,#e8eef3_100%)]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(116,119,125,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(116,119,125,0.10)_1px,transparent_1px)] bg-[size:64px_64px]" />
          {properties.map((property) => {
            const left = bounds
              ? `${10 + ((property.longitude - bounds.minLng) / Math.max(bounds.maxLng - bounds.minLng, 0.01)) * 80}%`
              : "50%";
            const top = bounds
              ? `${12 + (1 - (property.latitude - bounds.minLat) / Math.max(bounds.maxLat - bounds.minLat, 0.01)) * 72}%`
              : "50%";

            return (
              <button
                key={property.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                onClick={() => onOpenListing(property)}
                style={{ left, top }}
                type="button"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-primary-container text-white shadow-editorial">
                  <span className="material-symbols-outlined text-base">home_pin</span>
                </span>
                <span className="mt-2 block rounded-full bg-white/90 px-3 py-1 font-label text-xs font-semibold text-primary shadow-soft">
                  {property.town}
                </span>
              </button>
            );
          })}
        </div>

        <div className="p-5">
          <div className="grid gap-3">
            {properties.map((property) => (
              <button
                key={property.id}
                className="rounded-xl bg-surface-container-low px-4 py-4 text-left"
                onClick={() => onOpenListing(property)}
                type="button"
              >
                <p className="font-headline text-lg font-bold tracking-tight text-primary">{property.title}</p>
                <p className="mt-1 font-label text-sm text-on-surface-variant">
                  {property.town}, {property.county}
                </p>
                <p className="mt-2 font-label text-sm font-semibold text-primary-container">
                  {currency(property.price)}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[1.25rem] bg-surface-container-low p-10 text-center shadow-soft">
      <p className="font-headline text-2xl font-bold tracking-tight text-primary-container">{title}</p>
      <p className="mt-2 font-label text-sm text-on-surface-variant">{body}</p>
    </div>
  );
}

function TopNavButton({
  active,
  label,
  onClick
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full px-4 py-2 font-label text-sm ${active ? "bg-primary-container text-white" : "text-on-surface-variant"}`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[68px]">
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.22em] text-outline">{label}</p>
      <p className="mt-1 font-label text-base font-bold text-on-surface">{value}</p>
    </div>
  );
}

function FilterControls({
  availableCounties,
  availableFeatures,
  availablePropertyTypes,
  filteredTowns,
  filters,
  setFilters,
  toggleCounty,
  toggleFeature
}: {
  availableCounties: string[];
  availableFeatures: string[];
  availablePropertyTypes: string[];
  filteredTowns: string[];
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  toggleCounty: (county: string) => void;
  toggleFeature: (feature: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="relative block xl:col-span-2">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            search
          </span>
          <input
            className="h-14 w-full rounded-full border-none bg-surface-container-lowest pl-12 pr-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
            placeholder="Search by town, postcode, or phrase..."
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
          />
        </label>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.town}
          onChange={(event) =>
            setFilters((current) => ({ ...current, town: event.target.value }))
          }
        >
          <option value="">All towns</option>
          {filteredTowns.map((town) => (
            <option key={town} value={town}>
              {town}
            </option>
          ))}
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.maxPrice}
          onChange={(event) =>
            setFilters((current) => ({ ...current, maxPrice: Number(event.target.value) }))
          }
        >
          <option value={250000}>Up to £250k</option>
          <option value={350000}>Up to £350k</option>
          <option value={500000}>Up to £500k</option>
          <option value={750000}>Up to £750k</option>
          <option value={1000000}>Up to £1m</option>
          <option value={2000000}>Up to £2m</option>
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.minReduction}
          onChange={(event) =>
            setFilters((current) => ({ ...current, minReduction: Number(event.target.value) }))
          }
        >
          <option value={5000}>Reduced by £5k+</option>
          <option value={10000}>Reduced by £10k+</option>
          <option value={25000}>Reduced by £25k+</option>
          <option value={50000}>Reduced by £50k+</option>
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.minBeds}
          onChange={(event) =>
            setFilters((current) => ({ ...current, minBeds: Number(event.target.value) }))
          }
        >
          <option value={1}>1+ beds</option>
          <option value={2}>2+ beds</option>
          <option value={3}>3+ beds</option>
          <option value={4}>4+ beds</option>
          <option value={5}>5+ beds</option>
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.minBaths}
          onChange={(event) =>
            setFilters((current) => ({ ...current, minBaths: Number(event.target.value) }))
          }
        >
          <option value={0}>Any baths</option>
          <option value={1}>1+ baths</option>
          <option value={2}>2+ baths</option>
          <option value={3}>3+ baths</option>
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.propertyType}
          onChange={(event) =>
            setFilters((current) => ({ ...current, propertyType: event.target.value }))
          }
        >
          <option value="">All property types</option>
          {availablePropertyTypes.map((entry) => (
            <option key={entry} value={entry}>
              {entry}
            </option>
          ))}
        </select>

        <select
          className="h-14 rounded-full border-none bg-surface-container-lowest px-5 font-label text-sm shadow-soft outline-none ring-2 ring-transparent transition focus:ring-primary-container/15"
          value={filters.epc}
          onChange={(event) =>
            setFilters((current) => ({ ...current, epc: event.target.value }))
          }
        >
          <option value="">Any EPC</option>
          <option value="A">EPC A</option>
          <option value="B">EPC B</option>
          <option value="C">EPC C</option>
          <option value="D">EPC D</option>
        </select>
      </div>

      <div className="rounded-[1rem] bg-surface-container-low p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-label text-[11px] uppercase tracking-[0.22em] text-outline">Counties</p>
            <p className="font-label text-sm text-on-surface-variant">
              Select as many counties as you want
            </p>
          </div>
          <button
            className="rounded-full bg-surface-container-lowest px-4 py-2 font-label text-xs font-semibold text-primary"
            onClick={() => setFilters((current) => ({ ...current, counties: [], town: "" }))}
            type="button"
          >
            Clear counties
          </button>
        </div>
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-xl bg-surface-container-lowest p-3 sm:grid-cols-2 xl:grid-cols-3">
          {availableCounties.map((county) => {
            const active = filters.counties.includes(county);
            return (
              <button
                key={county}
                className={`rounded-xl px-3 py-2 text-left font-label text-sm ${
                  active ? "bg-secondary-container text-on-secondary-container" : "bg-surface-container-low text-on-surface-variant"
                }`}
                onClick={() => toggleCounty(county)}
                type="button"
              >
                {county}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-full px-4 py-2 font-label text-xs font-semibold ${
            filters.gardenOnly
              ? "bg-secondary-container text-on-secondary-container"
              : "bg-surface-container-highest text-on-surface-variant"
          }`}
          onClick={() => setFilters((current) => ({ ...current, gardenOnly: !current.gardenOnly }))}
          type="button"
        >
          Garden required
        </button>
        {availableFeatures.map((feature) => (
          <button
            key={feature}
            className={`rounded-full px-4 py-2 font-label text-xs font-semibold ${
              filters.featureSelections.includes(feature)
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container-highest text-on-surface-variant"
            }`}
            onClick={() => toggleFeature(feature)}
            type="button"
          >
            {feature}
          </button>
        ))}
      </div>
    </div>
  );
}

function FilterPill({ text }: { text: string }) {
  return (
    <span className="whitespace-nowrap rounded-full bg-surface-container-high px-3 py-2 font-label text-xs font-semibold text-on-surface-variant">
      {text}
    </span>
  );
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl bg-surface-container-low px-4 py-4">
      <p className="font-label text-[10px] font-bold uppercase tracking-[0.22em] text-outline">{label}</p>
      <p className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-primary">{value}</p>
      <p className="mt-1 font-label text-sm text-on-surface-variant">{detail}</p>
    </div>
  );
}

function BottomTab({
  active,
  badge = 0,
  icon,
  label,
  onClick
}: {
  active: boolean;
  badge?: number;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`relative flex flex-col items-center justify-center ${active ? "text-primary-container" : "text-outline"}`}
      onClick={onClick}
      type="button"
    >
      <span className="material-symbols-outlined">{icon}</span>
      {badge > 0 && (
        <span className="absolute -right-2 top-0 rounded-full bg-[#8f1336] px-1.5 py-0.5 font-label text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
      <span className="font-label text-xs font-medium">{label}</span>
    </button>
  );
}

export default App;
