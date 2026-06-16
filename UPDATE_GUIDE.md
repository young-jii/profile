# 포트폴리오 v6 — 건물 내부 입장 + NPC 대화 (동물의 숲 무드)

## 이번 버전의 큰 변화
- **건물 내부 입장!** 건물 앞에서 한 번 더 확인하면 화면이 전환되며 내부로 들어갑니다.
  방마다 테마 인테리어(교탁/칠판, 책상/모니터, 트로피 진열장, 책장 등)가 있어요.
- **NPC 대화 + 선택지!** 방마다 다른 인물(김 교수, 이 팀장, 박 멘토, 심사위원, 자격 사서, Jamie)이 기다립니다.
  말을 걸면 인사 → 선택지 등장:
  - 📖 자세한 이야기 → 상세 패널
  - 💬 핵심만 짧게 → NPC가 요약을 말해줌
  - 👋 다음에 올게요 → 작별 인사
  아래쪽 EXIT 매트로 내려가거나 ESC/EXIT 버튼으로 마을 복귀.
- **동물의 숲 무드**: 잔디·길을 더 밝고 따뜻한 파스텔 톤으로, 둥근 말풍선/선택지 버튼.

## 조작
- 마을: 이동(방향키/D-pad), 확인(Space/A)
- 내부: 이동, NPC에게 말 걸기(Space/A), 선택지 위아래(↑↓)+확인(Space/Enter), 나가기(아래 EXIT / ESC)

## 적용 방법
```bash
cd ~/Developer/profile
unzip -o ~/Downloads/profile_v6_update.zip
git add -A
git commit -m "v6: 건물 내부 입장 + NPC 대화 선택지, 동물의 숲 무드"
git push
```
push 후 Cmd+Shift+R 강력 새로고침.

## 수정 포인트
- NPC 대사/이름: game.js 의 `NPC_DATA`
- 방 가구 배치: game.js 의 `roomFurniture`
- NPC 외형: assets/css/images/npc_sheet.png (16×20 × 6열 × 2행)
- 잔디/길 색: game.js 의 `GRASS_TONES` 와 drawBG 색상
