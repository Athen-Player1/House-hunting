# Data Integration Research

## Sprift and Hometrack

### Sprift

- Sprift appears to be a commercial property data platform rather than an open-source dataset or SDK.
- Its public site describes API access and aggregated data from official sources, but not a free open-data feed.
- Practical takeaway: treat Sprift as a paid vendor integration, not an open-source dependency.

Source:
- https://sprift.com/home

### Hometrack

- Hometrack is also a commercial AVM and property intelligence product.
- Public information points to partner and product access rather than an open public dataset.
- Practical takeaway: we can model Hometrack-like outputs in our schema, but direct integration likely needs commercial access.

Source:
- https://hometrack.com/

## Best Open-Data Equivalents

### HM Land Registry

- Price Paid Data for sold-price comparables
- UK House Price Index for local trend direction

Why it matters:
- Gives us the most credible open sold-price baseline for "is this a deal?"

Sources:
- https://www.gov.uk/guidance/about-the-price-paid-data
- https://landregistry.data.gov.uk/

### EPC Register

- EPC ratings and energy details for running-cost context

Why it matters:
- Strong buyer signal, especially for older 3-bed stock

Source:
- https://www.gov.uk/find-energy-certificate

### Police Data

- Street-level crime categories and outcomes

Why it matters:
- Lets us move from generic "good area" language to measurable local safety signals

Source:
- https://data.police.uk/docs/

### Get Information About Schools

- School metadata and establishment details

Why it matters:
- Supports school quality overlays and catchment-oriented ranking inputs

Sources:
- https://www.gov.uk/guidance/get-information-about-schools
- https://get-information-schools.service.gov.uk/

### Environment Agency

- Flood risk and related environmental context

Why it matters:
- Flood risk is one of the fastest ways to eliminate a "cheap for a reason" listing

Sources:
- https://www.gov.uk/check-long-term-flood-risk
- https://environment.data.gov.uk/

### Ofcom / broadband checkers

- Broadband availability and speed context

Why it matters:
- Remote-work suitability is a strong ranking factor for family homes

Sources:
- https://www.ofcom.org.uk/phones-and-broadband/coverage-and-speeds/ofcom-checker
- https://connectednations.ofcom.org.uk/

### Planning data

- Planning applications near the property

Why it matters:
- Helps flag nearby development pressure, extensions, towers, road schemes, or site changes

Sources:
- https://www.planning.data.gov.uk/
- https://www.gov.uk/guidance/open-digital-planning

## High-Value Next Integrations

1. Land Registry sold comparables and local trend summary.
2. Police crime lookup by nearby coordinates.
3. EPC lookup and richer energy breakdown.
4. Environment Agency flood-risk badge.
5. Planning application count and nearby major-development flag.
6. Broadband availability and max-speed tier.
7. ONS demographics and deprivation data for broader area context.

## Product Ideas Worth Adding

1. Deal thesis summary explaining exactly why a property ranks highly.
2. "Cheap for a reason" warnings when flood, crime, EPC, or planning signals are weak.
3. Commute scoring using station proximity plus journey-time APIs.
4. Rental yield estimate using local asking-rent comparables.
5. Saleability score using school, crime, EPC, and time-on-market.
6. Renovation upside score using EPC, extension/planning history, and plot size.
