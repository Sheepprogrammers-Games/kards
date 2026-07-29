#!/usr/bin/env python3
"""图像后处理。色键抠像、去溢色、裁剪留边、缩放并按输出扩展名编码。

用法:
  python3 tools/sprite/cutout.py IN.png OUT.webp [--key green|magenta|none]
      [--threshold 0.42] [--despill 0.9] [--trim] [--pad 0.04] [--square]
      [--max-size 768] [--quality 88]

参数:
  --key        色键颜色，none 跳过抠像
  --threshold  颜色距离阈值，越大抠得越狠
  --despill    边缘溢色抑制强度，0 关闭
  --trim       裁掉四周全透明区域
  --pad        trim 后按较长边比例补边
  --square     输出补成正方形
  --max-size   长边像素上限
  --quality    有损编码质量
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

KEYS = {
    "green": (0.0, 1.0, 0.0),
    "magenta": (1.0, 0.0, 1.0),
}


def build_alpha(rgb: np.ndarray, key: tuple[float, float, float], threshold: float) -> np.ndarray:
    """返回 0..1 的不透明度，靠近 key 色的像素趋近 0。"""
    diff = rgb - np.array(key, dtype=np.float32)
    dist = np.sqrt((diff**2).sum(axis=2)) / np.sqrt(3.0)
    # 阈值内完全透明，阈值到 1.6 倍阈值之间线性过渡，避免硬边锯齿
    soft = np.clip((dist - threshold) / (threshold * 0.6), 0.0, 1.0)
    return soft.astype(np.float32)


def despill(rgb: np.ndarray, key_index: int, strength: float) -> np.ndarray:
    """把某一通道超出另两通道均值的部分压回去。"""
    if strength <= 0:
        return rgb
    others = [i for i in range(3) if i != key_index]
    reference = rgb[:, :, others].mean(axis=2)
    channel = rgb[:, :, key_index]
    excess = np.clip(channel - reference, 0.0, None)
    out = rgb.copy()
    out[:, :, key_index] = channel - excess * strength
    return out


def trim_alpha(img: Image.Image, pad_ratio: float, square: bool) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        return img
    img = img.crop(bbox)
    pad = int(round(max(img.size) * pad_ratio))
    if square:
        side = max(img.size) + pad * 2
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
        return canvas
    if pad:
        canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(img, (pad, pad))
        return canvas
    return img


def fit(img: Image.Image, max_size: int) -> Image.Image:
    longest = max(img.size)
    if max_size <= 0 or longest <= max_size:
        return img
    k = max_size / longest
    return img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)


def process(
    src: Path,
    dst: Path,
    *,
    key_name: str,
    threshold: float,
    despill_strength: float,
    trim: bool,
    pad: float,
    square: bool,
    max_size: int,
    quality: int,
) -> dict:
    img = Image.open(src).convert("RGBA")

    if key_name != "none":
        arr = np.asarray(img).astype(np.float32) / 255.0
        rgb, alpha_in = arr[:, :, :3], arr[:, :, 3]
        key = KEYS[key_name]
        alpha = build_alpha(rgb, key, threshold) * alpha_in
        rgb = despill(rgb, 1 if key_name == "green" else 0, despill_strength)
        out = np.dstack([np.clip(rgb, 0.0, 1.0), np.clip(alpha, 0.0, 1.0)])
        img = Image.fromarray((out * 255.0).round().astype(np.uint8), "RGBA")
        if trim:
            img = trim_alpha(img, pad, square)

    img = fit(img, max_size)

    dst.parent.mkdir(parents=True, exist_ok=True)
    suffix = dst.suffix.lower()
    if suffix == ".webp":
        img.save(dst, "WEBP", quality=quality, method=6)
    elif suffix in (".jpg", ".jpeg"):
        img.convert("RGB").save(dst, "JPEG", quality=quality, optimize=True)
    else:
        img.save(dst, optimize=True)

    return {"size": img.size, "bytes": dst.stat().st_size}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("src", type=Path)
    ap.add_argument("dst", type=Path)
    ap.add_argument("--key", choices=[*sorted(KEYS), "none"], default="green")
    ap.add_argument("--threshold", type=float, default=0.42)
    ap.add_argument("--despill", type=float, default=0.9)
    ap.add_argument("--trim", action="store_true")
    ap.add_argument("--pad", type=float, default=0.04)
    ap.add_argument("--square", action="store_true")
    ap.add_argument("--max-size", type=int, default=0)
    ap.add_argument("--quality", type=int, default=88)
    args = ap.parse_args()

    info = process(
        args.src,
        args.dst,
        key_name=args.key,
        threshold=args.threshold,
        despill_strength=args.despill,
        trim=args.trim,
        pad=args.pad,
        square=args.square,
        max_size=args.max_size,
        quality=args.quality,
    )
    print(f"{args.dst} {info['size'][0]}x{info['size'][1]} {info['bytes'] // 1024}KB")


if __name__ == "__main__":
    main()
