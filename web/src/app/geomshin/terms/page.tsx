import { TERMS } from '@/lib/geomshin/terms';
import '../geomshin.css';
import GeomShinNav from '../GeomShinNav';

export default function TermsPage() {
  return (
    <main className="gs-panel">
      <h1>{TERMS.brand} 이용 안내</h1>
      <GeomShinNav current="/geomshin/terms" />
      <p>
        본 서비스는 검단신도시 지역 소통을 위한 <strong>참여형 커뮤니티 전광판</strong>입니다.
        픽셀 잉크·수정 권한·덮어쓰기·쿨타임 용어를 사용합니다.
      </p>
      <ul>
        <li>특정 업체 비방, 음란물, 혐오 표현 금지</li>
        <li>신고된 좌표는 관리자가 즉시 초기화·차단할 수 있습니다</li>
        <li>지도는 추상 격자이며 네이버/카카오 지도를 사용하지 않습니다</li>
        <li>개인 간 광고권 거래는 이용자 책임이며, 플랫폼은 중개하지 않습니다</li>
        <li>위치 정보는 현장 버프·B2B 체류 집계(스텁)에만 사용합니다</li>
      </ul>
    </main>
  );
}
