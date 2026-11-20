"""Satellite Field Cadastral Map Generator.
Generates authentic satellite imagery map cards matching the exact design:
- Real satellite background (Google Satellite / Esri World Imagery)
- Vibrant neon green cadastral parcel boundary outline (#00e676) with translucent fill
- Central dark navy badge with gold/amber border: 'Gat No. {gat}'
- Floating top-left pill badge: '● Malegaon Kh • Gat Number {gat}   {acres} Acres'
- Bottom-right watermark: '© Google — Esri'
- Smooth rounded corners (rounded-2xl)
"""

import os
import json
import math
import io
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def deg2num(lat_deg, lon_deg, zoom):
    lat_rad = math.radians(lat_deg)
    n = 2.0 ** zoom
    xtile = (lon_deg + 180.0) / 360.0 * n
    ytile = (1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * n
    return (xtile, ytile)


def num2deg(xtile, ytile, zoom):
    n = 2.0 ** zoom
    lon_deg = xtile / n * 360.0 - 180.0
    lat_rad = math.atan(math.sinh(math.pi * (1 - 2 * ytile / n)))
    lat_deg = math.degrees(lat_rad)
    return (lat_deg, lon_deg)


def fetch_tile(x, y, z):
    # Try Google Satellite first, fallback to Esri World Imagery
    urls = [
        f"https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        f"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=4) as resp:
                return Image.open(io.BytesIO(resp.read())).convert("RGBA")
        except Exception:
            continue
    # Fallback dark field background if offline
    return Image.new("RGBA", (256, 256), (35, 52, 40, 255))


_GEOJSON_CACHE = None

def get_geojson_data():
    global _GEOJSON_CACHE
    if _GEOJSON_CACHE is not None:
        return _GEOJSON_CACHE

    base_dir = Path(__file__).resolve().parent.parent.parent.parent
    paths = [
        base_dir / "frontend" / "public" / "data" / "malegaon_plots.geojson",
        base_dir / "MALEGAON_SOIL_PREDICTION_PRODUCTION_PACKAGE" / "cadastre" / "Malegaon_Cadastral_Boundaries.geojson",
    ]
    for p in paths:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    _GEOJSON_CACHE = json.load(f)
                    return _GEOJSON_CACHE
            except Exception:
                pass
    return None


def get_font(size: int, bold: bool = False):
    font_paths = [
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibrib.ttf" if bold else "C:/Windows/Fonts/calibri.ttf",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return ImageFont.truetype(fp, size)
            except Exception:
                pass
    return ImageFont.load_default()


def generate_satellite_card(gat_str: str, out_path: str = None) -> str:
    """Generate high-resolution satellite map card for any Gat parcel matching My Farm view."""
    clean_gat = str(gat_str).replace("Gat", "").replace("gat", "").strip()
    clean_gat_num = "".join(filter(str.isdigit, clean_gat)) or "35"

    geojson = get_geojson_data()
    if not geojson or "features" not in geojson:
        return ""

    feat = None
    for f in geojson["features"]:
        gn = str(f["properties"].get("gat_no", "")).replace("Gat", "").replace("gat", "").strip()
        gn_num = "".join(filter(str.isdigit, gn))
        if gn_num == clean_gat_num or gn == clean_gat:
            feat = f
            break

    if not feat:
        feat = geojson["features"][0]
        clean_gat = str(feat["properties"].get("gat_no", "35")).replace("Gat", "").replace("gat", "").strip()

    geom = feat.get("geometry", {})
    if geom.get("type") == "Polygon":
        coords = geom["coordinates"][0]
    elif geom.get("type") == "MultiPolygon":
        coords = geom["coordinates"][0][0]
    else:
        coords = []

    if not coords or len(coords) < 3:
        return ""

    lons = [p[0] for p in coords]
    lats = [p[1] for p in coords]
    min_lon, max_lon = min(lons), max(lons)
    min_lat, max_lat = min(lats), max(lats)

    cx = (min_lon + max_lon) / 2
    cy = (min_lat + max_lat) / 2
    d_lon = max_lon - min_lon
    d_lat = max_lat - min_lat

    # Target 600x324 canvas aspect ratio (1.852)
    aspect = 600.0 / 324.0
    cos_lat = math.cos(math.radians(cy))

    # Zoom padding: parcel occupies ~45% - 50% of card height with surroundings visible
    target_view_h_lat = d_lat * 2.15
    target_view_w_lon = target_view_h_lat * aspect * cos_lat

    if d_lon > target_view_w_lon * 0.7:
        target_view_w_lon = d_lon * 2.15
        target_view_h_lat = target_view_w_lon / (aspect * cos_lat)

    view_min_lon = cx - target_view_w_lon / 2
    view_max_lon = cx + target_view_w_lon / 2
    view_min_lat = cy - target_view_h_lat / 2
    view_max_lat = cy + target_view_h_lat / 2

    # Determine optimal satellite tile zoom
    if target_view_w_lon > 0.08:
        zoom = 14
    elif target_view_w_lon > 0.032:
        zoom = 15
    else:
        zoom = 16

    min_tx_f, min_ty_f = deg2num(view_max_lat, view_min_lon, zoom)
    max_tx_f, max_ty_f = deg2num(view_min_lat, view_max_lon, zoom)

    min_tx = int(math.floor(min_tx_f))
    max_tx = int(math.floor(max_tx_f))
    min_ty = int(math.floor(min_ty_f))
    max_ty = int(math.floor(max_ty_f))

    num_tiles_x = max_tx - min_tx + 1
    num_tiles_y = max_ty - min_ty + 1
    canvas_w = num_tiles_x * 256
    canvas_h = num_tiles_y * 256
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (35, 52, 40, 255))

    for tx in range(min_tx, max_tx + 1):
        for ty in range(min_ty, max_ty + 1):
            tile_img = fetch_tile(tx, ty, zoom)
            pos_x = (tx - min_tx) * 256
            pos_y = (ty - min_ty) * 256
            canvas.paste(tile_img, (pos_x, pos_y))

    def geo_to_px(lon, lat):
        xf, yf = deg2num(lat, lon, zoom)
        px = (xf - min_tx) * 256.0
        py = (yf - min_ty) * 256.0
        return (px, py)

    c_px, c_py = geo_to_px(cx, cy)
    vx0, vy0 = geo_to_px(view_min_lon, view_max_lat)
    vx1, vy1 = geo_to_px(view_max_lon, view_min_lat)
    crop_w = int(vx1 - vx0)
    crop_h = int(vy1 - vy0)
    x0 = int(c_px - crop_w / 2)
    y0 = int(c_py - crop_h / 2)
    x1 = x0 + crop_w
    y1 = y0 + crop_h

    # Boundary safeguards
    if x0 < 0:
        x0, x1 = 0, crop_w
    if y0 < 0:
        y0, y1 = 0, crop_h
    if x1 > canvas_w:
        x0, x1 = canvas_w - crop_w, canvas_w
    if y1 > canvas_h:
        y0, y1 = canvas_h - crop_h, canvas_h

    cropped = canvas.crop((x0, y0, x1, y1))
    target_w, target_h = 600, 324
    cropped = cropped.resize((target_w, target_h), Image.Resampling.LANCZOS)

    scale_x = target_w / float(crop_w)
    scale_y = target_h / float(crop_h)

    poly_pts = []
    for pt in coords:
        px, py = geo_to_px(pt[0], pt[1])
        rpx = (px - x0) * scale_x
        rpy = (py - y0) * scale_y
        poly_pts.append((rpx, rpy))

    # 1. Translucent Green Fill via Alpha Composition (leaves satellite ground crisp & visible)
    fill_layer = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    fill_draw = ImageDraw.Draw(fill_layer)
    fill_draw.polygon(poly_pts, fill=(34, 197, 94, 38))
    cropped = Image.alpha_composite(cropped, fill_layer)

    draw = ImageDraw.Draw(cropped, "RGBA")

    # 2. Neon Green Boundary Line (#00e676 / #22c55e) matching My Farm MapLibreWrapper
    draw.line(poly_pts + [poly_pts[0]], fill=(0, 230, 118, 255), width=3)

    # 3. Typography Fonts
    font_bold = get_font(13, bold=True)
    font_bold_sm = get_font(11, bold=True)
    font_reg = get_font(12, bold=False)
    font_attr = get_font(9, bold=False)

    # 4. Centered Gat Badge with Gold/Amber Outline
    poly_xs = [p[0] for p in poly_pts]
    poly_ys = [p[1] for p in poly_pts]
    center_px = sum(poly_xs) / len(poly_xs)
    center_py = sum(poly_ys) / len(poly_ys)

    badge_text = f"Gat No. {clean_gat}"
    try:
        bbox = font_bold.getbbox(badge_text)
        tw = (bbox[2] - bbox[0]) + 20
        th = (bbox[3] - bbox[1]) + 12
    except Exception:
        tw = len(badge_text) * 8 + 18
        th = 24

    bx0 = int(center_px - tw / 2)
    by0 = int(center_py - th / 2)
    bx1 = bx0 + tw
    by1 = by0 + th

    draw.rounded_rectangle([bx0 - 1, by0 - 1, bx1 + 1, by1 + 1], radius=6, outline=(245, 158, 11, 240), width=2)
    draw.rounded_rectangle([bx0, by0, bx1, by1], radius=5, fill=(15, 23, 42, 235))
    draw.text((center_px, center_py), badge_text, font=font_bold, fill=(255, 255, 255, 255), anchor="mm")

    # 5. Floating Top-Left Pill Badge
    props = feat.get("properties", {})
    area_acres = props.get("area_acres")
    if not area_acres:
        raw_ha = props.get("area_ha") or props.get("area") or 1.49
        area_acres = f"{float(raw_ha) * 2.471:.2f}"

    village = props.get("village", "Malegaon Kh")
    pill_text = f"{village} \u2022 Gat Number {clean_gat}"
    acres_text = f"{area_acres} Acres"

    try:
        t_bbox = font_reg.getbbox(pill_text)
        text_w = t_bbox[2] - t_bbox[0]
        a_bbox = font_bold_sm.getbbox(acres_text)
        ac_w = (a_bbox[2] - a_bbox[0]) + 16
    except Exception:
        text_w = len(pill_text) * 7
        ac_w = len(acres_text) * 7 + 14

    pill_h = 28
    pill_w = 28 + text_w + 12 + ac_w + 8
    pill_x0 = 14
    pill_y0 = 12

    draw.rounded_rectangle(
        [pill_x0, pill_y0, pill_x0 + pill_w, pill_y0 + pill_h],
        radius=14,
        fill=(255, 255, 255, 245),
        outline=(226, 232, 240, 220),
        width=1,
    )
    # Green pulse dot
    draw.ellipse([pill_x0 + 10, pill_y0 + 9, pill_x0 + 20, pill_y0 + 19], fill=(34, 197, 94, 255))
    draw.text((pill_x0 + 26, pill_y0 + 14), pill_text, font=font_reg, fill=(30, 41, 59, 255), anchor="lm")

    # Green Acres Pill
    ac_x0 = pill_x0 + pill_w - ac_w - 5
    draw.rounded_rectangle(
        [ac_x0, pill_y0 + 4, ac_x0 + ac_w, pill_y0 + pill_h - 4],
        radius=10,
        fill=(220, 252, 231, 255),
    )
    draw.text((ac_x0 + ac_w / 2, pill_y0 + 14), acres_text, font=font_bold_sm, fill=(21, 128, 61, 255), anchor="mm")

    # 6. Bottom-Right Watermark
    attr_text = "\u00a9 Google \u2014 Esri"
    try:
        abbox = font_attr.getbbox(attr_text)
        aw = abbox[2] - abbox[0] + 10
    except Exception:
        aw = 90
    draw.rounded_rectangle(
        [target_w - aw - 6, target_h - 18, target_w - 6, target_h - 5],
        radius=3,
        fill=(255, 255, 255, 210),
    )
    draw.text((target_w - 6 - aw / 2, target_h - 12), attr_text, font=font_attr, fill=(71, 85, 105, 255), anchor="mm")

    # 7. Rounded Corners on the card (rounded-2xl)
    mask = Image.new("L", (target_w, target_h), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle([0, 0, target_w, target_h], radius=16, fill=255)

    final_card = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    final_card.paste(cropped, (0, 0), mask=mask)

    if not out_path:
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        safe_gn = clean_gat.replace("/", "_").replace("\\", "_")
        out_path = str(base_dir / "frontend" / "public" / "data" / "cadastre_thumbnails" / f"gat_{safe_gn}.png")

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    final_card.save(out_path, format="PNG")
    return out_path
