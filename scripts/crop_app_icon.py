"""Generate Yuvarani Silks app icons — emblem fills launcher like Demoapp."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

SOURCE_CANDIDATES = [
    ROOT / "assets" / "icon-source-full.png",
    ROOT / "assets" / "icon.png",
]

MAROON = (107, 26, 26, 255)  # #6B1A1A
TEXT_START_Y_RATIO = 0.69

ANDROID_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}


def load_source() -> Image.Image:
    for path in SOURCE_CANDIDATES:
        if not path.exists():
            continue
        try:
            im = Image.open(path).convert("RGBA")
            if im.size[0] >= 256 and im.size[1] >= 256:
                return im
        except OSError:
            continue
    raise FileNotFoundError("No valid icon source image found")


def is_dark_bg(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a < 128 or (r < 45 and g < 45 and b < 45)


def is_logo_pixel(pixel: tuple[int, int, int, int]) -> bool:
    return not is_dark_bg(pixel)


def emblem_crop(im: Image.Image) -> Image.Image:
    px = im.load()
    w, h = im.size
    text_cutoff = int(h * TEXT_START_Y_RATIO)

    xs: list[int] = []
    ys: list[int] = []
    for y in range(min(text_cutoff, h)):
        for x in range(w):
            if is_logo_pixel(px[x, y]):
                xs.append(x)
                ys.append(y)

    if not xs:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        box = (left, top, left + side, top + side)
    else:
        pad = max(2, int((max(xs) - min(xs)) * 0.012))
        box = (
            max(0, min(xs) - pad),
            max(0, min(ys) - pad),
            min(w, max(xs) + pad),
            min(h, max(ys) + pad),
        )

    cropped = im.crop(box)
    return flatten_emblem(cropped)


def flatten_emblem(emblem: Image.Image) -> Image.Image:
    """Replace dark source background with brand maroon so no black frame shows."""
    out = Image.new("RGBA", emblem.size, MAROON)
    out.paste(emblem, (0, 0), emblem)
    px = emblem.load()
    op = out.load()
    w, h = emblem.size
    for y in range(h):
        for x in range(w):
            if is_dark_bg(px[x, y]):
                op[x, y] = MAROON
    return out


def fit_emblem(emblem: Image.Image, size: int, fill_ratio: float = 1.0) -> Image.Image:
    """Cover-scale emblem to fill a square maroon canvas."""
    target = max(1, int(size * fill_ratio))
    ew, eh = emblem.size
    scale = max(target / ew, target / eh)
    new_w = max(1, int(ew * scale))
    new_h = max(1, int(eh * scale))
    scaled = emblem.resize((new_w, new_h), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (size, size), MAROON)
    left = (size - new_w) // 2
    top = (size - new_h) // 2
    out.paste(scaled, (left, top), scaled)

    # Force any leftover dark pixels (from interpolation) to maroon.
    px = out.load()
    for y in range(size):
        for x in range(size):
            if is_dark_bg(px[x, y]):
                px[x, y] = MAROON
    return out


def main() -> None:
    src = load_source()
    emblem = emblem_crop(src)
    print(f"Source {src.size}, emblem {emblem.size}")

    fit_emblem(emblem, 1024, fill_ratio=1.0).save(ROOT / "assets" / "icon.png", optimize=True)
    fit_emblem(emblem, 1024, fill_ratio=1.04).save(ROOT / "assets" / "adaptive-icon.png", optimize=True)

    android_res = ROOT / "android" / "app" / "src" / "main" / "res"
    for folder, px in ANDROID_SIZES.items():
        out_dir = android_res / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        fit_emblem(emblem, px, fill_ratio=1.0).save(out_dir / "ic_launcher.png", optimize=True)
        fit_emblem(emblem, px, fill_ratio=1.04).save(out_dir / "ic_launcher_foreground.png", optimize=True)

    print("Saved full-fit maroon app icons.")


if __name__ == "__main__":
    main()
