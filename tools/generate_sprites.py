"""Generate the placeholder 64x64 pixel-art calico cat sprite sheet.
The output is intentionally code-generated so future artists can replace the PNG and preserve
frame names/indices in sprite-map.json.
"""
from __future__ import annotations

import json
import math
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets"
FRAME = 64
COLUMNS = 8
ACTIONS = [
    ("idle", 6), ("sit", 6), ("sleep", 6), ("yawn", 4), ("stretch", 6),
    ("walk", 6), ("run", 6), ("jump", 6), ("groom_paw", 6), ("groom_coat", 6),
    ("scratch_ear", 6), ("tail_swish", 6), ("rub", 6), ("drag", 6), ("belly", 6),
    ("look", 6), ("attention", 6), ("eat", 6), ("pounce", 6), ("yarn", 6),
]

P = {
    "outline": "#271B2B", "shadow": "#4A3444", "white": "#F8EED8",
    "cream": "#E3CFB5", "orange": "#E9873D", "orange_dark": "#B94F2E",
    "black": "#332B3D", "black_hi": "#55455C", "pink": "#F39AB0",
    "pink_dark": "#C85D79", "eye_left": "#E6B94E", "eye_left_dark": "#8A5A24",
    "eye_right": "#76C9EE", "eye_right_dark": "#2F729F", "eye_glint": "#F8FFF0", "fish": "#83C8D0", "fish_dark": "#3D7589",
    "yarn": "#D66AA0", "yarn_dark": "#914266", "heart": "#F0648C",
}


def rect(d: ImageDraw.ImageDraw, xy, fill: str):
    d.rectangle(xy, fill=fill)


def poly(d: ImageDraw.ImageDraw, points, fill: str):
    d.polygon(points, fill=fill)


def pixel_line(d: ImageDraw.ImageDraw, points, fill: str, width=1):
    d.line(points, fill=fill, width=width, joint="curve")


def shadow(d, y=60, width=40, x=12):
    rect(d, (x + 4, y, x + width - 5, y + 1), P["shadow"])
    rect(d, (x, y + 1, x + width - 1, y + 2), P["shadow"])


def ear(d, x, y, flip=False):
    # A jagged, outlined furry ear.
    if not flip:
        poly(d, [(x, y + 13), (x, y + 2), (x + 4, y), (x + 12, y + 12)], P["outline"])
        poly(d, [(x + 2, y + 11), (x + 2, y + 4), (x + 4, y + 2), (x + 9, y + 11)], P["orange"])
        poly(d, [(x + 4, y + 10), (x + 4, y + 6), (x + 5, y + 5), (x + 8, y + 10)], P["pink"])
    else:
        poly(d, [(x, y + 12), (x + 8, y), (x + 12, y + 2), (x + 12, y + 13)], P["outline"])
        poly(d, [(x + 3, y + 11), (x + 8, y + 2), (x + 10, y + 4), (x + 10, y + 11)], P["black"])
        poly(d, [(x + 5, y + 10), (x + 8, y + 5), (x + 9, y + 6), (x + 9, y + 10)], P["pink"])


def tail(d, bx, by, phase=0, raised=False):
    sway = int(round(math.sin(phase * math.pi / 2) * 4))
    if raised:
        points = [(bx + 42, by + 35), (bx + 52 + sway, by + 32), (bx + 55 + sway, by + 22),
                  (bx + 51 + sway, by + 16), (bx + 48 + sway, by + 18), (bx + 50 + sway, by + 24),
                  (bx + 45 + sway, by + 30), (bx + 38, by + 31)]
    else:
        points = [(bx + 40, by + 37), (bx + 51 + sway, by + 40), (bx + 56 + sway, by + 47),
                  (bx + 53 + sway, by + 52), (bx + 46 + sway, by + 48), (bx + 42 + sway, by + 45),
                  (bx + 35, by + 42)]
    poly(d, points, P["outline"])
    inner = [(x + (1 if x < bx + 48 else -1), y - 1) for x, y in points[1:-1]]
    poly(d, [(bx + 41, by + 38)] + inner + [(bx + 36, by + 41)], P["black"])
    rect(d, (bx + 47 + sway, by + 41, bx + 51 + sway, by + 45), P["orange"])
    rect(d, (bx + 51 + sway, by + 46, bx + 53 + sway, by + 48), P["cream"])


