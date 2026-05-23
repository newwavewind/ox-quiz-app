# 데이터 전략 (띄어쓰기)

## 결론: 앱을 처음부터 다시 만들 필요 없음

- **UI·학습 흐름(OX, 오답노트, 필터)** 은 그대로 둡니다.
- 문제는 **데이터를 어디서, 어떻게 넣느냐** 입니다.

## 지금까지 시도한 것

| 방식 | 결과 |
|------|------|
| PDF `get_text()` | 한글 띄어쓰기 대부분 소실 |
| PDF 좌표 기반 추출 | 일부 문장만 개선 |
| 규칙·사전 `space_korean` | `의사`→`의 사` 등 오히려 악화 |
| 화면 `spaceKorean.js` | **이미 보정된 JSON을 다시 망가뜨림** → 사용 중단 |

## 권장: 데이터 소스 3단계

### 1단계 (현재, 즉시) — 파이프라인 보정문 + 화면은 JSON 그대로

- `npm run fix:spacing` → `polish_statements.py` (Python만 보정)
- 앱에서는 **추가 띄어쓰기 처리 없음** (`question.statement` 그대로 표시)

### 2단계 (권장) — 정답·해설과 같은 신뢰 소스

hypers84 해설에 이미 띄어진 지문이 많음 (예: 「③ 낙약자는 요약자와의 계약에 기한…」).

- `data/answer_keys/` 또는 스크랩 해설에서 **보기 문장만 추출**해 `statement` 덮어쓰기
- PDF는 **검수·누락 보완**용으로만 사용

### 3단계 (선택) — 수동 정본

- `data/manual/statements.csv`  
  `year,question_no,choice_no,statement`
- 민법·기출 해설지 기준으로 연도별 검수 (핵심 문항만이라도)

## 새 폴더로 다시 짤 때

전체 복제보다 **이 레포에서**:

```
data/
  v2/                    # 신뢰 소스 기반 JSON만
  manual/statements.csv  # 수동 정본
scripts/
  import_hypers84_statements.py  # 2단계용 (추가 예정)
```

앱 코드는 `src/data/questions/` 만 v2로 교체하면 됩니다.

## 하지 않을 것

- PDF만 믿고 규칙으로 띄어쓰기 “추측”하는 2중 처리
- 브라우저·파이프라인 **서로 다른** 띄어쓰기 로직
