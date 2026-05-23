# 정답·해설 원본

연도별 CSV 형식 (`year,question_no,correct_choice,explanation`):

```csv
year,question_no,correct_choice,explanation
2023,41,4,"해설 문단 (선택)"
```

파이프라인은 `data/answer_keys/{year}.csv` 또는 hypers84(2016~2022)에서 자동 수집합니다.

`npm run pipeline` 실행 시 `data/pipeline/answer_keys/`에 병합 결과가 생성됩니다.