def face(d, x, y, eye_shift=0, mouth="normal", sleepy=False, blush=False):
    # eyes
    if sleepy:
        pixel_line(d, [(x + 15, y + 22), (x + 19, y + 23), (x + 23, y + 22)], P["outline"], 2)
        pixel_line(d, [(x + 34, y + 22), (x + 38, y + 23), (x + 42, y + 22)], P["outline"], 2)
    else:
        rect(d, (x + 16 + eye_shift, y + 18, x + 23 + eye_shift, y + 27), P["outline"])
        rect(d, (x + 18 + eye_shift, y + 19, x + 22 + eye_shift, y + 26), P["eye_left"])
        rect(d, (x + 20 + eye_shift, y + 20, x + 22 + eye_shift, y + 24), P["eye_left_dark"])
        rect(d, (x + 18 + eye_shift, y + 19, x + 19 + eye_shift, y + 20), P["eye_glint"])
        rect(d, (x + 34 + eye_shift, y + 18, x + 41 + eye_shift, y + 27), P["outline"])
        rect(d, (x + 35 + eye_shift, y + 19, x + 39 + eye_shift, y + 26), P["eye_right"])
        rect(d, (x + 35 + eye_shift, y + 20, x + 37 + eye_shift, y + 24), P["eye_right_dark"])
        rect(d, (x + 38 + eye_shift, y + 19, x + 39 + eye_shift, y + 20), P["eye_glint"])
    # nose and mouth
    rect(d, (x + 28, y + 28, x + 31, y + 30), P["pink"])
    rect(d, (x + 29, y + 31, x + 30, y + 32), P["outline"])
    if mouth == "yawn":
        rect(d, (x + 25, y + 32, x + 34, y + 39), P["outline"])
        rect(d, (x + 27, y + 34, x + 32, y + 38), P["pink_dark"])
    elif mouth == "happy":
        pixel_line(d, [(x + 29, y + 32), (x + 26, y + 35), (x + 23, y + 34)], P["outline"], 1)
        pixel_line(d, [(x + 30, y + 32), (x + 33, y + 35), (x + 36, y + 34)], P["outline"], 1)
    else:
        pixel_line(d, [(x + 29, y + 32), (x + 26, y + 34)], P["outline"], 1)
        pixel_line(d, [(x + 30, y + 32), (x + 33, y + 34)], P["outline"], 1)
    # whiskers and optional blush
    pixel_line(d, [(x + 26, y + 31), (x + 8, y + 28)], P["outline"], 1)
    pixel_line(d, [(x + 26, y + 34), (x + 9, y + 36)], P["outline"], 1)
    pixel_line(d, [(x + 33, y + 31), (x + 50, y + 28)], P["outline"], 1)
    pixel_line(d, [(x + 33, y + 34), (x + 50, y + 36)], P["outline"], 1)
    if blush:
        rect(d, (x + 10, y + 30, x + 14, y + 31), P["pink"])
        rect(d, (x + 44, y + 30, x + 48, y + 31), P["pink"])


