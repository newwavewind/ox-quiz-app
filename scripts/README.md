# 민법 OX 데이터 파이프라인

## 실행

```bash
python -m pip install -r scripts/requirements.txt
npm run pipeline          # 전체 (extract → answers → ox → app)
npm run pipeline:extract  # PDF만
npm run pipeline:answers  # hypers84 정답 (2016~2022)
npm run pipeline:build    # OX JSON + 앱 반영
```

PDF 경로: `c:\Users\상토시\OneDrive\Desktop\민법기출\`

## 산출물

| 경로 | 설명 |
|------|------|
| `data/pipeline/raw/{year}.json` | PDF 파싱 문항 |
| `data/pipeline/answer_keys/{year}.json` | 정답·해설 |
| `data/pipeline/questions_final.json` | 전체 OX |
| `src/data/questions/{year}.json` | 앱용 연도별 데이터 |

## 2023~2025 정답 추가

`data/answer_keys/{year}.csv` 작성 후 `npm run pipeline:build` 재실행.

## 2025년 PDF

스캔 이미지 위주로 텍스트 추출 불가. OCR 또는 수동 CSV 입력 필요.
