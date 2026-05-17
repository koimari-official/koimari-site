#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
investment_widget 用データ取得スクリプト
Yahoo Finance から基準価額・為替レートを取得して data.json に保存します。

使い方:
  python fetch_data.py       # 通常実行
  python fetch_data.py --loop  # 15分ごとに自動更新（Ctrl+C で停止）
"""

import json
import sys
import time
import ssl
import http.cookiejar
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# ── 出力先 ─────────────────────────────────────────────────────────────────
OUTPUT_FILE = Path(__file__).parent / "data.json"

# ── Yahoo Finance ティッカー ─────────────────────────────────────────────────
TICKERS = {
    "sp500": "0331418A.T",   # eMAXIS Slim 米国株式（S&P500）
    "orcan": "0331120A.T",   # eMAXIS Slim 全世界株式（オール・カントリー）
    "fx":    "USDJPY=X",     # USD/JPY
}

# ── HTTPクライアント（Cookie付きブラウザ偽装）───────────────────────────────
def make_opener():
    jar = http.cookiejar.CookieJar()
    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(jar),
        urllib.request.HTTPSHandler(context=ctx),
    )
    opener.addheaders = [
        ("User-Agent",
         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
         "AppleWebKit/537.36 (KHTML, like Gecko) "
         "Chrome/124.0.0.0 Safari/537.36"),
        ("Accept",          "application/json, text/plain, */*"),
        ("Accept-Language", "ja-JP,ja;q=0.9,en-US;q=0.8"),
        ("Referer",         "https://finance.yahoo.com/"),
        ("Origin",          "https://finance.yahoo.com"),
    ]
    return opener

OPENER = make_opener()

def fetch_chart(ticker: str, range_: str = "3mo", interval: str = "1d") -> dict:
    """Yahoo Finance v8 chart API からデータ取得"""
    url = (
        f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker}"
        f"?interval={interval}&range={range_}&includePrePost=false"
    )
    try:
        with OPENER.open(url, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        # 403 の場合は query1 に切り替え
        if e.code == 403:
            url2 = url.replace("query2", "query1")
            with OPENER.open(url2, timeout=15) as resp:
                return json.loads(resp.read())
        raise

def parse_result(data: dict, key: str) -> dict:
    """Yahoo Finance レスポンスをウィジェット用フォーマットに変換"""
    result = data["chart"]["result"][0]
    meta   = result["meta"]

    price  = meta.get("regularMarketPrice")
    prev   = meta.get("previousClose") or meta.get("chartPreviousClose")
    diff   = round(price - prev, 4) if (price and prev) else None
    pct    = round(diff / prev * 100, 4) if (diff is not None and prev) else None

    # 履歴データ
    timestamps = result.get("timestamp", [])
    quotes     = result.get("indicators", {}).get("quote", [{}])[0]
    closes     = quotes.get("close", [])

    dates  = []
    values = []
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        d = datetime.fromtimestamp(ts)
        dates.append(d.strftime("%-m/%-d"))
        values.append(round(close, 4))

    out = {
        "price":   round(price, 4) if price else None,
        "prev":    round(prev,  4) if prev  else None,
        "diff":    diff,
        "pct":     pct,
        "dates":   dates,
        "history": values,
    }

    # FX 専用フィールド
    if key == "fx":
        out["high"] = meta.get("regularMarketDayHigh")
        out["low"]  = meta.get("regularMarketDayLow")

    return out

def fetch_all() -> dict:
    """全銘柄を取得してまとめて返す"""
    result = {}
    errors = []

    for key, ticker in TICKERS.items():
        print(f"  [{key}] {ticker} を取得中...", end=" ", flush=True)
        try:
            raw  = fetch_chart(ticker, range_="3mo")
            data = parse_result(raw, key)
            result[key] = data
            print(f"✓ 基準価額: {data['price']:,.2f}  前日比: {data['pct']:+.2f}%")
        except Exception as e:
            result[key] = {"error": str(e)}
            errors.append(f"{key}: {e}")
            print(f"✗ 失敗: {e}")

    result["updated"] = datetime.now().isoformat()
    return result, errors

def save(data: dict):
    OUTPUT_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"  → {OUTPUT_FILE} に保存しました")

def main():
    loop_mode = "--loop" in sys.argv

    while True:
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"\n{'='*50}")
        print(f"データ取得開始: {now}")
        print(f"{'='*50}")

        data, errors = fetch_all()
        save(data)

        if errors:
            print(f"\n⚠ {len(errors)} 件の取得失敗がありました:")
            for e in errors:
                print(f"  - {e}")
        else:
            print("\n✅ すべてのデータを正常に取得しました")

        if not loop_mode:
            break

        wait_sec = 15 * 60
        print(f"\n次の更新まで {wait_sec // 60} 分待機... (Ctrl+C で停止)")
        try:
            time.sleep(wait_sec)
        except KeyboardInterrupt:
            print("\n停止しました")
            break

if __name__ == "__main__":
    main()
