# 포트폴리오 v5 — 타이포그래피 & 콘텐츠 노출 방식 개선

## 이번 버전의 변화
- **타자기 연출 제거**: 건물에 들어가면 내용이 바로 표시됩니다.
- **데스크톱: 오른쪽 사이드 패널**: 정보/연혁이 화면을 덮는 팝업 대신 오른쪽에서 슬라이드되는 패널로 열립니다.
  게임 화면(캐릭터가 건물 앞에 서 있는 모습)이 계속 보이는 상태로 읽을 수 있고, 글 줄 길이도 읽기 좋은 폭이 됩니다.
  모바일은 기존 바텀시트 유지. 인트로/아웃트로는 타이틀 화면 성격이라 가운데 유지.
- **SUITE 폰트 적용**: 제목은 ExtraBold(800), 본문은 Light(300). 줄간격·문단 간격·카드 여백 축소로 밀도 있게.
- resume.html 도 동일한 타이포 적용.

## 적용 방법
```bash
cd ~/Developer/profile
unzip -o ~/Downloads/profile_v5_update.zip
git add -A
git commit -m "v5: SUITE 타이포, 사이드 패널, 타자기 연출 제거"
git push
```

## 수정 포인트
- 패널 폭: game.css 의 `min(560px, ...)` 부분
- 본문 굵기/줄간격: game.css `.game-modal-body` 의 font-weight / line-height
