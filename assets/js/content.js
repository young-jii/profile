/* ============================================================
   포트폴리오 콘텐츠 데이터 (게임 로직과 분리)
   - 이력 내용을 수정할 때는 이 파일만 고치면 됩니다.
============================================================ */
window.CONTENT = {
      school: {
        title: '학교',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            국어국문학 전공으로 <b class="k-em">‘이야기/문장’</b>을 다루는 힘을 키우고, 이를 <b class="k-em">‘서비스/데이터’</b>로 확장할 기반을 만들었습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">학력</b></p>
          <ul>
            <li><b class="k-em">경희대학교 국어국문학과</b> (GPA 3.92/4.5)</li>
            <li>텍스트와 정보의 <b class="k-em">‘기준’</b>을 정의하고, 그 기준에 따라 <b class="k-em">품질</b>을 관리하는 사고 방식을 학문적으로 훈련</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">이 시기에 길러진 역량</b></p>
          <ul>
            <li><b class="k-title">기획 역량</b>: 전달 목적과 핵심 메시지를 먼저 설정한 뒤, 전체 구조를 설계하는 방식 훈련</li>
            <li><b class="k-title">구조화 능력</b>: 복잡하고 산발적인 정보를 기준·정의·목차 체계로 정리해 이해도를 높이도록 학습</li>
            <li><b class="k-title">사용자 관점</b>: 읽는 사람과 사용하는 사람의 흐름을 고려해, 혼란 지점을 사전에 줄이려는 접근 방식 훈련</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 관점으로의 확장</b></p>
          <p>
            이 시기의 경험을 통해, 좋은 콘텐츠와 서비스는 항상
            ‘만드는 사람’이 아닌 ‘사용하는 사람’을 기준으로 설계되어야 한다는 관점을 갖게 되었습니다.<br/><br/>
            이후의 커리어에서도 저는
            <b class="k-em">기준을 정의하고</b> → <b class="k-em">업무와 정보의 흐름을 구조화하며</b> → <b class="k-em">오류와 불확실성을 줄이는 방식</b>으로
            일관되게 업무를 수행해 왔습니다.
          </p>
        </div>
        `
      },
  
      training: {
        title: '교육',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            이론 중심의 학습을 넘어, 데이터를 통해 <b class="k-em">문제를 정의</b>하고 <b class="k-em">근거를 만드는</b> 업무 방식으로 확장한 시기였습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">주요 과정</b></p>
          <ul>
            <li><b class="k-em">협업 필터링/자연어처리 기반 추천 분석 시스템 제작</b> (2023.06~2023.12)</li>
            <li><b class="k-em">고객경험 데이터 기반 데이터 비즈니스 분석</b> (2024.02~2024.07)</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">이 과정을 통해 강화한 역량</b></p>
          <ul>
            <li>
              <b class="k-title">데이터 전처리·가공</b>:
              Python(Pandas)을 활용해 불완전한 원천 데이터를 <b class="k-em">분석 가능한 형태로 정제</b>
            </li>
            <li>
              <b class="k-title">지표 해석</b>:
              수치를 나열하는 데 그치지 않고, 맥락과 원인을 설명할 수 있는 <b class="k-em">해석 중심</b>의 분석
            </li>
            <li>
              <b class="k-title">업무 자동화</b>:
              반복 작업을 코드로 정리해 <b class="k-em">효율</b>을 높이고, 재사용 가능한 방식으로 개선
            </li>
            <li>
              <b class="k-title">협업 경험</b>:
              기획·개발·분석 역할이 다른 구성원들과 목표와 기준을 맞추며 결과를 도출
            </li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 관점의 변화</b></p>
          <p>
            이 교육을 통해 실무에서 중요한 것은 ‘기술 자체’보다
            <b class="k-em">문제를 어떻게 정의하는지</b>,
            <b class="k-em">현실의 데이터를 어떻게 다루는지</b>,
            그리고 <b class="k-em">팀이 바로 활용할 수 있는 형태로 결과를 전달하는지</b>라는 점을 체감했습니다.<br/>
            이후 저는 <b class="k-em">데이터 기반의 설득력 있는 기획</b>과,
            <b class="k-em">현장에서 즉시 활용 가능한 자동화와 개선</b> 작업을 선호하게 되었습니다.
          </p>
        </div>
        `
      },
  
      company: {
        title: '경력',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            교육 콘텐츠 기획에서 출발해 플랫폼 운영·기획까지 확장하며,
            <b class="k-em">기준 설정·프로세스 정비·자동화</b>를 통해 운영 품질과 효율을 개선해 왔습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">대표 성과: 문항 코드 추출 자동화 프로그램 개발</b></p>
          <div class="video-frame">
            <video controls playsinline preload="metadata">
              <source src="./videos/questions_program.mp4" type="video/mp4" />
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
          <ul style="margin-top:10px;">
            <li>
              <b class="k-title">문제 정의</b>:
              문항 코드 확인·추출을 수작업에 의존해 <b class="k-em">시간 소요</b>와 <b class="k-em">오류</b>가 반복 발생
            </li>
            <li>
              <b class="k-title">개선 방식</b>:
              업무 흐름을 단계별로 분해하고 규칙을 정의한 뒤,
              <b class="k-em">자동 추출·정리 프로그램</b>을 직접 구현
            </li>
            <li>
              <b class="k-title">성과</b>:
              작업 시간 <b class="k-em">1시간 이상 → 20분 내</b>로 단축,
              반복 작업 감소 및 <b class="k-em">정확도·일관성</b> 향상
            </li>
          </ul>
          <p style="margin-top:10px;">
            이 경험을 통해, 작은 자동화라도 현업에 적용될 때
            <b class="k-em">팀 전체의 시간과 품질</b>을 동시에 개선할 수 있다는 확신을 갖게 되었습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">천재교과서 (2021.08~2023.06)</b></p>
          <p style="margin:6px 0 10px;">
            <b class="k-title">역할</b> 교재 개발 PM / 국어 교육 콘텐츠 기획·개발
          </p>
          <ul>
            <li>
              <b class="k-title">교재 개발 PM</b>:
              기획·집필·편집·검수 전 과정을 관리하며 <b class="k-em">일정·품질·커뮤니케이션</b> 총괄
            </li>
            <li>
              <b class="k-title">커리큘럼 및 기준 설계</b>:
              학습 목표와 난이도 기준을 구조화해 콘텐츠 <b class="k-em">일관성</b> 확보
            </li>
            <li>
              <b class="k-title">외부 협업 관리</b>:
              집필진·프리랜서·디자이너와 협업하며 산출물 <b class="k-em">품질</b> 관리
            </li>
            <li>
              <b class="k-title">문항 데이터 구조 개선</b>:
              오류 유형을 체계화하고, 개발·운영에 활용 가능한 <b class="k-em">기준</b> 정립
            </li>
            <li>
              <b class="k-title">디지털 연계</b>:
              밀크티(초등 학습 플랫폼) 국어 콘텐츠 검수 및 연계 콘텐츠 제작
            </li>
          </ul>
          <p style="margin-top:10px;">
            <b class="k-title">업무 인식</b>:
            콘텐츠 기획은 결과물을 만드는 일이 아니라,
            사용자가 막히는 지점을 <b class="k-em">기준과 구조</b>로 해결하는 과정임을 체득했습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">EBS (2024.07~현재)</b></p>
          <p style="margin:6px 0 10px;">
            <b class="k-title">역할</b> 중학프리미엄 플랫폼 운영·기획 / 강좌 데이터 및 프로세스 관리
          </p>
          <ul>
            <li>
              <b class="k-title">플랫폼 운영</b>:
              강좌 데이터 관리, 서비스 개편 대응, 페이지 구조 개선
            </li>
            <li>
              <b class="k-title">분류체계 재설계</b>:
              2015 → 2022 개정 교육과정 기준으로 강좌 분류 체계 <b class="k-em">전면 재정비</b>
            </li>
            <li>
              <b class="k-title">데이터 기반 개선</b>:
              학습 이력·조회·완강·설문 데이터를 가공·분석해 운영 개선안 도출
            </li>
            <li>
              <b class="k-title">운영 프로세스 정비</b>:
              검수 권한·업무 흐름·이슈 대응 기준을 정리해 운영 오류 감소
            </li>
          </ul>
          <p style="margin-top:10px;">
            <b class="k-title">업무 인식</b>:
            운영의 완성은 문제를 처리하는 데서 끝나는 것이 아니라, 같은 문제가 반복되지 않도록 <b class="k-em">구조를 만드는 것</b>이라는 관점을 갖게 되었습니다.
          </p>
        </div>
        `
      },
  
      award: {
        title: '수상',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            제한된 기간 안에서 아이디어를 서비스 형태로 구현하고, 실제 시연 가능한 결과물로 완주해 성과를 만든 경험입니다.
          </p>
        </div>
  
        <div class="k-card">
          <p>
            <b class="k-title">2023 제1회 K-디지털플랫폼 AI 경진대회</b> 특별상
            <span style="font-size:13px;">(2023.12.13)</span>
          </p>
          <div class="video-frame">
            <video controls playsinline preload="metadata">
              <source src="./videos/jingum_test.mp4" type="video/mp4" />
              브라우저가 동영상을 지원하지 않습니다.
            </video>
          </div>
          <ul style="margin-top:10px;">
            <li><b class="k-title">형태</b>: 4인 팀 프로젝트</li>
            <li>
              <b class="k-title">주제</b>:
              가이드 문서를 기반으로 질의에 응답하는
              <b class="k-em">RAG 기반 질의응답 서비스(답파고)</b> 구현
            </li>
            <li>
              <b class="k-title">성과</b>:
              기획 아이디어를 실제 동작 가능한 서비스로 구현해
              <b class="k-em">특별상 수상</b>
            </li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">담당 역할 및 기여</b></p>
          <ul>
            <li>
              <b class="k-title">가이드 DB 설계</b>:
              예시 가이드 문서를 구조화해,
              질의응답에 활용 가능한 <b class="k-em">기준 데이터</b>로 정리
            </li>
            <li>
              <b class="k-title">서비스 구현</b>:
              Django를 활용해 문답 형태의 웹 서비스 프로토타입 제작
            </li>
            <li>
              <b class="k-title">유사도 기반 응답 로직</b>:
              가이드 자료를 임베딩하고, 질문 문장과의 유사도를 계산해 적절한 답변을 반환하는 흐름 구성
            </li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 방식에서의 강점</b></p>
          <ul>
            <li>제한된 시간 내 완성을 위해, 기능을 <b class="k-em">‘시연 가능 여부’</b> 기준으로 우선순위화</li>
            <li>심사자가 이해하기 쉽도록, 서비스 흐름과 사용 시나리오를 중심으로 결과물 정리</li>
            <li>협업 과정에서 화면·데이터·시나리오 기준을 명확히 해 속도와 품질을 동시에 확보</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 인식</b></p>
          <p>
            1박 2일이라는 짧은 해커톤 기간 동안, 아이디어 구상부터 구현, 시연까지 전 과정을 직접 완주하며 <b class="k-em">‘완성’의 경험</b>을 처음으로 온전히 해볼 수 있었습니다.<br/>
            이 과정에서 성과는 아이디어의 크기보다 <b class="k-em">끝까지 만들어 결과물로 남기는 실행력</b>에서 나온다는 점을 체감했고,
            실제로 동작하는 결과물을 만들어냈다는 성취감은 어떤 과제든 해낼 수 있다는 자신감으로 이어졌습니다.<br/>
            이후 저는 프로젝트를 시작할 때 <b class="k-em">완료 가능한 범위를 명확히 설정하고</b>, 빠르게 완성한 뒤 개선해 나가는 방식을 제 일의 기준으로 삼고 있습니다.
          </p>
        </div>
        `
      },
  
      cert: {
        title: '자격증',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            “필요하면 배워서 갖추는 사람”이라는 신뢰를 만들기 위해 꾸준히 기반 역량을 쌓았습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 기반 자격</b></p>
          <ul>
            <li>
              <b class="k-title">워드프로세서</b> (2019.09.13):
              문서 구조화, 기준 정리, 명확한 전달을 위한 작성 역량
            </li>
            <li>
              <b class="k-title">GTQ 1급</b> (2020.02.07):
              이미지 편집 및 시각 자료 품질 개선
            </li>
            <li>
              <b class="k-title">컴퓨터활용능력 1급</b> (2020.08.28):
              데이터 정리, 검증, 기본 분석을 통한 업무 효율화
            </li>
            <li>
              <b class="k-title">SQLD</b> (2024.04.05):
              데이터 조회, 정합성 확인, 운영·분석 업무 연계
            </li>
            <li>
              <b class="k-title">ADsP</b> (2025.09.05):
              지표 설정, 가설 수립, 데이터 기반 의사결정 관점 강화
            </li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">업무 인식</b></p>
          <p>
            자격증은 취득 자체가 목표가 아니라, <b class="k-em">실무에서 바로 꺼내 쓸 수 있는 도구</b>를 하나씩 늘리는 과정이라고 생각합니다.<br/>
            저는 필요한 역량을 선제적으로 학습하고, 이를 실제 업무에 적용한 뒤 문서화해 재사용 가능한 형태로 남기는 방식을 선호합니다.
          </p>
        </div>
        `
      },
  
      lang: {
        title: '언어',
        body: `
        <div class="k-card">
          <p>
            <b class="k-title">한 줄 요약</b><br/>
            언어는 소통 도구이자 업무의 <b class="k-em">‘품질’</b>을 만드는 도구로 활용해 왔습니다.
          </p>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">한국어</b></p>
          <ul>
            <li>국어국문학 전공 + 교재 기획/교정/교열/편집 실무 경험</li>
            <li>복잡한 내용을 “짧고 정확하게” 정리해 문서로 남기는 역량</li>
            <li>기획서/가이드/프로세스 문서로 팀 협업 효율을 높이는 방식</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">영어</b></p>
          <ul>
            <li>TOEIC 785 (2024.06.30)</li>
            <li>TOEIC Speaking IH 150 (2025.09.13)</li>
            <li>해외 자료·기술 문서·리서치 자료 이해 가능, 기본적인 업무 커뮤니케이션 수행</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">일본어</b></p>
          <ul>
            <li>일상 회화 학습 및 여행 환경에서의 실사용 경험</li>
            <li>콘텐츠 및 문화적 맥락을 이해하는 데 활용 가능</li>
          </ul>
        </div>
  
        <div class="k-card">
          <p><b class="k-title">깨달음</b></p>
          <p>
            팀에서 신뢰를 얻는 사람은 말을 많이 하는 사람이 아니라, <b class="k-em">상대의 말을 끝까지 듣고 오해 없이 정리해주는 사람</b>이라고 생각합니다.<br/>
            저는 먼저 이야기를 충분히 듣고 공감한 뒤, 말과 글로 쟁점을 구조화해 구성원 모두가 같은 방향으로 이해할 수 있도록 돕는 역할에 강점이 있습니다.
          </p>
        </div>
        `
      }
    };
