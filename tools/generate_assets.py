#!/usr/bin/env python3
"""
아이소메트릭 게임 에셋 생성기 (v1)
- 실행: python3 tools/generate_assets.py
- 출력: images/game/*.png
- 에셋을 수정하고 싶으면 이 파일의 색상/파라미터만 바꾸고 다시 실행하면 됩니다.
"""
import os, random
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), '..', 'images', 'game')
os.makedirs(OUT, exist_ok=True)
random.seed(42)

TILE_W, TILE_H = 128, 64  # 마름모 타일 크기 (게임 좌표계와 동일)


def diamond(draw, cx, cy, w, h, fill, outline=None):
    pts = [(cx, cy - h // 2), (cx + w // 2, cy), (cx, cy + h // 2), (cx - w // 2, cy)]
    draw.polygon(pts, fill=fill, outline=outline)
    return pts


# ---------------------------------------------------------------- 바닥 타일
def make_ground_tile(name, base, speckles, edge):
    img = Image.new('RGBA', (TILE_W, TILE_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    diamond(d, TILE_W // 2, TILE_H // 2, TILE_W - 2, TILE_H - 2, base)
    # 질감 점
    for _ in range(26):
        x = random.randint(8, TILE_W - 8)
        y = random.randint(4, TILE_H - 4)
        # 마름모 내부 판정
        if abs(x - TILE_W / 2) / (TILE_W / 2) + abs(y - TILE_H / 2) / (TILE_H / 2) < 0.86:
            c = random.choice(speckles)
            d.ellipse([x, y, x + 2, y + 2], fill=c)
    # 아래쪽 모서리 살짝 어둡게 (입체감)
    d.line([(TILE_W // 2, TILE_H - 2), (TILE_W - 2, TILE_H // 2)], fill=edge, width=2)
    d.line([(2, TILE_H // 2), (TILE_W // 2, TILE_H - 2)], fill=edge, width=2)
    img.save(os.path.join(OUT, name))


make_ground_tile('tile_grass_a.png', (124, 181, 91, 255),
                 [(108, 165, 76, 255), (140, 196, 106, 255), (98, 152, 70, 255)],
                 (96, 146, 68, 255))
make_ground_tile('tile_grass_b.png', (118, 175, 86, 255),
                 [(104, 160, 72, 255), (134, 190, 100, 255)],
                 (92, 140, 64, 255))
make_ground_tile('tile_path.png', (216, 192, 138, 255),
                 [(200, 176, 122, 255), (228, 206, 156, 255), (190, 166, 112, 255)],
                 (178, 154, 102, 255))


# ---------------------------------------------------------------- 나무 / 바위
def make_tree():
    w, h = 96, 148
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 그림자
    d.ellipse([w // 2 - 30, h - 20, w // 2 + 30, h - 4], fill=(0, 0, 0, 45))
    # 몸통
    d.rounded_rectangle([w // 2 - 7, h - 52, w // 2 + 7, h - 10], 4, fill=(122, 88, 58, 255))
    # 잎 (3단 블롭)
    greens = [(72, 138, 78, 255), (88, 158, 92, 255), (104, 176, 106, 255)]
    d.ellipse([10, 44, 86, 108], fill=greens[0])
    d.ellipse([18, 22, 78, 82], fill=greens[1])
    d.ellipse([28, 8, 68, 56], fill=greens[2])
    # 하이라이트 점
    for _ in range(8):
        x = random.randint(24, 72); y = random.randint(16, 92)
        d.ellipse([x, y, x + 3, y + 3], fill=(198, 226, 170, 160))
    img.save(os.path.join(OUT, 'tree.png'))


def make_rock():
    w, h = 72, 52
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([8, h - 16, w - 8, h - 2], fill=(0, 0, 0, 40))
    d.ellipse([8, 8, w - 8, h - 6], fill=(158, 158, 150, 255))
    d.ellipse([16, 12, w - 26, h - 18], fill=(178, 178, 170, 255))
    img.save(os.path.join(OUT, 'rock.png'))


make_tree()
make_rock()


# ---------------------------------------------------------------- 건물 (2x2 타일 점유, 7종)
def make_building(name, roof, wall_l, wall_r, deco=None, wall_h=92):
    """아이소메트릭 박스: 윗면(지붕) + 왼쪽/오른쪽 벽. 발자국 2x2 타일.
    deco: chimney | antenna | flag | postbox | banner | books | None
    """
    fw = TILE_W * 2          # 바닥 마름모 폭 (2타일)
    fh = TILE_H * 2          # 바닥 마름모 높이
    extra_top = 70 if deco in ('antenna', 'flag') else 26
    w, h = fw, fh + wall_h + extra_top
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = w // 2
    oy = extra_top                       # 위 여백 (장식용)
    top_cy = oy + fh // 2                # 지붕 마름모 중심 y
    floor_y = oy + fh                    # 지붕 마름모 하단 꼭짓점 y
    L, R = (0, top_cy), (w, top_cy)
    # 벽
    d.polygon([L, (cx, floor_y), (cx, floor_y + wall_h), (0, top_cy + wall_h)], fill=wall_l)
    d.polygon([R, (cx, floor_y), (cx, floor_y + wall_h), (w, top_cy + wall_h)], fill=wall_r)
    # 지붕
    diamond(d, cx, top_cy, fw - 2, fh - 2, roof)
    d.line([L, (cx, floor_y), R], fill=(0, 0, 0, 60), width=2)
    # 문 (오른쪽 벽 중앙)
    dx = cx + fw // 4
    dy = top_cy + wall_h // 2 + fh // 4
    d.polygon([(dx - 16, dy - 2), (dx + 16, dy - 18), (dx + 16, dy + 26), (dx - 16, dy + 42)],
              fill=(94, 68, 46, 255))
    # 창문 (왼쪽 벽)
    wx = cx - fw // 4
    wy = top_cy + wall_h // 2 + fh // 4 - 14
    d.polygon([(wx - 14, wy + 2), (wx + 14, wy - 12), (wx + 14, wy + 16), (wx - 14, wy + 30)],
              fill=(178, 216, 232, 255), outline=(255, 255, 255, 200))

    # ---- 장식 ----
    roof_top = (cx, oy)                          # 지붕 꼭대기 점
    dark = tuple(max(0, c - 40) for c in roof[:3]) + (255,)
    if deco == 'chimney':
        bx = cx - fw // 4
        d.polygon([(bx - 12, oy + 18), (bx + 12, oy + 6), (bx + 12, oy - 26), (bx - 12, oy - 14)],
                  fill=(150, 96, 72, 255))
        d.ellipse([bx - 13, oy - 32, bx + 13, oy - 12], fill=(120, 76, 56, 255))
    elif deco == 'antenna':
        d.line([roof_top, (cx, oy - 52)], fill=(90, 90, 96, 255), width=5)
        d.line([(cx - 16, oy - 34), (cx + 16, oy - 46)], fill=(90, 90, 96, 255), width=4)
        d.ellipse([cx - 6, oy - 64, cx + 6, oy - 52], fill=(226, 88, 74, 255))
    elif deco == 'flag':
        d.line([roof_top, (cx, oy - 50)], fill=(120, 120, 126, 255), width=4)
        d.polygon([(cx + 2, oy - 50), (cx + 40, oy - 42), (cx + 2, oy - 32)],
                  fill=(63, 124, 79, 255))
    elif deco == 'postbox':
        px_, py_ = cx + fw // 4 + 42, top_cy + wall_h + fh // 4 - 6
        d.rectangle([px_ - 10, py_ - 34, px_ + 10, py_], fill=(214, 78, 62, 255))
        d.ellipse([px_ - 10, py_ - 44, px_ + 10, py_ - 24], fill=(230, 96, 80, 255))
        d.rectangle([px_ - 6, py_ - 36, px_ + 6, py_ - 32], fill=(60, 40, 34, 255))
    elif deco == 'banner':
        # 오른쪽 벽 상단 간판 띠
        d.polygon([(cx + 8, floor_y + 6), (w - 8, top_cy + 14),
                   (w - 8, top_cy + 34), (cx + 8, floor_y + 26)], fill=dark)
    elif deco == 'books':
        # 지붕 위 책 더미
        for i, col_ in enumerate([(214, 118, 86, 255), (63, 124, 79, 255), (201, 138, 45, 255)]):
            d.polygon([(cx - 26, oy + 12 - i * 12), (cx + 26, oy - i * 12),
                       (cx + 26, oy - 10 - i * 12), (cx - 26, oy + 2 - i * 12)], fill=col_)
    img.save(os.path.join(OUT, name))


PALETTE = {
    'cream':  ((236, 226, 204, 255), (210, 198, 172, 255)),
    'white':  ((242, 240, 234, 255), (216, 212, 202, 255)),
    'yellow': ((240, 212, 150, 255), (214, 186, 124, 255)),
    'brick':  ((206, 140, 108, 255), (182, 118, 88, 255)),
    'wood':   ((188, 148, 108, 255), (162, 124, 88, 255)),
    'gray':   ((216, 218, 222, 255), (190, 192, 198, 255)),
}

# 7개 건물
make_building('bld_house.png',   (214, 108, 84, 255),  *PALETTE['yellow'], deco='chimney')   # 지영의 집
make_building('bld_school.png',  (108, 138, 182, 255), *PALETTE['white'],  deco='flag')      # 학교
make_building('bld_chunjae.png', (196, 92, 74, 255),   *PALETTE['brick'],  deco='banner')    # 천재교과서
make_building('bld_ebs.png',     (74, 96, 134, 255),   *PALETTE['gray'],   deco='antenna')   # EBS
make_building('bld_studio.png',  (108, 92, 76, 255),   *PALETTE['wood'],   deco=None)        # 작업실
make_building('bld_archive.png', (96, 146, 104, 255),  *PALETTE['cream'],  deco='books')     # 성장 기록관
make_building('bld_post.png',    (222, 96, 80, 255),   *PALETTE['white'],  deco='postbox')   # 우체국


# ---------------------------------------------------------------- 캐릭터 스프라이트
# 16x24 픽셀 그리드를 5배 확대 → 셀 80x120, 시트 3열(프레임) x 4행(방향)
PX = 5
CW, CH = 16 * PX, 24 * PX
HAIR = (74, 52, 40, 255)      # 다크브라운 단발
SKIN = (245, 214, 189, 255)
TOP = (63, 124, 79, 255)      # 초록 상의 (마을 팔레트)
PANTS = (52, 66, 92, 255)     # 네이비 하의
SHOE = (92, 74, 58, 255)
EYE = (40, 34, 30, 255)


def px(d, gx, gy, c, w=1, h=1):
    d.rectangle([gx * PX, gy * PX, (gx + w) * PX - 1, (gy + h) * PX - 1], fill=c)


def draw_char(direction, frame):
    """direction: down/left/right/up, frame: 0 idle, 1/2 walk"""
    img = Image.new('RGBA', (CW, CH), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lift = {0: (0, 0), 1: (1, 0), 2: (0, 1)}[frame]  # 걷기: 왼발/오른발 교차

    # 다리
    ly = 18
    px(d, 5, ly - lift[0], PANTS, 2, 4 + lift[0] - 0)
    px(d, 9, ly - lift[1], PANTS, 2, 4 + lift[1] - 0)
    px(d, 5, 22 - lift[0], SHOE, 2, 1)
    px(d, 9, 22 - lift[1], SHOE, 2, 1)
    # 몸통
    px(d, 4, 12, TOP, 8, 6)
    # 팔
    arm_sw = {0: 0, 1: 1, 2: -1}[frame]
    px(d, 3, 13 + max(0, arm_sw), TOP, 1, 4)
    px(d, 12, 13 + max(0, -arm_sw), TOP, 1, 4)
    px(d, 3, 17 + max(0, arm_sw), SKIN, 1, 1)
    px(d, 12, 17 + max(0, -arm_sw), SKIN, 1, 1)
    # 머리 (피부 + 머리카락)
    px(d, 4, 3, SKIN, 8, 9)
    if direction == 'down':
        px(d, 3, 1, HAIR, 10, 4)          # 앞머리
        px(d, 3, 5, HAIR, 1, 6); px(d, 12, 5, HAIR, 1, 6)  # 옆머리
        px(d, 6, 7, EYE, 1, 1); px(d, 9, 7, EYE, 1, 1)     # 눈
        px(d, 7, 9, (222, 148, 138, 255), 2, 1)            # 입
    elif direction == 'up':
        px(d, 3, 1, HAIR, 10, 9)          # 뒤통수 전체
    else:  # side (left 기준으로 그리고 right는 미러)
        px(d, 3, 1, HAIR, 10, 4)
        px(d, 11, 4, HAIR, 2, 7)          # 뒷머리
        px(d, 5, 7, EYE, 1, 1)            # 옆 눈
        px(d, 4, 9, (222, 148, 138, 255), 1, 1)
    return img


def make_character_sheet():
    dirs = ['down', 'left', 'right', 'up']
    sheet = Image.new('RGBA', (CW * 3, CH * 4), (0, 0, 0, 0))
    for r, direction in enumerate(dirs):
        for f in range(3):
            base = 'left' if direction in ('left', 'right') else direction
            im = draw_char(base, f)
            if direction == 'right':
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            sheet.paste(im, (f * CW, r * CH))
    sheet.save(os.path.join(OUT, 'character.png'))
    print('character sheet:', sheet.size, '(cell %dx%d)' % (CW, CH))


make_character_sheet()
print('완료:', sorted(os.listdir(OUT)))
