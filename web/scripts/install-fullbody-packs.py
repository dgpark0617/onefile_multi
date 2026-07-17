"""Install full-body VN sprites (kuudere) into CutTok packs + bust/full framing support."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

SRC_ROOT = Path(
    r"C:\Users\dgpar\AppData\Local\Temp\cuttok-fullbody\extracted\kuudere_lisadikaprio\KUUDERE LisadiKaprio"
)
OUT = Path(r"c:\Repo\Amurtaht\Game\web\public\cuttok\packs")
# keep tall portrait aspect for full-body crop later
W, H = 360, 700


def remove_near_black(im: Image.Image, thresh: int = 18) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    def dark(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r <= thresh and g <= thresh and b <= thresh

    for x in range(w):
        stack += [(x, 0), (x, h - 1)]
    for y in range(h):
        stack += [(0, y), (w - 1, y)]
    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        if not dark(x, y):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    return im


def fit(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    # pad to target aspect
    tw, th = W, H
    scale = min(tw / im.width, th / im.height)
    nw, nh = max(1, int(im.width * scale)), max(1, int(im.height * scale))
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    canvas.paste(im, ((tw - nw) // 2, th - nh), im)  # feet at bottom
    return canvas


def pick(outfit: str, head: str, name: str) -> Path:
    return SRC_ROOT / head / outfit / name


PACKS = {
    "ink": {
        "name": "쿠데레·교복",
        "outfit": "school uniform",
    },
    "brush": {
        "name": "쿠데레·캐주얼",
        "outfit": "casual",
    },
    "dot": {
        "name": "쿠데레·드레스",
        "outfit": "dress",
    },
    "frame": {
        "name": "쿠데레·자켓",
        "outfit": "jacket skirt",
    },
}

# Map CutTok frames -> (head_folder, filename)
# Avoid inappropriate "pervert" art.
FRAME_MAP = {
    "idle": ("HEAD UP", "neutral.png"),
    "neutral": ("HEAD UP", "neutral.png"),
    "happy": ("HEAD UP", "smile.png"),
    "laugh": ("HEAD UP", "smile blush.png"),
    "angry": ("HEAD UP", "pissed.png"),
    "sad": ("HEAD DOWN", "neutral.png"),
    "surprise": ("HEAD UP", "neutral blush.png"),
    "shy": ("HEAD DOWN", "smile blush.png"),
    "cool": ("HEAD UP", "neutral.png"),
    "love": ("HEAD UP", "smile blush.png"),
    "think": ("HEAD DOWN", "neutral blush.png"),
    "wave": ("HEAD UP", "smile.png"),
    "shrug": ("HEAD DOWN", "neutral.png"),
    "fist": ("HEAD UP", "pissed.png"),
    "facepalm": ("HEAD DOWN", "pissed.png"),
    "heart": ("HEAD UP", "smile blush.png"),
    "point": ("HEAD UP", "neutral.png"),
    "cheer": ("HEAD UP", "smile.png"),
}


def build_pack(pack_id: str, cfg: dict) -> None:
    dest = OUT / pack_id
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    frames: dict[str, str] = {}
    outfit = cfg["outfit"]
    for frame, (head, fname) in FRAME_MAP.items():
        src = pick(outfit, head, fname)
        if not src.exists():
            # fallback
            src = pick(outfit, "HEAD UP", "neutral.png")
        out_name = f"{frame}.png"
        im = Image.open(src)
        # already RGBA transparent usually; still clean edge black
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        # only flood if corners are opaque black
        c = im.getpixel((2, 2))
        if c[3] > 200 and c[0] < 20 and c[1] < 20 and c[2] < 20:
            im = remove_near_black(im)
        im = fit(im)
        im.save(dest / out_name, "PNG", optimize=True)
        frames[frame] = out_name
        print(f"  {pack_id}/{out_name}")

    manifest = {
        "id": pack_id,
        "name": cfg["name"],
        "version": 3,
        "facing": "right",
        "flipForLeft": True,
        "kind": "sprite",
        "body": "full",
        "aspect": [W, H],
        "external": True,
        "credit": "LisadiKaprio — Kuudere Visual Novel Sprite (OpenGameArt).",
        "source": "https://opengameart.org/content/kuudere-visual-novel-sprite",
        "fallback": "idle.png",
        "frames": frames,
    }
    (dest / "pack.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (dest / "CREDITS.txt").write_text(
        "Full-body sprite: LisadiKaprio — Kuudere Visual novel Sprite\n"
        "https://opengameart.org/content/kuudere-visual-novel-sprite\n"
        "Outfits used as CutTok presets (school/casual/dress/jacket).\n",
        encoding="utf-8",
    )


def main() -> None:
    for pack_id, cfg in PACKS.items():
        print("pack", pack_id, cfg["outfit"])
        build_pack(pack_id, cfg)
    print("done", OUT)


if __name__ == "__main__":
    main()
