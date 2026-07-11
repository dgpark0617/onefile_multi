'use client';

import { useEffect, useRef } from 'react';
import type { BoardCell, LandmarkInfo, GeomShinCallbacks } from './GeomShinScene';

export type PresenceCell = { x: number; y: number; hits: number };

type Props = {
  landmarks: LandmarkInfo[];
  onSelect: (x: number, y: number) => void;
  onViewChange: (v: { x0: number; y0: number; x1: number; y1: number }) => void;
  cells: BoardCell[];
  mySlot: number;
  focus?: { x: number; y: number } | null;
  /** 카메라만 이동 (빨간 파동 없음) */
  pan?: { x: number; y: number } | null;
  presence?: PresenceCell[];
  showHeat?: boolean;
};

type SceneApi = {
  applyCells: (c: BoardCell[]) => void;
  setMySlot: (slot: number) => void;
  focusHome: (x: number, y: number, zoom?: number) => void;
  panTo: (x: number, y: number, zoom?: number) => void;
  applyPresence: (c: PresenceCell[], visible?: boolean) => void;
  setHeatVisible: (v: boolean) => void;
};

export default function PhaserMap({
  landmarks,
  onSelect,
  onViewChange,
  cells,
  mySlot,
  focus,
  pan,
  presence = [],
  showHeat = true,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (remove: boolean) => void } | null>(null);
  const sceneRef = useRef<SceneApi | null>(null);
  const pendingRef = useRef<BoardCell[]>([]);
  const pendingFocus = useRef<{ x: number; y: number } | null>(null);
  const pendingPresence = useRef<PresenceCell[]>([]);
  const mySlotRef = useRef(mySlot);
  const presenceRef = useRef(presence);
  const showHeatRef = useRef(showHeat);
  const focusRef = useRef(focus);
  mySlotRef.current = mySlot;
  presenceRef.current = presence;
  showHeatRef.current = showHeat;
  focusRef.current = focus;
  const cbRef = useRef<GeomShinCallbacks>({ onSelect, onViewChange });
  cbRef.current = { onSelect, onViewChange };

  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    let timer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const { createGeomShinGame } = await import('./GeomShinScene');
      if (cancelled || !hostRef.current) return;
      const game = createGeomShinGame(
        hostRef.current,
        {
          onSelect: (x, y) => cbRef.current.onSelect(x, y),
          onViewChange: (v) => cbRef.current.onViewChange?.(v),
        },
        landmarks,
      );
      gameRef.current = game;

      timer = setInterval(() => {
        tries += 1;
        const scene = game.scene.getScene('GeomShin') as unknown as SceneApi | null;
        if (scene && typeof scene.applyCells === 'function') {
          sceneRef.current = scene;
          // 마운트 시점 클로저(0)가 아니라 최신 slot
          scene.setMySlot?.(mySlotRef.current);
          if (pendingRef.current.length) {
            scene.applyCells(pendingRef.current);
            pendingRef.current = [];
          }
          const heat = pendingPresence.current.length
            ? pendingPresence.current
            : presenceRef.current;
          scene.applyPresence?.(heat, showHeatRef.current);
          pendingPresence.current = [];
          const f = pendingFocus.current || focusRef.current;
          if (f) scene.focusHome?.(f.x, f.y);
          pendingFocus.current = null;
          if (timer) clearInterval(timer);
          timer = null;
        } else if (tries > 100) {
          if (timer) clearInterval(timer);
          timer = null;
        }
      }, 50);
    })();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    sceneRef.current?.setMySlot?.(mySlot);
  }, [mySlot]);

  useEffect(() => {
    if (!focus) return;
    if (sceneRef.current) sceneRef.current.focusHome(focus.x, focus.y);
    else pendingFocus.current = focus;
  }, [focus]);

  useEffect(() => {
    if (!pan) return;
    sceneRef.current?.panTo?.(pan.x, pan.y);
  }, [pan]);

  useEffect(() => {
    if (!cells?.length) return;
    if (sceneRef.current) sceneRef.current.applyCells(cells);
    else pendingRef.current = cells;
  }, [cells]);

  useEffect(() => {
    if (sceneRef.current) sceneRef.current.applyPresence(presence, showHeat);
    else pendingPresence.current = presence;
  }, [presence, showHeat]);

  return <div ref={hostRef} className="gs-phaser-host" />;
}
