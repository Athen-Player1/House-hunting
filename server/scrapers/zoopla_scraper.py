import json
import re
import sys
from typing import Any
from urllib.parse import urlencode

from curl_cffi import requests


def slugify(value: str) -> str:
    return (
        value.strip()
        .lower()
        .replace("&", " and ")
        .replace(",", " ")
        .replace("/", " ")
        .replace("'", "")
        .replace("  ", " ")
        .replace(" ", "-")
    )


def parse_args() -> dict[str, Any]:
    if len(sys.argv) < 2:
        return {}
    return json.loads(sys.argv[1])


def infer_town(address_parts: list[str], fallback: str) -> str:
    ignored = {"england", "scotland", "wales", "northern ireland", "uk", "united kingdom"}
    cleaned = [
        part
        for part in address_parts
        if part
        and part.lower() not in ignored
        and not re.fullmatch(r"[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}", part, re.I)
    ]

    if len(cleaned) >= 2:
        if cleaned[-1].lower() == fallback.lower():
            return cleaned[-2]
        return cleaned[-1]
    if cleaned:
        return cleaned[-1]
    return fallback


def parse_ld_json(html: str) -> list[dict[str, Any]]:
    match = re.search(r'"children":"(.*?)","id":"lsrp-schema"', html, re.S)
    if match:
        decoded = json.loads(f'"{match.group(1)}"')
        payload = json.loads(decoded)
        for entry in payload.get("@graph", []):
            if entry.get("@type") == "SearchResultsPage":
                main_entity = entry.get("mainEntity", {})
                return main_entity.get("itemListElement", [])
    return []


def build_url(query: dict[str, Any]) -> str:
    location = query.get("town") or (query.get("counties") or ["england"])[0]
    location_slug = slugify(location)
    q_value = query.get("town") or f"{location}, England"
    params = {
        "beds_min": max(int(query.get("minBeds", 3)), 1),
        "price_max": int(query.get("maxPrice", 750000)),
        "results_sort": "newest_listings",
        "search_source": "for-sale",
        "q": q_value,
    }
    return f"https://www.zoopla.co.uk/for-sale/property/{location_slug}/?{urlencode(params)}"


def to_listing(item: dict[str, Any], query: dict[str, Any]) -> dict[str, Any] | None:
    product = item.get("item", {})
    url = product.get("url")
    price = int(float(product.get("offers", {}).get("price", 0) or 0))
    if not url or not price:
        return None

    name = product.get("name", "Property for sale")
    description = product.get("description", "")
    address = product.get("isRelatedTo", {}).get("address", "")
    image = product.get("image", "")
    related = product.get("isRelatedTo", {})
    geo = related.get("geo", {})

    beds_match = re.search(r"(\d+)\s*bed", name, re.I) or re.search(r"(\d+)\s*bed", description, re.I)
    beds = int(related.get("numberOfBedrooms") or (beds_match.group(1) if beds_match else max(int(query.get("minBeds", 3)), 3)))
    baths = int(related.get("numberOfBathroomsTotal") or max(int(query.get("minBaths", 1)), 1))

    property_type_match = re.search(
        r"(semi-detached|end terrace|terraced|terrace|detached|cottage|bungalow|maisonette|flat)",
        name,
        re.I,
    )
    property_type = property_type_match.group(1).title() if property_type_match else "House"
    county = (query.get("counties") or ["England"])[0]
    address_parts = [part.strip() for part in address.split(",") if part.strip()]
    postcode_match = re.search(r"\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b", address, re.I)
    town = query.get("town") or infer_town(address_parts, county)

    return {
        "id": f"zoopla-{url.rstrip('/').split('/')[-1]}",
        "source": "Zoopla",
        "title": name,
        "listingUrl": url,
        "isLiveListing": True,
        "county": county,
        "town": town,
        "postcode": postcode_match.group(0).upper() if postcode_match else "",
        "latitude": float(geo.get("latitude", 0) or 0),
        "longitude": float(geo.get("longitude", 0) or 0),
        "price": price,
        "originalPrice": price,
        "reducedBy": 0,
        "reductionPercent": 0,
        "beds": beds,
        "baths": baths,
        "areaSqFt": 0,
        "features": ["Garden"] if query.get("garden") else [],
        "lotLabel": "Live Zoopla listing",
        "garden": bool(query.get("garden", True)),
        "propertyType": property_type,
        "dealScore": 72,
        "schoolBand": "C",
        "schoolSummary": "Live listing imported from Zoopla; enrichment pending.",
        "crimeBand": "Moderate",
        "crimeRate": 0,
        "estimatedValue": price,
        "valueConfidence": "Indicative",
        "saleComparable": "Comparable and pricing enrichment pending.",
        "marketMomentum": "Live Zoopla result.",
        "floodRisk": "Moderate",
        "planningPressure": "Planning enrichment pending.",
        "broadband": "Broadband enrichment pending",
        "trainMins": 0,
        "epc": "",
        "image": image,
        "summary": description[:280],
        "listedDaysAgo": 0,
    }


def main() -> None:
    query = parse_args()
    url = build_url(query)
    response = requests.get(url, impersonate="chrome124", timeout=60)
    results = []
    if response.status_code == 200:
        for item in parse_ld_json(response.text):
            listing = to_listing(item, query)
            if listing:
                results.append(listing)
    print(json.dumps(results))


if __name__ == "__main__":
    main()
