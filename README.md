# Operation Fog City

Matt & Val's San Francisco trip, Nov 14–20, 2026, on a 3D globe.

Live: https://vosbek.github.io/Trip-view/

- `site/` is the deployed static site (CesiumJS 1.138, the trip page, the schematic city pack, photos).
- `src/` holds the sources the page was assembled from.
- `scripts/fetch_photos.py` pulls the location photos from Wikimedia Commons during the Pages build.
- `scripts/fetch_routes.py` gets real walking and driving routes between stops (OSRM on OpenStreetMap data).
- `scripts/fetch_weather.py` pulls the National Weather Service forecast; the workflow runs daily to refresh it.
- `scripts/verify.cjs` screenshots the live site after each deploy into the `ci-shots` branch.

On GitHub Pages the map opens on Esri World Imagery with Re:Earth terrain; switch back to the
drawn map under Map layers. Inside the claude.ai link it stays on the drawn map.

## Credits

- [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu (MIT): globe setup,
  sensor shaders (FLIR, NVG, CRT, noir, storybook), split-flap board, sky, SF neighborhood outlines.
- [CesiumJS](https://cesium.com/platform/cesiumjs/) (Apache-2.0).
- City geometry: © OpenStreetMap contributors (ODbL) via [sf-train-set](https://github.com/hausfath/sf-train-set) (MIT); SRTM elevation; US Census county outlines; DataSF neighborhoods (PDDL).
- Photos: Wikimedia Commons; each photo's author and license is credited on the image and linked to its Commons page.
