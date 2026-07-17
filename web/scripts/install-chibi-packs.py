"""Build CutTok PNG packs from OpenGameArt chibi mugshots (eysselia, CC0-ish free use)."""
from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image

SRC = Path(r"C:\Users\dgpar\AppData\Local\Temp\cuttok-packs\extracted")
OUT = Path(r"c:\Repo\Amurtaht\Game\web\public\cuttok\packs")
SIZE = 512  # export size

# packId -> (display name, source dir relative, emotion file map)
# French labels from pack: Neutre/Happy/Angry/Sad/Oups/Stuppeur/Heu/Hein
PACKS = {
    "ink": {
        "name": "아라넬",
        "dir": SRC / "aranel" / "Aranel",
        "map": {
            "idle": "Aranel_Neutre.png",
            "neutral": "Aranel_Neutre.png",
            "happy": "Aranel_Happy.png",
            "laugh": "Aranel_Happy2.png",
            "angry": "Aranel_Angry.png",
            "sad": "Aranel_Sad.png",
            "surprise": "Aranel_Stuppeur.png",
            "shy": "Aranel_Heu.png",
            "cool": "Aranel_Angry2.png",
            "love": "Aranel_Happy2.png",
            "think": "Aranel_Oups.png",
            "wave": "Aranel_Happy.png",
            "shrug": "Aranel_Heu.png",
            "fist": "Aranel_Angry.png",
            "facepalm": "Aranel_Sad.png",
            "heart": "Aranel_Happy2.png",
            "point": "Aranel_Neutre.png",
            "cheer": "Aranel_Happy2.png",
        },
    },
    "brush": {
        "name": "아웨나",
        "dir": SRC / "awena" / "Awena",
        "map": {
            "idle": "C_Neutre.png",
            "neutral": "C_Neutre.png",
            "happy": "C_Happy.png",
            "laugh": "C_Happy2.png",
            "angry": "C_Angry.png",
            "sad": "C_Sad.png",
            "surprise": "C_Happy2.png",
            "shy": "C_Sad.png",
            "cool": "C_Neutre.png",
            "love": "C_Happy.png",
            "think": "C_Neutre.png",
            "wave": "C_Happy.png",
            "shrug": "C_Sad.png",
            "fist": "C_Angry.png",
            "facepalm": "C_Sad.png",
            "heart": "C_Happy2.png",
            "point": "C_Neutre.png",
            "cheer": "C_Happy2.png",
        },
    },
    "dot": {
        "name": "비비안",
        "dir": SRC / "vivianne" / "Vivianne",
        "map": {
            "idle": "Viviane_Neutre.png",
            "neutral": "Viviane_Neutre.png",
            "happy": "Vivianne_Happy.png",
            "laugh": "Vivianne_Happy2.png",
            "angry": "Vivianne_Angry.png",
            "sad": "Viviane_Sad.png",
            "surprise": "Viviane_oups.png",
            "shy": "Vivianne_Heu.png",
            "cool": "Vivianne_Angry2.png",
            "love": "Vivianne_Happy2.png",
            "think": "Viviane_Hein.png",
            "wave": "Vivianne_Happy.png",
            "shrug": "Vivianne_Heu.png",
            "fist": "Vivianne_Angry.png",
            "facepalm": "Viviane_Sad.png",
            "heart": "Vivianne_Happy2.png",
            "point": "Viviane_Neutre.png",
            "cheer": "Vivianne_Happy2.png",
        },
    },
    "frame": {
        "name": "아웨나(과거)",
        "dir": SRC / "awena" / "Awena" / "pastAwena",
        "map": {
            "idle": "C_Neutre.png",
            "neutral": "C_Neutre.png",
            "happy": "C_Happy1.png",
            "laugh": "C_Happy2.png",
            "angry": "C_Angry.png",
            "sad": "C_Sad.png",
            "surprise": "C_Happy2.png",
            "shy": "C_SadV1.png",
            "cool": "C_Neutre.png",
            "love": "C_Happy1.png",
            "think": "C_SadV1.png",
            "wave": "C_Happy1.png",
            "shrug": "C_Sad.png",
            "fist": "C_Angry.png",
            "facepalm": "C_Sad.png",
            "heart": "C_Happy2.png",
            "point": "C_Neutre.png",
            "cheer": "C_Happy2.png",
        },
    },
}


def remove_black_bg(im: Image.Image, thresh: int = 28) -> Image.Image:
    """Flood-fill near-black from edges → alpha 0."""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    visited = [[False] * w for _ in range(h)]
    stack: list[tuple[int, int]] = []

    def dark(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a > 0 and r <= thresh and g <= thresh and b <= thresh

    for x in range(w):
        stack.append((x, 0))
        stack.append((x, h - 1))
    for y in range(h):
        stack.append((0, y))
        stack.append((w - 1, y))

    while stack:
        x, y = stack.pop()
        if x < 0 or y < 0 or x >= w or y >= h or visited[y][x]:
            continue
        visited[y][x] = True
        if not dark(x, y):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    return im


def fit_square(im: Image.Image, size: int) -> Image.Image:
    im = im.convert("RGBA")
    # trim empty alpha
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    w, h = im.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(im, ((side - w) // 2, (side - h) // 2), im)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def build_pack(pack_id: str, cfg: dict) -> None:
    dest = OUT / pack_id
    # wipe old svg frames
    if dest.exists():
        for old in dest.glob("*"):
            if old.is_file():
                old.unlink()
    dest.mkdir(parents=True, exist_ok=True)

    frames: dict[str, str] = {}
    src_dir: Path = cfg["dir"]
    for frame, filename in cfg["map"].items():
        src = src_dir / filename
        if not src.exists():
            raise FileNotFoundError(src)
        out_name = f"{frame}.png"
        im = Image.open(src)
        im = remove_black_bg(im)
        im = fit_square(im, SIZE)
        im.save(dest / out_name, "PNG", optimize=True)
        frames[frame] = out_name
        print(f"  {pack_id}/{out_name} <- {filename}")

    manifest = {
        "id": pack_id,
        "name": cfg["name"],
        "version": 2,
        "facing": "right",
        "flipForLeft": True,
        "kind": "sprite",
        "external": True,
        "credit": "eysselia — headmugshot packs (OpenGameArt). Free use; credit optional.",
        "source": "https://opengameart.org/content/headmugshot-packs-chibi-emotions",
        "fallback": "idle.png",
        "frames": frames,
    }
    (dest / "pack.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    (dest / "CREDITS.txt").write_text(
        "Character art: eysselia — headmugshot packs : chibi emotions\n"
        "https://opengameart.org/content/headmugshot-packs-chibi-emotions\n"
        "Author notes credit is optional; free to use.\n",
        encoding="utf-8",
    )


def main() -> None:
    for pack_id, cfg in PACKS.items():
        print("pack", pack_id)
        build_pack(pack_id, cfg)
    print("done ->", OUT)


if __name__ == "__main__":
    main()
