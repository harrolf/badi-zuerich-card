# 🌊 Badi Zürich Card

A Lovelace custom card for Home Assistant that shows **live water temperatures and open/closed status** for all Zürich outdoor pools (Sommerbäder), sourced directly from the official [Stadt Zürich open data API](https://data.stadt-zuerich.ch/dataset/wassertemperaturen-freibaeder).

## Features

- Live water temperatures for all 19 Zürich Sommerbäder
- Open / closed status with colour-coded indicator dot
- Temperature colour scale: ice blue → teal → green → amber → orange
- Filter by type: Freibad, Flussbad, Seebad, Strandbad
- Sorted warmest-first within each group
- Auto-refreshes every 10 minutes
- Adapts to your HA card background theme

## Installation via HACS

1. In HACS, go to **Frontend → Custom repositories**
2. Add `https://github.com/harrolf/badi-zuerich-card` as type **Dashboard**
3. Install **Badi Zürich Card**
4. Reload your browser

## Manual installation

1. Copy `badi-zuerich-card.js` to `/config/www/badi-zuerich-card.js`
2. Add to **Settings → Dashboards → Resources**:
   - URL: `/local/badi-zuerich-card.js`
   - Type: **JavaScript module**
3. Reload your browser

## HA sensor (recommended — solves CORS)

The card tries to read from a HA `command_line` sensor first (HA fetches the XML server-side, no browser CORS issue). Add this to `configuration.yaml`:

```yaml
command_line:
  - sensor:
      name: badi_zuerich
      unique_id: badi_zuerich
      command: >
        python3 -c "
        import urllib.request, xml.etree.ElementTree as ET, json
        req = urllib.request.Request(
          'https://www.stadt-zuerich.ch/stzh/bathdatadownload',
          headers={'User-Agent':'Mozilla/5.0'})
        root = ET.parse(urllib.request.urlopen(req, timeout=10)).getroot()
        baths = []
        for b in root.findall('.//bath'):
            if (b.findtext('poiid') or '').startswith('hb'): continue
            baths.append({
              'title':  b.findtext('title') or '',
              'temp':   (b.findtext('temperatureWater') or '').strip(),
              'status': (b.findtext('openClosedTextPlain') or '').strip(),
              'date':   (b.findtext('dateModified') or '').strip(),
              'url':    b.findtext('urlPage') or '#'
            })
        print(json.dumps({'baths_json': baths}))
        "
      value_template: "OK"
      json_attributes:
        - baths_json
      scan_interval: 600
```

Then restart HA.

## Lovelace card config

```yaml
type: custom:badi-zuerich-card
entity: sensor.badi_zuerich
```

The `entity` field is optional — it defaults to `sensor.badi_zuerich`.

## Data source

[Stadt Zürich — Wassertemperaturen Freibäder](https://data.stadt-zuerich.ch/dataset/wassertemperaturen-freibaeder) · Updated by lifeguards throughout the day · Only available during the swimming season (roughly May–September)
