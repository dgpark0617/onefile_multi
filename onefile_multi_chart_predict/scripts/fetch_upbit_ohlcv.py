#!/usr/bin/env python3
"""Fetch Upbit BTC/KRW 1h OHLCV via ccxt and write data/btc_krw_1h.json."""
import json
import sys
from pathlib import Path

try:
    import ccxt
except ImportError:
    print("ccxt not installed. Run: pip install ccxt", file=sys.stderr)
    sys.exit(1)

OUT = Path(__file__).resolve().parent.parent / "data" / "btc_krw_1h.json"


def main() -> None:
    ex = ccxt.upbit({"enableRateLimit": True})
    symbol = "BTC/KRW"
    tf = "1h"
    since = ex.parse8601("2022-01-01T00:00:00Z")
    all_rows: list[dict] = []
    seen: set[int] = set()

    while True:
        batch = ex.fetch_ohlcv(symbol, tf, since=since, limit=200)
        if not batch:
            break
        for row in batch:
            ts = int(row[0])
            if ts in seen:
                continue
            seen.add(ts)
            all_rows.append(
                {
                    "t": ts,
                    "o": row[1],
                    "h": row[2],
                    "l": row[3],
                    "c": row[4],
                    "v": row[5],
                }
            )
        since = int(batch[-1][0]) + 3_600_000
        print(f"  ... {len(all_rows)} candles")
        if len(batch) < 200:
            break

    all_rows.sort(key=lambda x: x["t"])
    payload = {
        "symbol": symbol,
        "timeframe": tf,
        "exchange": "upbit",
        "candles": all_rows,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(all_rows)} candles -> {OUT}")


if __name__ == "__main__":
    main()
