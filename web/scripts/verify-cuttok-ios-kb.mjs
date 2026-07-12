/**
 * iOS Safari 키보드 모델 검증:
 * layout(innerHeight)은 유지, visualViewport.height만 줄어든 상태에서
 * 최신 컷이 독 위에 보이는지 측정한다.
 *
 * Usage:
 *   node scripts/verify-cuttok-ios-kb.mjs [baseUrl]
 */
import { chromium } from 'playwright';

const BASE = process.argv[2] || 'http://127.0.0.1:3000';
const KB = 320;
const URL = `${BASE}/cuttok?demo=1&simKb=${KB}`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);

  console.log('open', URL);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForSelector('.cc-root.cc-mobile-main');
  await page.waitForSelector('.cc-panel');
  await page.waitForTimeout(800);

  const result = await page.evaluate(() => {
    const root = document.querySelector('.cc-root');
    const strip = document.querySelector('.cc-strip');
    const dock = document.querySelector('.cc-dock');
    const panels = document.querySelectorAll('.cc-panel');
    const last = panels[panels.length - 1];
    if (!root || !strip || !dock || !last) {
      return { ok: false, error: 'missing DOM' };
    }

    const cs = getComputedStyle(root);
    const vvH = parseFloat(cs.getPropertyValue('--cc-vv-height')) || 0;
    const kb = parseFloat(cs.getPropertyValue('--cc-kb')) || 0;
    const rootH = root.getBoundingClientRect().height;
    const dockR = dock.getBoundingClientRect();
    const panelR = last.getBoundingClientRect();
    const stripR = strip.getBoundingClientRect();
    const layoutH = window.innerHeight;
    const visualH = window.visualViewport?.height ?? layoutH;

    // 최신 컷 하단이 독 상단(=키보드 위 가시 영역) 이하인지
    const slack = 6;
    const visibleBottom = Math.min(stripR.bottom, dockR.top);
    const latestVisible = panelR.bottom <= visibleBottom + slack;

    // 루트가 visualViewport 높이에 맞춰졌는지
    const rootMatchesVv = Math.abs(rootH - visualH) <= 8 || Math.abs(rootH - vvH) <= 8;

    // 독이 루트 안에 있는지 (키보드 영역에 파묻히지 않음)
    const dockInStage = dockR.bottom <= root.getBoundingClientRect().bottom + slack;

    return {
      ok: latestVisible && rootMatchesVv && dockInStage && kb >= 200,
      latestVisible,
      rootMatchesVv,
      dockInStage,
      metrics: {
        layoutH,
        visualH,
        vvH,
        kb,
        rootH,
        panelBottom: panelR.bottom,
        dockTop: dockR.top,
        visibleBottom,
        stripBottom: stripR.bottom,
      },
    };
  });

  await page.screenshot({
    path: 'scripts/cuttok-ios-kb-verify.png',
    fullPage: false,
  });

  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (!result.ok) {
    console.error('FAIL: latest cut still hidden or chrome metrics wrong');
    process.exit(1);
  }
  console.log('PASS: latest cut visible above dock under iOS keyboard sim');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
