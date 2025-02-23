(function ($) {
    var $window = $(window),
        $body = $('body'),
        $header = $('#header'),
        $footer = $('#footer'),
        $main = $('#main'),
        settings = {
            parallax: true,
            parallaxFactor: 20
        };

    breakpoints({
        xlarge: ['1281px', '1800px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: ['481px', '736px'],
        xsmall: [null, '480px']
    });

    $window.on('load', function () {
        window.setTimeout(function () {
            $body.removeClass('is-preload');
        }, 100);
    });

    if (browser.mobile) {
        $body.addClass('is-touch');
        window.setTimeout(function () {
            $window.scrollTop($window.scrollTop() + 1);
        }, 0);
    }

    breakpoints.on('<=medium', function () {
        $footer.insertAfter($main);
    });

    breakpoints.on('>medium', function () {
        $footer.appendTo($header);
    });

    if (settings.parallax) {
        breakpoints.on('<=medium', function () {
            $window.off('scroll.strata_parallax');
            $header.css('background-position', '');
        });

        breakpoints.on('>medium', function () {
            $header.css('background-position', 'left 0px');
            $window.on('scroll.strata_parallax', function () {
                $header.css(
                    'background-position',
                    'left ' + -1 * (parseInt($window.scrollTop()) / settings.parallaxFactor) + 'px'
                );
            });
        });

        $window.on('load', function () {
            $window.triggerHandler('scroll');
        });
    }

    // ✅ DOM 로드 시 한 번만 실행
    document.addEventListener('DOMContentLoaded', function () {
        console.log("🚀 DOM 로드 완료");

        // ✅ 경력 업데이트 코드
        const today = new Date();

        const careerPeriods = [
            { start: new Date('2021-08-02'), end: new Date('2023-06-23') },
            { start: new Date('2024-07-18'), end: today }
        ];

        let totalDays = 0;

        careerPeriods.forEach((period, index) => {
            const diffTime = period.end - period.start;
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const months = Math.round(diffDays / 30.44);

            console.log(`📅 경력 ${index + 1}: ${months}개월 (${period.start.toDateString()} ~ ${period.end.toDateString()})`);

            totalDays += diffDays;
        });

        const totalMonths = Math.round(totalDays / 30.44);
        const totalYears = Math.floor(totalMonths / 12);
        const remainingMonths = totalMonths % 12;

        console.log(`📊 총 경력: ${totalMonths}개월 → ${totalYears}년 ${remainingMonths}개월`);

        const workDayElement = document.querySelector('.work_day');
        if (workDayElement) {
            workDayElement.innerHTML = `
                <span class="highlight">${totalYears}</span> years
                <span class="highlight">${remainingMonths}</span> months of experience
            `;
        }

        // ✅ 방문자 수 카운트
        function updateVisitorCount() {
            let count = localStorage.getItem('visitorCount');
            if (count === null || isNaN(count)) {
                count = 0;
            } else {
                count = parseInt(count, 10);
            }

            count += 1;
            localStorage.setItem('visitorCount', count);

            const visitorCountElement = document.querySelector('#visitorCount span');
            if (visitorCountElement) {
                visitorCountElement.textContent = count;
            } else {
                console.warn('🚨 방문자 수 표시할 요소 없음! HTML에 추가 필요.');
            }
        }

        updateVisitorCount();

        // ✅ 토글 기능
		    // ✅ 토글 관련 요소 가져오기
        const toggleSwitch = document.getElementById('contentToggle');
        const sectionTitle = document.getElementById('sectionTitle');
        const sectionContent = document.getElementById('sectionContent');
        // const toggleLabel = document.getElementById('toggleLabel');

		// ✅ 요소가 정상적으로 선택되었는지 콘솔에서 확인
		console.log("📌 토글 요소 확인:", toggleSwitch);
		console.log("📌 타이틀 요소 확인:", sectionTitle);
		console.log("📌 컨텐츠 요소 확인:", sectionContent);
		// console.log("📌 토글 라벨 확인:", toggleLabel);

		// ✅ 요소가 존재하는지 검사 후, 없으면 경고 표시
		if (!toggleSwitch) console.warn("🚨 [오류] 토글 버튼 요소(#contentToggle)를 찾을 수 없습니다.");
		if (!sectionTitle) console.warn("🚨 [오류] 타이틀 요소(#sectionTitle)를 찾을 수 없습니다.");
		if (!sectionContent) console.warn("🚨 [오류] 컨텐츠 요소(#sectionContent)를 찾을 수 없습니다.");
		// if (!toggleLabel) console.warn("🚨 [오류] 토글 라벨 요소(#toggleLabel)를 찾을 수 없습니다.");

		// ✅ 요소가 정상적으로 존재하는 경우에만 실행
		if (toggleSwitch && sectionTitle && sectionContent) {
			function updateContent() {
				console.log("🔄 토글 상태 변경됨. 현재 checked 값:", toggleSwitch.checked);

				if (toggleSwitch.checked) {
					sectionTitle.innerHTML = "Let me introduce the real me.";
					sectionContent.innerHTML = `
						<span class="on-text">
							안녕하세요. 박지영입니다:) <br />
							인문학적 소양을 갖추었으며 컴퓨터 공학에 대한 흥미로 다양한 일에 도전하고 있습니다. <br/>
							뒤늦게 발견한 취향이었지만, 즐겁게 배우는 중입니다. <br />
							데이터를 추출하고 분석하여 사용자 입장에서 바라보는 방식을 배우며 일하고 있습니다. <br/>
							뽀시락 거리며 만드는 일을 좋아합니다. 그래서 어떠한 시스템 혹은 프로그램을 제작하는 일을 즐거워하고 있습니다. <br/>
							독서에 취미가 있어서 다양한 작품을 장르 구분 없이 접하는 것을 좋아합니다. 취향에 맞는 작품이 있으면 밤을 새우는 것이 특기입니다. <br/>
							AI에 도전하며, 새로운 것을 접하고 배우는 것에 두려움이 많이 없어졌습니다. <br/><br/>
							※ 모든 개발 과정에서 GPT를 적극적으로 활용하고 있습니다. 하지만 이는 GPT가 모든 것을 대신한다는 의미가 아니라, GPT를 효과적으로 활용할 수 있는 능력을 갖추고 있음을 뜻합니다.
						</span>
					`;
					console.log("✅ 토글 ON: 새 콘텐츠가 적용됨.");
				} else {
					sectionTitle.innerHTML = "Exploring Ideas in Service Design, AI, <br /> and the World of Storytelling IPs";
					sectionContent.innerHTML = `
					<span class="off-text">
					Hello, I’m Jiyoung. <br/>
					With a background in literature and a passion for technology, I blend creativity with logic to design meaningful services and craft engaging projects. From AI-driven innovations to story-driven IP exploration, my work reflects curiosity and commitment to creating impactful solutions.<br/><br/>
					※ I actively utilize GPT in all development processes. However, this does not mean that GPT does everything for me, but rather that I have the ability to use GPT effectively.
					`;
					console.log("✅ 토글 OFF: 기본 콘텐츠가 적용됨.");
				}
			}

			// ✅ 이벤트 리스너 등록 확인
			toggleSwitch.addEventListener('change', updateContent);
			console.log("✅ 이벤트 리스너가 정상적으로 등록됨.");

            updateContent();
        } else {
            console.warn("🚨 토글 관련 요소를 찾을 수 없습니다.");
        }

		// 새로운 타임라인!

		const timelineContainer = document.getElementById("timelineChart");

		if (!timelineContainer) {
			console.error("🚨 오류: #timelineChart 요소를 찾을 수 없습니다.");
			return;
		}
	
		timelineContainer.innerHTML = ""; // 기존 데이터 초기화
		console.log("✅ timelineChart 요소 찾음.");
	
		// ✅ 타임라인 바 생성 (중앙 배치)
		const timelineBar = document.createElement("div");
		timelineBar.className = "timeline-bar";
		timelineContainer.appendChild(timelineBar);
	
		// ✅ 연도별 데이터를 그룹화
		const timelineData = [
			{ year: 2012, text: "은광여자고등학교 입학" },
			{ year: 2015, text: "은광여자고등학교 졸업" },
			{ year: 2016, text: "경희대학교 입학" },
			{ year: 2019, text: "워드프로세서 자격증 취득" },
			{ year: 2020, text: "GTQ 1급 자격증 취득" },
			{ year: 2020, text: "컴활 1급 자격증 취득" },
			{ year: 2021, text: "천재교과서 입사" },
			{ year: 2022, text: "경희대학교 졸업" },
			{ year: 2023, text: "천재교과서 퇴사" },
			{ year: 2023, text: "A.I. 추천 분석 과정 수료" },
			{ year: 2023, text: "Azure AI Fundamentals 취득" },
			{ year: 2023, text: "AI 경진대회 특별상 수상" },
			{ year: 2024, text: "데이터 분석가 과정 수료" },
			{ year: 2024, text: "SQLD 자격증 취득" },
			{ year: 2024, text: "EBS 근무 시작" },
		];

		// ✅ 데이터가 있는 연도만 추출 후 마지막 연도를 +1로 설정
		const uniqueYears = [...new Set(timelineData.map(item => item.year))];
		const lastYear = Math.max(...uniqueYears) + 1; // 마지막 연도 +1 추가
		uniqueYears.push(lastYear);

		// 좌우 여백 설정
		const marginLeftRight = 5; // 양쪽 끝 여백 (5%)
		const yearCount = uniqueYears.length;
		const yearSpacing = (100 - marginLeftRight * 2) / (yearCount - 1);

		// ✅ 연도 추가 및 동그라미 생성 (데이터가 있는 연도만)
		uniqueYears.forEach((year, index) => {
			const leftPosition = `${marginLeftRight + index * yearSpacing}%`;

			// ✅ 명도 조정 (연도가 높을수록 진해지도록 설정)
			let intensity = Math.floor(180 - ((year - uniqueYears[0]) / (lastYear - uniqueYears[0])) * 130);
			
			// ✅ 연도 표시
			const yearSpan = document.createElement("span");
			yearSpan.className = "timeline-year";
			yearSpan.textContent = year;
			yearSpan.style.left = leftPosition;
			// ✅ 명도 조정 적용
			yearSpan.style.color = `rgb(${intensity}, ${intensity}, ${intensity})`;
			timelineBar.appendChild(yearSpan);

			// ✅ 동그라미 생성 (연도 위치에 표시)
			const circle = document.createElement("div");
			circle.className = "timeline-circle";
			circle.style.left = leftPosition;
			timelineBar.appendChild(circle);
		});

		// ✅ 이벤트 추가
		const topEventContainers = [];

		uniqueYears.slice(0, -1).forEach((year, index) => {
			const leftPosition = `${marginLeftRight + index * yearSpacing}%`;

			// ✅ 이벤트 컨테이너 생성
			const eventContainer = document.createElement("div");
			eventContainer.className = "timeline-event-container";
			eventContainer.style.left = leftPosition;

			// ✅ 연도별 위치 번갈아 설정 (홀수 연도는 위, 짝수 연도는 아래)
			const isOddYear = year % 2 !== 0;
			eventContainer.classList.add(isOddYear ? "top" : "bottom");

			// ✅ 같은 연도 이벤트를 하나의 div로 묶어 <p> 태그로 정리
			const eventDiv = document.createElement("div");
			eventDiv.className = "timeline-event";

			// ✅ 🚀 **eventCount를 0으로 초기화**
			let eventCount = 0;

			timelineData
				.filter(item => item.year === year)
				.forEach(eventText => {
					const eventP = document.createElement("p");
					eventP.textContent = eventText.text;
					eventDiv.appendChild(eventP);
					eventCount++; // ✅ **eventCount 증가**
				});

			// ✅ 상단(top)에 있는 이벤트 컨테이너는 배열에 저장하여 이후 정렬 맞춤
			if (isOddYear) {
				topEventContainers.push({ container: eventDiv, eventCount });
			}

			eventContainer.appendChild(eventDiv);
			timelineContainer.appendChild(eventContainer);
		});

		// ✅ 상단(top) 요소들 중 가장 많은 <p> 개수를 기준으로 빈 <p> 추가
		const maxEventCount = Math.max(...topEventContainers.map(e => e.eventCount));

		topEventContainers.forEach(({ container, eventCount }) => {
			const missingP = maxEventCount - eventCount;
			for (let i = 0; i < missingP; i++) {
				const emptyP = document.createElement("p");
				emptyP.classList.add("empty-text");
				emptyP.textContent = "-"; // 보이지 않는 유니코드 문자 (공백 처리)
				container.prepend(emptyP); // 상단에 추가하여 하단 정렬 유지
			}
		});
	});

	// 팝업 관련 코드 추가
	document.addEventListener('DOMContentLoaded', function () {
		// 팝업 관련 설정 배열
		const popupTriggers = [
			{ trigger: 'popupTrigger1', popup: 'popup1', close: 'closePopup1' },
			{ trigger: 'popupTrigger2', popup: 'popup2', close: 'closePopup2' },
			{ trigger: 'popupTrigger3', popup: 'popup3', close: 'closePopup3' },
			{ trigger: 'popupTrigger4', popup: 'popup4', close: 'closePopup4' },
			{ trigger: 'popupTrigger5', popup: 'popup5', close: 'closePopup5' },
			{ trigger: 'popupTrigger6', popup: 'popup6', close: 'closePopup6' },
		];

		// 현재 열려있는 팝업의 video 요소를 저장할 변수
		let currentOpenVideo = null;

		popupTriggers.forEach(({ trigger, popup, close }) => {
			const triggerElement = document.getElementById(trigger);
			const popupElement = document.getElementById(popup);
			const closeElement = document.getElementById(close);
	
			if (	triggerElement && popupElement && closeElement) {
				triggerElement.addEventListener('click', function (e) {
				e.preventDefault();
				popupElement.style.display = 'block';
		
				// 팝업 내부 콘텐츠 스크롤 초기화
				const popupContent = popupElement.querySelector('.popup-content');
				if (popupContent) {
					popupContent.scrollTop = 0;
				}
		
				// 팝업 내 video 요소 찾기
				const videoElement = popupElement.querySelector('video');
				if (videoElement) {
					videoElement.currentTime = 0; // 영상 시작 위치 초기화
		
					// video 요소에 포커스 부여 (내부 컨트롤 정상 작동을 위해)
					videoElement.focus();

					// video가 이미 메타데이터를 로드한 경우
					if (videoElement.readyState > 0) {
						videoElement.play();
						currentOpenVideo = videoElement;
					} else {
					// 메타데이터 로딩 완료 후 재생 시작
					const onLoaded = function () {
						videoElement.removeEventListener('loadedmetadata', onLoaded);
						videoElement.play();
						currentOpenVideo = videoElement;
					};
					videoElement.addEventListener('loadedmetadata', onLoaded);
					}
				}			
			});
	
			// 닫기 버튼 클릭 시 팝업 닫기
			closeElement.addEventListener('click', function () {
				popupElement.style.display = 'none';
				const videoElement = popupElement.querySelector('video');
				if (videoElement) {
					videoElement.pause();
					videoElement.currentTime = 0;
				}
				currentOpenVideo = null;
			});
	
			// 팝업 오버레이 클릭 시 (내부 콘텐츠 클릭은 무시)
			popupElement.addEventListener('click', function (e) {
				if (e.target === popupElement) {
					popupElement.style.display = 'none';
					const videoElement = popupElement.querySelector('video');
					if (videoElement) {
					videoElement.pause();
					videoElement.currentTime = 0;
					}
					currentOpenVideo = null;
				}
			});
		}
		});
	
		// 전역 키보드 이벤트 처리 (버블링 단계)
		document.addEventListener('keydown', function (e) {
		  // 현재 열려있는 video가 없거나 메타데이터가 준비되지 않았다면 처리하지 않음
			if (!currentOpenVideo || isNaN(currentOpenVideo.duration)) return;
	
		  // 이벤트 대상이 video 요소(또는 그 내부)인지 확인
			const isInsideVideo = currentOpenVideo.contains(e.target);
			
			if (e.key === ' ' || e.key === 'Spacebar') {
				if (!isInsideVideo) {
					e.preventDefault();
				if (currentOpenVideo.paused) {
					currentOpenVideo.play();
				} else {
					currentOpenVideo.pause();
				}
			}
		}
		});
	});

})(jQuery);