# 플레이 입력 책임 정리

이전에는 Controller가 View의 interaction 메서드를 부르고, View가 Model에 이동·낙하 명령을 전달했다. View가 tick 이벤트로 Model.update()도 호출했다.

이제 Controller가 Model.move(), drop(), update()를 직접 호출한다. View는 입력 좌표를 변환하고 화면 컴포넌트를 조립·표시한다. 기능이 없던 mouse down 전달은 제거했다.

PLAY가 Model·View·Controller를 만들고 Model.setPresentation(view)로 화면 갱신 연결을 설정한다. 시작은 PLAY가 맡고, 입력과 tick 구독·해제는 Controller가 맡는다. tick은 기존과 같이 View에서 받으므로 화면이 장면에 붙어 있는 동안에만 업데이트된다.

View의 사용되지 않던 시작·종료·게임오버·랜덤 병합·디버그 명령 전달 메서드와 Model 상태 getter를 제거했다. WarningOverlay는 중앙 View를 참조하지 않고 게임 활성 여부를 읽는 함수를 받는다. 이는 표시 여부 판단용이며 게임 명령을 보내지 않는다.

Model은 기존 PlayPresentation 인터페이스를 통해 화면 갱신을 요청한다. 구체적인 View 클래스를 알지 않는다. 기존 EVT_HUB_SAFE 통신과 게임 규칙은 유지했다.

수정 전 네 파일은 before-mvc-input/에 보관했다. 기존 PlayModel.ts의 사용자 변경은 건드리지 않았다.

입력 좌표 변환·직접 Model 호출과 반복 종료 시 입력/tick 구독 해제를 검증하는 Controller 테스트 두 개를 추가했다. 기존 아홉 개 테스트와 함께 test:refactor에서 실행한다.
