"""Generate emblem-only Yuvarani Silks app icons (no text below logo)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

# Prefer the full source with logo + text; crop keeps only the circular emblem.
SOURCE_CANDIDATES = [
    ROOT / "assets" / "icon-source-full.png",
    Path(
        r"C:\Users\murth\.cursor\projects\c-Users-murth-break-mobile-yuvaranisilks\assets"
        r"\c__Users_murth_break_mobile-yuvaranisilks_android_app_src_main_res_mipmap-xxxhdpi_ic_launcher_foreground.png"
    ),
    ROOT / "assets" / "icon.png",
]

BG = (28, 28, 28, 255)  # #1C1C1C
TEXT_START_Y_RATIO = 0.69  # rows below this are the "YUVARANI SILKS" label

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


def is_background(pixel: tuple[int, int, int, int]) -> bool:
    r, g, b, a = pixel
    return a < 128 or (r < 40 and g < 40 and b < 40)


def emblem_box(im: Image.Image) -> tuple[int, int, int, int]:
    px = im.load()
    w, h = im.size
    text_cutoff = int(h * TEXT_START_Y_RATIO)

    xs: list[int] = []
    ys: list[int] = []
    for y in range(min(text_cutoff, h)):
        for x in range(w):
            if not is_background(px[x, y]):
                xs.append(x)
                ys.append(y)

    if not xs:
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        return left, top, left + side, top + side

    pad = max(4, int((max(xs) - min(xs)) * 0.02))
    return (
        max(0, min(xs) - pad),
        max(0, min(ys) - pad),
        min(w, max(xs) + pad),
        min(h, max(ys) + pad),
    )


def make_icon(src: Image.Image, size: int, padding_ratio: float = 0.12) -> Image.Image:
    box = emblem_box(src)
    emblem = src.crop(box)

    pad_px = int(size * padding_ratio)
    inner = size - pad_px * 2
    emblem = emblem.resize((inner, inner), Image.Resampling.LANCZOS)

    out = Image.new("RGBA", (size, size), BG)
    out.paste(emblem, (pad_px, pad_px), emblem)
    return out


def main() -> None:
    src = load_source()
    box = emblem_box(src)
    print(f"Source: {src.size}, emblem crop: {box}")

    icon_path = ROOT / "assets" / "icon.png"
    adaptive_path = ROOT / "assets" / "adaptive-icon.png"

    make_icon(src, 1024, padding_ratio=0.14).save(icon_path, optimize=True)
    make_icon(src, 1024, padding_ratio=0.18).save(adaptive_path, optimize=True)

    android_res = ROOT / "android" / "app" / "src" / "main" / "res"
    for folder, px in ANDROID_SIZES.items():
        out_dir = android_res / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        fg = make_icon(src, px, padding_ratio=0.16)
        fg.save(out_dir / "ic_launcher_foreground.png", optimize=True)
        fg.save(out_dir / "ic_launcher.png", optimize=True)

    print("Saved emblem-only icons (no text).")


if __name__ == "__main__":
    main()
