import * as Phaser from 'phaser';
import { CELL_PX, GRID_H, GRID_W } from '@/lib/geomshin/config';

export type BoardCell = {
  x: number;
  y: number;
  color: number;
  ownerSlot: number;
  hasAd?: boolean;
};

export type LandmarkInfo = {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type GeomShinCallbacks = {
  onSelect: (x: number, y: number) => void;
  onViewChange?: (v: { x0: number; y0: number; x1: number; y1: number }) => void;
};

type SceneData = {
  callbacks: GeomShinCallbacks;
  landmarks: LandmarkInfo[];
};

const PAPER = '#f1f5f9';
const LANDMARK = '#fbbf24';
const LANDMARK_EDGE = '#92400e';
/** 내 영토 실루엣 외곽 — 순수 검정 (#000), 바깥 변만 */
const MY_BORDER = 0x000000;
const MY_BORDER_CSS = '#000000';
/** Graphics 월드 두께 (얇게) */
const MY_BORDER_W = 1;
/** 맵 캔버스(DETAIL) 기준 외곽 두께 — 1px면 화면에서 가는 선 */
const OUTLINE_DETAIL = 1;
const DETAIL = 4;

export class GeomShinScene extends Phaser.Scene {
  private mapCanvas!: HTMLCanvasElement;
  private mapCtx!: CanvasRenderingContext2D;
  private boardImage!: Phaser.GameObjects.Image;
  private borderGfx!: Phaser.GameObjects.Graphics;
  private heatGfx!: Phaser.GameObjects.Graphics;
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private drag = false;
  private lastX = 0;
  private lastY = 0;
  /** 두 손가락 핀치 줌 (모바일) */
  private pinching = false;
  private pinchStartDist = 0;
  private pinchStartZoom = 1;
  private suppressPick = false;
  private callbacks!: GeomShinCallbacks;
  private landmarks: LandmarkInfo[] = [];
  private viewEmitAt = 0;
  private selMarker!: Phaser.GameObjects.Rectangle;
  private homeBeacon!: Phaser.GameObjects.Arc;
  private homePulse!: Phaser.GameObjects.Arc;
  private cellOwner = new Uint32Array(GRID_W * GRID_H);
  private cellColor = new Uint32Array(GRID_W * GRID_H);
  private myCellSet = new Set<number>();
  private mySlot = 0;
  private homeX = -1;
  private homeY = -1;
  private viewBox = { x0: 0, y0: 0, x1: GRID_W - 1, y1: GRID_H - 1 };
  private presenceCells: { x: number; y: number; hits: number }[] = [];
  private showHeat = true;

  constructor() {
    super('GeomShin');
  }

  init(data: SceneData) {
    this.callbacks = data.callbacks;
    this.landmarks = data.landmarks || [];
  }

  create() {
    const tw = GRID_W * DETAIL;
    const th = GRID_H * DETAIL;
    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = tw;
    this.mapCanvas.height = th;
    this.mapCtx = this.mapCanvas.getContext('2d', { willReadFrequently: true })!;
    this.mapCtx.imageSmoothingEnabled = false;
    this.mapCtx.fillStyle = PAPER;
    this.mapCtx.fillRect(0, 0, tw, th);
    for (const lm of this.landmarks) this.paintLandmark(lm);

    if (this.textures.exists('gs-board')) this.textures.remove('gs-board');
    const tex = this.textures.addCanvas('gs-board', this.mapCanvas);
    if (!tex) throw new Error('gs-board texture failed');
    tex.setFilter(Phaser.Textures.FilterMode.NEAREST);

    const scale = CELL_PX / DETAIL;
    this.boardImage = this.add
      .image(0, 0, 'gs-board')
      .setOrigin(0, 0)
      .setScale(scale)
      .setInteractive();

    this.borderGfx = this.add.graphics().setDepth(20).setScrollFactor(1);
    this.heatGfx = this.add.graphics().setDepth(2);
    // 디버그/검증용
    (window as unknown as { __gsScene?: GeomShinScene }).__gsScene = this;

    this.selMarker = this.add
      .rectangle(0, 0, CELL_PX, CELL_PX)
      .setStrokeStyle(2, 0x2563eb)
      .setFillStyle(0x3b82f6, 0.15)
      .setOrigin(0)
      .setVisible(false)
      .setDepth(10);

    this.homeBeacon = this.add
      .circle(0, 0, CELL_PX * 0.9, 0xf43f5e, 0.35)
      .setStrokeStyle(3, 0xf43f5e, 1)
      .setVisible(false)
      .setDepth(8);
    this.homePulse = this.add
      .circle(0, 0, CELL_PX * 1.6, 0xf43f5e, 0.15)
      .setStrokeStyle(2, 0xf43f5e, 0.8)
      .setVisible(false)
      .setDepth(7);

    this.tweens.add({
      targets: this.homePulse,
      scale: { from: 0.7, to: 1.5 },
      alpha: { from: 0.7, to: 0 },
      duration: 1100,
      repeat: -1,
      ease: 'Sine.easeOut',
    });

    for (const lm of this.landmarks) {
      this.add
        .text((lm.x + lm.w / 2) * CELL_PX, (lm.y + lm.h / 2) * CELL_PX, lm.label, {
          fontSize: '16px',
          color: '#fff7ed',
          fontFamily: 'system-ui, sans-serif',
          stroke: '#78350f',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(5);
    }

    this.cameras.main.setBounds(0, 0, GRID_W * CELL_PX, GRID_H * CELL_PX);
    this.cameras.main.roundPixels = true;
    this.cameras.main.centerOn(80 * CELL_PX, 80 * CELL_PX);
    this.cameras.main.setZoom(1);

    // 기본 1개 + 2개 → 핀치용 멀티터치
    this.input.addPointer(2);

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.downPointerCount() >= 2) {
        this.beginPinch();
        return;
      }
      this.drag = true;
      this.lastX = p.x;
      this.lastY = p.y;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (this.pinching || this.suppressPick) {
        if (this.downPointerCount() < 2) {
          this.pinching = false;
          this.pinchStartDist = 0;
        }
        if (this.downPointerCount() === 0) {
          this.suppressPick = false;
          this.drag = false;
        }
        return;
      }
      const moved = Math.hypot(p.x - this.lastX, p.y - this.lastY);
      this.drag = false;
      if (moved < 8) this.pick(p);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.downPointerCount() >= 2) {
        if (!this.pinching) this.beginPinch();
        this.updatePinch();
        return;
      }
      if (!this.drag || !p.isDown) return;
      this.cameras.main.scrollX -= (p.x - p.prevPosition.x) / this.cameras.main.zoom;
      this.cameras.main.scrollY -= (p.y - p.prevPosition.y) / this.cameras.main.zoom;
    });
    this.input.on(
      'wheel',
      (
        _p: Phaser.Input.Pointer,
        _g: Phaser.GameObjects.GameObject[],
        _dx: number,
        dy: number,
      ) => {
        const mid = { x: _p.x, y: _p.y };
        const z = Phaser.Math.Clamp(this.cameras.main.zoom * (dy > 0 ? 0.9 : 1.1), 0.2, 6);
        this.zoomAtScreen(mid.x, mid.y, z);
      },
    );

    this.cursors = this.input.keyboard?.createCursorKeys();
    this.emitView(true);
  }

  private downPointerCount(): number {
    let n = 0;
    for (const ptr of this.input.manager.pointers) {
      if (ptr.active && ptr.isDown) n += 1;
    }
    return n;
  }

  private twoFingerPointers(): [Phaser.Input.Pointer, Phaser.Input.Pointer] | null {
    const down: Phaser.Input.Pointer[] = [];
    for (const ptr of this.input.manager.pointers) {
      if (ptr.active && ptr.isDown) down.push(ptr);
      if (down.length >= 2) break;
    }
    if (down.length < 2) return null;
    return [down[0], down[1]];
  }

  private beginPinch() {
    this.pinching = true;
    this.suppressPick = true;
    this.drag = false;
    const pair = this.twoFingerPointers();
    if (!pair) return;
    this.pinchStartDist = Phaser.Math.Distance.Between(pair[0].x, pair[0].y, pair[1].x, pair[1].y);
    this.pinchStartZoom = this.cameras.main.zoom;
  }

  private updatePinch() {
    const pair = this.twoFingerPointers();
    if (!pair || this.pinchStartDist <= 0) return;
    const dist = Phaser.Math.Distance.Between(pair[0].x, pair[0].y, pair[1].x, pair[1].y);
    if (dist <= 0) return;
    const midX = (pair[0].x + pair[1].x) / 2;
    const midY = (pair[0].y + pair[1].y) / 2;
    const z = Phaser.Math.Clamp(this.pinchStartZoom * (dist / this.pinchStartDist), 0.2, 6);
    this.zoomAtScreen(midX, midY, z);
  }

  /** 화면 좌표(sx,sy) 아래 월드 지점을 고정한 채 줌 */
  private zoomAtScreen(sx: number, sy: number, zoom: number) {
    const cam = this.cameras.main;
    const before = cam.getWorldPoint(sx, sy);
    cam.setZoom(zoom);
    const after = cam.getWorldPoint(sx, sy);
    cam.scrollX += before.x - after.x;
    cam.scrollY += before.y - after.y;
    this.emitView(false);
  }

  /** HUD 등에서 호출 — 화면 중앙 기준 줌 */
  adjustZoom(factor: number) {
    const cam = this.cameras.main;
    const z = Phaser.Math.Clamp(cam.zoom * factor, 0.2, 6);
    this.zoomAtScreen(cam.width / 2, cam.height / 2, z);
  }

  setMySlot(slot: number) {
    this.mySlot = Number(slot) || 0;
    this.myCellSet.clear();
    if (this.mySlot > 0) {
      for (let i = 0; i < this.cellOwner.length; i++) {
        if (this.cellOwner[i] === this.mySlot) this.myCellSet.add(i);
      }
    }
    this.redrawMyBorder();
  }

  private isMine(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return false;
    if (this.mySlot <= 0) return false;
    return this.cellOwner[y * GRID_W + x] === this.mySlot;
  }

  /** B2B 체류 밀집도 히트맵 (주황 반투명) */
  applyPresence(cells: { x: number; y: number; hits: number }[], visible = true) {
    this.presenceCells = cells || [];
    this.showHeat = visible;
    this.redrawHeat();
  }

  setHeatVisible(visible: boolean) {
    this.showHeat = visible;
    this.redrawHeat();
  }

  private redrawHeat() {
    if (!this.heatGfx) return;
    this.heatGfx.clear();
    if (!this.showHeat || !this.presenceCells.length) return;
    const maxHits = Math.max(1, ...this.presenceCells.map((c) => c.hits));
    for (const c of this.presenceCells) {
      if (c.x < 0 || c.y < 0) continue;
      const t = Math.min(1, c.hits / maxHits);
      const alpha = 0.2 + t * 0.55;
      this.heatGfx.fillStyle(0xf97316, alpha);
      this.heatGfx.fillRect(c.x * CELL_PX, c.y * CELL_PX, CELL_PX, CELL_PX);
      this.heatGfx.lineStyle(1, 0xea580c, 0.7);
      this.heatGfx.strokeRect(c.x * CELL_PX + 0.5, c.y * CELL_PX + 0.5, CELL_PX - 1, CELL_PX - 1);
    }
  }

  /** 시작점 비콘 + 카메라 이동 */
  focusHome(x: number, y: number, zoom = 1.4) {
    if (x < 0 || y < 0) return;
    this.homeX = x;
    this.homeY = y;
    const cx = (x + 0.5) * CELL_PX;
    const cy = (y + 0.5) * CELL_PX;
    this.homeBeacon.setPosition(cx, cy).setVisible(true);
    this.homePulse.setPosition(cx, cy).setVisible(true).setScale(1).setAlpha(0.7);
    this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(cx, cy);
    this.emitView(true);
  }

  /** 카메라만 이동 (GPS 등 — 빨간 파동 유지/변경 없음) */
  panTo(x: number, y: number, zoom?: number) {
    if (x < 0 || y < 0) return;
    const cx = (x + 0.5) * CELL_PX;
    const cy = (y + 0.5) * CELL_PX;
    if (zoom != null) this.cameras.main.setZoom(zoom);
    this.cameras.main.centerOn(cx, cy);
    this.emitView(true);
  }

  private paintLandmark(lm: LandmarkInfo) {
    for (let dy = 0; dy < lm.h; dy++) {
      for (let dx = 0; dx < lm.w; dx++) {
        const x = lm.x + dx;
        const y = lm.y + dy;
        if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) continue;
        const px = x * DETAIL;
        const py = y * DETAIL;
        this.mapCtx.fillStyle = LANDMARK;
        this.mapCtx.fillRect(px, py, DETAIL, DETAIL);
        this.mapCtx.strokeStyle = LANDMARK_EDGE;
        this.mapCtx.lineWidth = 1;
        this.mapCtx.strokeRect(px + 0.5, py + 0.5, DETAIL - 1, DETAIL - 1);
      }
    }
  }

  private paintOwned(x: number, y: number, color: number, hasAd?: boolean) {
    const px = x * DETAIL;
    const py = y * DETAIL;
    const col = color >>> 0;
    let r = (col >> 16) & 255;
    let g = (col >> 8) & 255;
    let b = col & 255;
    if (hasAd) r = Math.min(255, r + 40);
    this.mapCtx.fillStyle = `rgb(${r},${g},${b})`;
    this.mapCtx.fillRect(px, py, DETAIL, DETAIL);
  }

  private paintEmpty(x: number, y: number) {
    this.mapCtx.fillStyle = PAPER;
    this.mapCtx.fillRect(x * DETAIL, y * DETAIL, DETAIL, DETAIL);
  }

  private ownerAt(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return -1;
    return this.cellOwner[y * GRID_W + x];
  }

  /**
   * 내 영토 실루엣 외곽선만 (검정 #000)
   * - 맵 캔버스에 직접 베이크 + Graphics 오버레이 (이중)
   * - 타일마다 네모칸 X, 바깥으로 노출된 변만
   */
  private redrawMyBorder() {
    if (this.borderGfx) this.borderGfx.clear();
    if (this.mySlot <= 0) return;

    const { x0, y0, x1, y1 } = this.viewBox;
    const minX = Math.max(0, x0 - 2);
    const maxX = Math.min(GRID_W - 1, x1 + 2);
    const minY = Math.max(0, y0 - 2);
    const maxY = Math.min(GRID_H - 1, y1 + 2);
    const ow = OUTLINE_DETAIL;
    const gw = MY_BORDER_W;
    let edged = 0;

    // 1) 뷰포트 내 내 칸·이웃 재칠하기 (이전 외곽 잔상 제거)
    if (this.mapCtx) {
      for (let y = Math.max(0, minY - 1); y <= Math.min(GRID_H - 1, maxY + 1); y++) {
        for (let x = Math.max(0, minX - 1); x <= Math.min(GRID_W - 1, maxX + 1); x++) {
          const i = y * GRID_W + x;
          const owner = this.cellOwner[i];
          if (owner === 0) this.paintEmpty(x, y);
          else this.paintOwned(x, y, this.cellColor[i] || 0x64748b, false);
        }
      }
      for (const lm of this.landmarks) this.paintLandmark(lm);

      // 2) 캔버스에 검정 실루엣 외곽
      this.mapCtx.fillStyle = MY_BORDER_CSS;
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (!this.isMine(x, y)) continue;
          const px = x * DETAIL;
          const py = y * DETAIL;
          if (!this.isMine(x, y - 1)) {
            this.mapCtx.fillRect(px, py - ow, DETAIL, ow);
            edged++;
          }
          if (!this.isMine(x, y + 1)) {
            this.mapCtx.fillRect(px, py + DETAIL, DETAIL, ow);
            edged++;
          }
          if (!this.isMine(x - 1, y)) {
            this.mapCtx.fillRect(px - ow, py, ow, DETAIL);
            edged++;
          }
          if (!this.isMine(x + 1, y)) {
            this.mapCtx.fillRect(px + DETAIL, py, ow, DETAIL);
            edged++;
          }
        }
      }
      const canvasTex = this.textures.get('gs-board') as Phaser.Textures.CanvasTexture;
      if (canvasTex) {
        canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
        canvasTex.refresh();
      }
    }

    // 3) Graphics 오버레이 (추가 대비)
    if (this.borderGfx) {
      this.borderGfx.fillStyle(MY_BORDER, 1);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          if (!this.isMine(x, y)) continue;
          const wx = x * CELL_PX;
          const wy = y * CELL_PX;
          if (!this.isMine(x, y - 1)) this.borderGfx.fillRect(wx, wy - gw, CELL_PX, gw);
          if (!this.isMine(x, y + 1)) this.borderGfx.fillRect(wx, wy + CELL_PX, CELL_PX, gw);
          if (!this.isMine(x - 1, y)) this.borderGfx.fillRect(wx - gw, wy, gw, CELL_PX);
          if (!this.isMine(x + 1, y)) this.borderGfx.fillRect(wx + CELL_PX, wy, gw, CELL_PX);
        }
      }
    }

    (window as unknown as { __gsBorderDebug?: object }).__gsBorderDebug = {
      mySlot: this.mySlot,
      myCells: this.myCellSet.size,
      edged,
      view: { minX, maxX, minY, maxY },
    };
  }

  update() {
    const cam = this.cameras.main;
    const speed = 8 / cam.zoom;
    if (this.cursors?.left?.isDown) cam.scrollX -= speed;
    if (this.cursors?.right?.isDown) cam.scrollX += speed;
    if (this.cursors?.up?.isDown) cam.scrollY -= speed;
    if (this.cursors?.down?.isDown) cam.scrollY += speed;
    if (this.time.now > this.viewEmitAt) {
      this.viewEmitAt = this.time.now + 900;
      this.emitView(false);
    }
  }

  private pick(p: Phaser.Input.Pointer) {
    const world = this.cameras.main.getWorldPoint(p.x, p.y);
    const x = Math.floor(world.x / CELL_PX);
    const y = Math.floor(world.y / CELL_PX);
    if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return;
    this.selMarker.setPosition(x * CELL_PX, y * CELL_PX).setVisible(true);
    this.callbacks.onSelect(x, y);
  }

  private emitView(force: boolean) {
    if (!this.callbacks.onViewChange) return;
    const cam = this.cameras.main;
    const w = cam.width / cam.zoom;
    const h = cam.height / cam.zoom;
    const x0 = Math.floor(cam.scrollX / CELL_PX) - 2;
    const y0 = Math.floor(cam.scrollY / CELL_PX) - 2;
    const x1 = Math.ceil((cam.scrollX + w) / CELL_PX) + 2;
    const y1 = Math.ceil((cam.scrollY + h) / CELL_PX) + 2;
    const next = { x0, y0, x1, y1 };
    const prev = this.viewBox;
    const moved =
      force ||
      Math.abs(prev.x0 - next.x0) > 2 ||
      Math.abs(prev.y0 - next.y0) > 2 ||
      Math.abs(prev.x1 - next.x1) > 2 ||
      Math.abs(prev.y1 - next.y1) > 2;
    this.viewBox = next;
    this.redrawMyBorder();
    if (moved) this.callbacks.onViewChange(next);
  }

  applyCells(cells: BoardCell[]) {
    if (!this.mapCtx) return;
    for (const c of cells) {
      const i = c.y * GRID_W + c.x;
      const owner = Number(c.ownerSlot) || 0;
      this.cellOwner[i] = owner;
      this.cellColor[i] = (c.color >>> 0) || 0;
      if (this.mySlot > 0) {
        if (owner === this.mySlot) this.myCellSet.add(i);
        else this.myCellSet.delete(i);
      } else if (owner === 0) {
        this.myCellSet.delete(i);
      }
      if (owner === 0 && !c.hasAd) this.paintEmpty(c.x, c.y);
      else this.paintOwned(c.x, c.y, c.color, c.hasAd);
    }
    for (const lm of this.landmarks) this.paintLandmark(lm);
    const canvasTex = this.textures.get('gs-board') as Phaser.Textures.CanvasTexture;
    canvasTex.setFilter(Phaser.Textures.FilterMode.NEAREST);
    canvasTex.refresh();
    this.redrawMyBorder();
  }
}

export function createGeomShinGame(
  parent: HTMLElement,
  callbacks: GeomShinCallbacks,
  landmarks: LandmarkInfo[],
): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent,
    backgroundColor: '#334155',
    antialias: false,
    roundPixels: true,
    input: {
      activePointers: 3,
    },
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: parent.clientWidth || 800,
      height: parent.clientHeight || 600,
    },
  });
  game.scene.add('GeomShin', GeomShinScene, true, { callbacks, landmarks });
  return game;
}
