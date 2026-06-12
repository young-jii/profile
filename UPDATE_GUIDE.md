# 포트폴리오 v2 업데이트 적용 가이드

## 변경된 파일
| 파일 | 내용 |
|---|---|
| `index.html` | OG 메타태그, 퀘스트바, 모바일 D-pad 마크업, 텍스트 이력서 링크, content.js 로드 |
| `resume.html` | **신규** — 텍스트 이력서 (content.js 재사용) |
| `assets/js/game.js` | **전면 개편** — 카메라+640×360 월드, 건물, 충돌, Y-소팅, 모바일 조작, 퀘스트, 엔딩 스탯창 |
| `assets/js/content.js` | **신규** — 이력 콘텐츠 분리 (내용 수정은 이제 이 파일에서!) |
| `assets/css/game.css` | v2 스타일 추가 (퀘스트 칩, 스탯창, 모바일 컨트롤) |
| `images/og_thumb.png` | **신규** — 링크 공유용 썸네일 |
| `.gitignore` | **신규** — node_modules 제외 |

## 적용 방법 (로컬 저장소에서)
```bash
cd profile                      # 본인 로컬 리포 폴더로 이동
unzip -o profile_v2_update.zip  # zip을 리포 루트에 풀기 (덮어쓰기)
git mv vidieos videos           # ⚠️ 필수! 폴더명 오타 수정 (content.js가 ./videos/ 참조)
git rm -r --cached node_modules # 리포에서 node_modules 제거 (파일은 로컬에 남음)
git add -A
git commit -m "v2: 탐험형 맵(카메라/건물/충돌), 모바일 조작, 퀘스트/엔딩 스탯, 텍스트 이력서, OG 태그"
git push
```

push 후 1~2분 뒤 https://young-jii.github.io/profile/ 에서 확인하세요.
(브라우저 캐시 때문에 옛 화면이 보이면 Ctrl+Shift+R 강력 새로고침)

## 이후 이력 내용 수정은?
- 각 건물의 상세 내용 → `assets/js/content.js`
- 연혁(타임라인) → `index.html` + `resume.html` 의 타임라인 부분
- 엔딩 스탯(레벨) → `game.js`의 `SKILL_STATS`
- 게임 로직은 건드릴 필요 없음
