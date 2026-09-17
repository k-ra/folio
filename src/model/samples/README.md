# Whale research sample

`right-whale-abundance.csv` is the unchanged 35-row source CSV published in NOAA's `NOAA-EDAB/ecodata` repository, downloaded 2026-09-15 from [this pinned revision](https://raw.githubusercontent.com/NOAA-EDAB/ecodata/3d313767de4f34de4353af64c3e1706dc94d164b/data-raw/Linden_NARW_abundance_2025-10-01%20-%20Daniel%20Linden%20-%20NOAA%20Federal.csv).

The associated [Linden (2025) NOAA report](https://repository.library.noaa.gov/view/noaa/72014) is CC0 / public domain. These are modeled North Atlantic right-whale abundance estimates at the start of each year, 1990–2024, not raw sightings or an estimate for all whale species.

The chart selects `Year` and `Median`. The original row IDs, `Lower95`, `Upper95`, `Mean`, and `SD` remain in the attachment and downloadable file. The final row is 2024: median 384, 95% credible interval 375–394. All 35 rows and lower/median/upper consistency were independently checked through Artifact Tool CSV import; unit/browser tests verify the rendered series and original-file download.

`whales.ts` is an original illustrative essay, not a research publication. It separately discusses Project CETI's sperm-whale work and a 2022 global sperm-whale estimate, with primary sources in its collapsed Source notes. It does not imply that the right-whale CSV describes sperm whales, that the numbers are exact counts, or that whale communication has been translated.
