'use client';

import { useRef, useState } from 'react';
import { compressPortrait } from '@/lib/comicchat/photoCompress';
import { BUILTIN_PACK_IDS } from '@/lib/comicchat/packRegistry';
import { CHARACTERS, type CharLook } from '@/lib/comicchat/types';
import ComicAvatar from './ComicAvatar';

type Props = {
  look: CharLook;
  onChange: (look: CharLook) => void;
};

export default function CharacterEditor({ look, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');

  const set = <K extends keyof CharLook>(key: K, value: CharLook[K]) => {
    onChange({ ...look, [key]: value });
  };

  const pickPack = (packId: string) => {
    setPhotoErr('');
    onChange({
      name: look.name,
      packId,
    });
  };

  const onPhotoPick = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoErr('');
    try {
      const photoUrl = await compressPortrait(file);
      onChange({
        name: look.name,
        packId: 'photo',
        photoUrl,
      });
    } catch (e) {
      setPhotoErr(e instanceof Error ? e.message : '사진 처리 실패');
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="cc-editor">
      <div className="cc-editor-preview">
        <ComicAvatar look={look} emotion="happy" pose="wave" nick={look.name} size={96} framing="bust" />
        <label className="cc-field">
          이름
          <input
            value={look.name}
            maxLength={8}
            onChange={(e) => set('name', e.target.value.slice(0, 8))}
          />
        </label>
      </div>

      <div className="cc-editor-row">
        <span>캐릭터 팩</span>
        <div className="cc-chip-row">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`cc-wheel-btn${look.packId === c.packId ? ' active' : ''}`}
              onClick={() => pickPack(c.packId)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="cc-editor-row cc-editor-photo">
        <span>실사 사진</span>
        <div className="cc-chip-row">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            hidden
            onChange={(e) => onPhotoPick(e.target.files?.[0])}
          />
          <button
            type="button"
            className={`cc-wheel-btn${look.packId === 'photo' ? ' active' : ''}`}
            disabled={photoBusy}
            onClick={() => fileRef.current?.click()}
          >
            {photoBusy ? '처리 중…' : '사진 업로드'}
          </button>
          {look.packId === 'photo' && look.photoUrl ? (
            <button
              type="button"
              className="cc-wheel-btn"
              onClick={() => pickPack(BUILTIN_PACK_IDS[0])}
            >
              팩으로 되돌리기
            </button>
          ) : null}
        </div>
        <p className="cc-editor-hint">
          멋진 실사 초상도 가능합니다. 입장 시 1회만 전송되며, 좌우는 자동으로 마주보도록
          뒤집습니다.
        </p>
        {photoErr ? <p className="cc-editor-error">{photoErr}</p> : null}
      </div>
    </div>
  );
}
