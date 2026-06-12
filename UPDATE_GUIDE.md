# 포트폴리오 v3 업데이트 — "Quest Book" 리디자인

## 이번 버전의 변화
- **풀스크린 게임 월드**: 캔버스가 화면 전체를 채우고, 모바일 세로 화면에서도 비율에 맞춰 시야가 조정됩니다.
- **상단 HUD 오버레이**: 타이틀 + 경력 + 퀘스트 카운트(★ n/6) + EXIT 버튼.
- **RPG 대화창 2단 인터랙션**: 건물 앞에서 A/Space → 한 줄 소개 대화창 → 한 번 더 누르거나 대화창 탭 → 상세 내용.
- **콘텐츠 시트 리디자인**: 밝은 종이 질감의 "퀘스트 북". 모바일에서는 아래에서 올라오는 바텀시트(스크롤 문제 해결), 데스크톱에서는 가운데 책 형태.
- **시트가 열리면 D-pad/A버튼 자동 숨김** (겹침 문제 해결).
- resume.html 도 같은 종이 테마로 통일.

## 적용 방법 (로컬 리포 폴더 = ~/Developer/profile 에서)
```bash
cd ~/Developer/profile
unzip -o ~/Downloads/profile_v3_update.zip   # zip 경로는 실제 다운로드 위치로
git add -A
git commit -m "v3: Quest Book 리디자인 — 풀스크린 월드, 대화창 2단 인터랙션, 바텀시트"
git push
```
(이전에 `git mv vidieos videos` 와 `git rm -r --cached node_modules` 를 아직 안 했다면 commit 전에 함께 실행하세요.)

## 이후 수정 포인트
- 건물 상세 내용 → `assets/js/content.js`
- 대화창 한 줄 소개 → `game.js` 의 `NODE_SUMMARY`
- 엔딩 스탯 레벨 → `game.js` 의 `SKILL_STATS`
- 색/디자인 → `assets/css/game.css` 맨 위 `:root` 변수