def standing_cat(img, phase, pose="idle", offset_x=0, offset_y=0, eye_shift=0):
    d = ImageDraw.Draw(img)
    bob = int(round(math.sin(phase * math.pi) * 1.3)) if pose in {"idle", "walk", "run", "look", "attention"} else 0
    x, y = offset_x, offset_y + bob
    shadow(d, 59 + offset_y)
    tail(d, x, y, phase, raised=pose in {"look", "attention"})
    # body and fur edge
    poly(d, [(x + 14, y + 31), (x + 10, y + 38), (x + 11, y + 53), (x + 16, y + 58),
             (x + 25, y + 60), (x + 46, y + 59), (x + 52, y + 54), (x + 52, y + 38),
             (x + 47, y + 31)], P["outline"])
    poly(d, [(x + 16, y + 32), (x + 13, y + 39), (x + 14, y + 51), (x + 18, y + 56),
             (x + 27, y + 57), (x + 44, y + 57), (x + 49, y + 52), (x + 49, y + 39),
             (x + 45, y + 32)], P["white"])
    # calico body patches
    rect(d, (x + 17, y + 36, x + 25, y + 46), P["orange"])
    rect(d, (x + 19, y + 44, x + 28, y + 51), P["orange"])
    rect(d, (x + 39, y + 34, x + 48, y + 46), P["black"])
    rect(d, (x + 35, y + 41, x + 47, y + 52), P["black"])
    rect(d, (x + 24, y + 53, x + 30, y + 58), P["cream"])
    # legs animate by pose
    if pose in {"walk", "run"}:
        leg = int(round(math.sin(phase * math.pi) * (3 if pose == "walk" else 5)))
        rect(d, (x + 19, y + 49 + max(0, leg), x + 26, y + 59 + max(0, leg)), P["outline"])
        rect(d, (x + 20, y + 49 + max(0, leg), x + 25, y + 58 + max(0, leg)), P["white"])
        rect(d, (x + 35, y + 49 + max(0, -leg), x + 42, y + 59 + max(0, -leg)), P["outline"])
        rect(d, (x + 36, y + 49 + max(0, -leg), x + 41, y + 58 + max(0, -leg)), P["white"])
    else:
        rect(d, (x + 19, y + 49, x + 26, y + 59), P["outline"])
        rect(d, (x + 20, y + 49, x + 25, y + 58), P["white"])
        rect(d, (x + 35, y + 49, x + 42, y + 59), P["outline"])
        rect(d, (x + 36, y + 49, x + 41, y + 58), P["white"])
    # head
    ear(d, x + 13, y + 5)
    ear(d, x + 39, y + 5, flip=True)
    poly(d, [(x + 13, y + 14), (x + 19, y + 9), (x + 44, y + 9), (x + 51, y + 15),
             (x + 51, y + 33), (x + 47, y + 40), (x + 18, y + 40), (x + 12, y + 34)], P["outline"])
    poly(d, [(x + 15, y + 16), (x + 20, y + 11), (x + 43, y + 11), (x + 49, y + 16),
             (x + 48, y + 32), (x + 44, y + 38), (x + 19, y + 38), (x + 14, y + 32)], P["white"])
    # face patches and chest tufts
    rect(d, (x + 15, y + 16, x + 26, y + 25), P["orange"])
    rect(d, (x + 18, y + 11, x + 29, y + 18), P["orange"])
    rect(d, (x + 37, y + 12, x + 48, y + 25), P["black"])
    rect(d, (x + 41, y + 24, x + 48, y + 30), P["black"])
    rect(d, (x + 25, y + 12, x + 31, y + 18), P["cream"])
    rect(d, (x + 24, y + 37, x + 27, y + 43), P["cream"])
    rect(d, (x + 29, y + 38, x + 32, y + 45), P["white"])
    rect(d, (x + 34, y + 37, x + 37, y + 43), P["cream"])
    face(d, x, y, eye_shift=eye_shift, sleepy=(pose == "sleep"))


def draw_sitting(img, phase):
    d = ImageDraw.Draw(img)
    x, y = 0, int(round(math.sin(phase * math.pi) * 1))
    shadow(d, 59)
    tail(d, x - 2, y + 2, phase)
    poly(d, [(15, 28 + y), (11, 38 + y), (12, 54 + y), (19, 59 + y), (46, 59 + y), (51, 54 + y), (50, 36 + y), (45, 29 + y)], P["outline"])
    poly(d, [(16, 30 + y), (14, 39 + y), (15, 52 + y), (20, 57 + y), (44, 57 + y), (48, 52 + y), (48, 38 + y), (43, 30 + y)], P["white"])
    rect(d, (15, 39 + y, 25, 51 + y), P["orange"])
    rect(d, (37, 38 + y, 48, 53 + y), P["black"])
    rect(d, (23, 52 + y, 31, 58 + y), P["cream"])
    rect(d, (34, 52 + y, 41, 58 + y), P["white"])
    standing_cat(img, phase, pose="sit", offset_y=-1)


