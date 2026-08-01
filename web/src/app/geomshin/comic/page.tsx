import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** 예전 잘못 붙인 경로 → 독립 서비스로 이동 */
export default function GeomShinComicRedirect() {
  redirect('/cuttok');
}