def draw_sleep(img, phase):
    d = ImageDraw.Draw(img)
    breath = int(round(math.sin(phase * math.pi) * 1.2))
    shadow(d, 58, 46, 8)
    # curled base/body
    poly(d, [(8, 40 + breath), (12, 32 + breath), (31, 29 + breath), (48, 33 + breath), (56, 42 + breath),
             (52, 54 + breath), (42, 58 + breath), (19, 57 + breath), (9, 51 + breath)], P["outline"])
    poly(d, [(10, 41 + breath), (14, 34 + breath), (30, 31 + breath), (46, 35 + breath), (53, 43 + breath),
             (49, 52 + breath), (40, 56 + breath), (20, 55 + breath), (11, 50 + breath)], P["white"])
    rect(d, (30, 34 + breath, 47, 48 + breath), P["black"])
    rect(d, (40, 42 + breath, 51, 52 + breath), P["orange"])
    # tucked tail
    poly(d, [(20, 49 + breath), (35, 49 + breath), (44, 53 + breath), (40, 56 + breath), (27, 54 + breath), (16, 52 + breath)], P["outline"])
    poly(d, [(21, 50 + breath), (34, 51 + breath), (41, 53 + breath), (38, 54 + breath), (27, 53 + breath), (18, 51 + breath)], P["orange"])
    ear(d, 12, 20 + breath)
    ear(d, 35, 21 + breath, flip=True)
    poly(d, [(12, 29 + breath), (18, 24 + breath), (40, 25 + breath), (46, 31 + breath), (43, 42 + breath), (17, 42 + breath), (11, 36 + breath)], P["outline"])
    poly(d, [(14, 30 + breath), (19, 26 + breath), (39, 27 + breath), (44, 32 + breath), (41, 40 + breath), (18, 40 + breath), (13, 35 + breath)], P["white"])
    rect(d, (14, 29 + breath, 25, 36 + breath), P["orange"])
    rect(d, (34, 27 + breath, 43, 36 + breath), P["black"])
    face(d, 0, 8 + breath, sleepy=True)
    if phase in {2, 5}:
        rect(d, (48, 20 + breath, 49, 21 + breath), P["outline"])
        rect(d, (50, 18 + breath, 52, 19 + breath), P["outline"])


def draw_yawn(img, phase):
    standing_cat(img, phase, pose="idle", offset_y=1)
    d = ImageDraw.Draw(img)
    # overwrite mouth area with a wide open yawn
    rect(d, (25, 33, 35, 41 + (1 if phase in {1, 2} else 0)), P["outline"])
    rect(d, (27, 35, 33, 39 + (1 if phase in {1, 2} else 0)), P["pink_dark"])


def draw_stretch(img, phase):
    d = ImageDraw.Draw(img)
    reach = int(round(phase * 1.2))
    shadow(d, 59, 47, 7)
    # rear and head lowered
    poly(d, [(11, 34), (18, 27), (41, 30), (52, 38), (49, 51), (41, 56), (20, 56), (12, 50)], P["outline"])
    poly(d, [(13, 35), (19, 29), (40, 32), (49, 39), (46, 49), (39, 54), (21, 54), (14, 49)], P["white"])
    rect(d, (31, 31, 47, 45), P["black"])
    rect(d, (20, 33, 30, 46), P["orange"])
    tail(d, -1, -3, phase, raised=True)
    # extended front paws
    rect(d, (10 - reach, 48, 29 - reach, 55), P["outline"])
    rect(d, (11 - reach, 49, 28 - reach, 53), P["white"])
    ear(d, 8 - reach, 33)
    ear(d, 28 - reach, 33, flip=True)
    poly(d, [(8 - reach, 42), (14 - reach, 37), (34 - reach, 37), (40 - reach, 43), (37 - reach, 50), (13 - reach, 50)], P["outline"])
    poly(d, [(10 - reach, 43), (15 - reach, 39), (33 - reach, 39), (38 - reach, 44), (35 - reach, 48), (14 - reach, 48)], P["white"])
    rect(d, (11 - reach, 42, 20 - reach, 47), P["orange"])
    face(d, -4 - reach, 29, mouth="happy")


def draw_jump(img, phase, happy=True):
    d = ImageDraw.Draw(img)
    arc = [0, -6, -12, -14, -12, -6][phase]
    standing_cat(img, phase, pose="idle", offset_y=arc)
    # legs tuck in the air, sparkle at apex
    if phase in {2, 3}:
        rect(d, (8, 16, 10, 18), P["heart"])
        rect(d, (54, 20, 56, 22), P["heart"])
    if happy:
        face(d, 0, arc, mouth="happy", blush=True)


def draw_groom(img, phase, mode):
    standing_cat(img, phase, pose="sit", offset_y=1)
    d = ImageDraw.Draw(img)
    lift = [0, 4, 8, 10, 6, 2][phase]
    if mode == "paw":
        rect(d, (19, 47 - lift, 27, 57 - lift), P["outline"])
        rect(d, (20, 47 - lift, 26, 56 - lift), P["white"])
        if phase in {2, 3}:
            rect(d, (24, 37, 26, 40), P["pink"])
    elif mode == "coat":
        rect(d, (36, 34, 42, 49), P["outline"])
        rect(d, (37, 35, 41, 48), P["white"])
        if phase in {1, 4}:
            rect(d, (31, 37, 34, 39), P["pink"])
    else:
        rect(d, (37, 17 + lift // 3, 45, 30 + lift // 3), P["outline"])
        rect(d, (38, 18 + lift // 3, 44, 29 + lift // 3), P["white"])
        pixel_line(d, [(42, 24 + lift // 3), (46, 20 + lift // 3)], P["outline"], 1)


def draw_rub(img, phase):
    d = ImageDraw.Draw(img)
    lean = [-3, -1, 1, 3, 2, 0][phase]
    standing_cat(img, phase, pose="idle", offset_x=lean, offset_y=1)
    # invisible wall is represented by pale pixel marks
    rect(d, (57, 24, 58, 44), P["cream"])
    rect(d, (55, 29, 56, 30), P["heart"])


def draw_drag(img, phase):
    d = ImageDraw.Draw(img)
    sway = [-2, 0, 2, 3, 1, -1][phase]
    # Body suspended with legs dangling
    poly(d, [(12 + sway, 20), (18 + sway, 13), (45 + sway, 14), (53 + sway, 23), (50 + sway, 41), (43 + sway, 48), (20 + sway, 47), (11 + sway, 39)], P["outline"])
    poly(d, [(14 + sway, 21), (20 + sway, 15), (43 + sway, 16), (51 + sway, 24), (48 + sway, 39), (41 + sway, 46), (21 + sway, 45), (13 + sway, 38)], P["white"])
    rect(d, (14 + sway, 22, 28 + sway, 35), P["orange"])
    rect(d, (38 + sway, 18, 49 + sway, 35), P["black"])
    ear(d, 13 + sway, 9)
    ear(d, 39 + sway, 9, flip=True)
    face(d, sway, 4, mouth="yawn", blush=True)
    for lx in (17, 29, 40):
        rect(d, (lx + sway, 42, lx + sway + 5, 55 + (phase % 2)), P["outline"])
        rect(d, (lx + sway + 1, 43, lx + sway + 4, 54 + (phase % 2)), P["white"])
    tail(d, sway, -10, phase, raised=True)


def draw_belly(img, phase):
    d = ImageDraw.Draw(img)
    wiggle = [-1, 0, 1, 2, 1, 0][phase]
    shadow(d, 57, 43, 10)
    # on its back
    poly(d, [(9, 33 + wiggle), (15, 25 + wiggle), (44, 24 + wiggle), (54, 34 + wiggle), (51, 49 + wiggle), (43, 56 + wiggle), (18, 55 + wiggle), (9, 47 + wiggle)], P["outline"])
    poly(d, [(11, 34 + wiggle), (16, 27 + wiggle), (43, 26 + wiggle), (52, 35 + wiggle), (49, 47 + wiggle), (41, 54 + wiggle), (19, 53 + wiggle), (11, 46 + wiggle)], P["white"])
    rect(d, (23, 31 + wiggle, 39, 49 + wiggle), P["cream"])
    rect(d, (13, 36 + wiggle, 24, 46 + wiggle), P["orange"])
    rect(d, (41, 32 + wiggle, 50, 43 + wiggle), P["black"])
    ear(d, 14, 16 + wiggle)
    ear(d, 37, 16 + wiggle, flip=True)
    face(d, 0, 11 + wiggle, mouth="happy", blush=True)
    for px, py in [(12, 23), (42, 22), (10, 47), (45, 47)]:
        rect(d, (px, py + wiggle, px + 7, py + 4 + wiggle), P["outline"])
        rect(d, (px + 1, py + 1 + wiggle, px + 6, py + 3 + wiggle), P["white"])


def draw_look(img, phase, attention=False):
    eye = [-2, -1, 0, 1, 2, 1][phase]
    standing_cat(img, phase, pose="attention" if attention else "look", eye_shift=eye)
    d = ImageDraw.Draw(img)
    if attention:
        rect(d, (55, 14, 57, 17), P["heart"])
        rect(d, (57, 16, 59, 18), P["heart"])


def draw_eat(img, phase):
    standing_cat(img, phase, pose="sit", offset_x=-4)
    d = ImageDraw.Draw(img)
    fish_x = [41, 39, 37, 37, 37, 37][phase]
    fish_y = [51, 52, 53, 54, 55, 56][phase]
    poly(d, [(fish_x, fish_y), (fish_x + 8, fish_y - 3), (fish_x + 13, fish_y), (fish_x + 8, fish_y + 3)], P["fish_dark"])
    poly(d, [(fish_x + 1, fish_y), (fish_x + 8, fish_y - 2), (fish_x + 10, fish_y), (fish_x + 8, fish_y + 2)], P["fish"])
    rect(d, (fish_x + 7, fish_y, fish_x + 7, fish_y), P["outline"])
    if phase >= 4:
        rect(d, (28, 32, 32, 34), P["pink"])


def draw_pounce(img, phase):
    d = ImageDraw.Draw(img)
    xoff = [10, 6, 1, -2, 0, 4][phase]
    draw_stretch(img, min(5, phase))
    # yarn target
    draw_yarn_ball(d, 44 + xoff, 53, phase)


def draw_yarn_ball(d, x, y, phase):
    rect(d, (x, y, x + 9, y + 8), P["outline"])
    rect(d, (x + 1, y + 1, x + 8, y + 7), P["yarn"])
    pixel_line(d, [(x + 1, y + 4), (x + 8, y + 2)], P["yarn_dark"], 1)
    pixel_line(d, [(x + 3, y + 1), (x + 6, y + 7)], P["yarn_dark"], 1)
    pixel_line(d, [(x + 8, y + 6), (x + 14 + phase, y + 10)], P["yarn_dark"], 1)


def draw_yarn(img, phase):
    standing_cat(img, phase, pose="look", offset_x=-4, eye_shift=2)
    d = ImageDraw.Draw(img)
    draw_yarn_ball(d, 42 + int(math.sin(phase * math.pi) * 5), 52, phase)


def render(action: str, frame: int, total: int) -> Image.Image:
    img = Image.new("RGBA", (FRAME, FRAME), (0, 0, 0, 0))
    phase = frame / max(1, total - 1) * 2 - 1
    if action == "idle": standing_cat(img, phase, "idle")
    elif action == "sit": draw_sitting(img, phase)
    elif action == "sleep": draw_sleep(img, frame)
    elif action == "yawn": draw_yawn(img, frame)
    elif action == "stretch": draw_stretch(img, frame)
    elif action == "walk": standing_cat(img, phase, "walk")
    elif action == "run": standing_cat(img, phase, "run")
    elif action == "jump": draw_jump(img, frame)
    elif action == "groom_paw": draw_groom(img, frame, "paw")
    elif action == "groom_coat": draw_groom(img, frame, "coat")
    elif action == "scratch_ear": draw_groom(img, frame, "ear")
    elif action == "tail_swish": standing_cat(img, phase * 2, "idle")
    elif action == "rub": draw_rub(img, frame)
    elif action == "drag": draw_drag(img, frame)
    elif action == "belly": draw_belly(img, frame)
    elif action == "look": draw_look(img, frame)
    elif action == "attention": draw_look(img, frame, attention=True)
    elif action == "eat": draw_eat(img, frame)
    elif action == "pounce": draw_pounce(img, frame)
    elif action == "yarn": draw_yarn(img, frame)
    else: raise ValueError(action)
    return img


def main():
    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    total_frames = sum(count for _, count in ACTIONS)
    rows = math.ceil(total_frames / COLUMNS)
    sheet = Image.new("RGBA", (COLUMNS * FRAME, rows * FRAME), (0, 0, 0, 0))
    animations = {}
    index = 0
    for action, count in ACTIONS:
        indices = []
        for frame in range(count):
            sprite = render(action, frame, count)
            col, row = index % COLUMNS, index // COLUMNS
            sheet.alpha_composite(sprite, (col * FRAME, row * FRAME))
            indices.append(index)
            index += 1
        animations[action] = {"frames": indices, "fps": 8 if action in {"walk", "run", "jump", "pounce"} else 5, "loop": action not in {"yawn", "stretch", "jump", "rub", "drag", "belly", "eat", "pounce"}}
    sheet.save(ASSET_DIR / "calico-sprites.png", optimize=True)
    icon = sheet.crop((0, 0, FRAME, FRAME)).resize((256, 256), Image.Resampling.NEAREST)
    icon.save(ASSET_DIR / "calico-icon.ico", format="ICO", sizes=[(64, 64), (128, 128), (256, 256)])
    sprite_map = {"frameWidth": FRAME, "frameHeight": FRAME, "columns": COLUMNS, "rows": rows, "totalFrames": total_frames, "animations": animations}
    (ASSET_DIR / "sprite-map.json").write_text(json.dumps(sprite_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (ASSET_DIR / "sprite-map.js").write_text("window.SPRITE_MAP = " + json.dumps(sprite_map, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    print(f"Generated {index} frames in {sheet.width}x{sheet.height} sprite sheet")


if __name__ == "__main__":
    main()
