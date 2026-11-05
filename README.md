# DeepSeek Harness 모바일 레이아웃 개선

**한국어** · [English](README.en.md) · [中文](README.zh.md) · [日本語](README.ja.md)

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 웹 UI의 모바일 입력과 상단 작업 버튼을 개선하는 플러그인입니다. **Harness 0.2.2-rc.1 이상**을 대상으로 하며, 검증 기준은 `dsh-v0.2.2-rc.1`(`66491b05e3`)입니다.

Harness가 제공하는 사이드바 서랍·열기 버튼·배경막·Esc 처리·전체 화면 설정·가로 탭을 그대로 사용합니다. 1.2.0에서는 이 기능을 중복 구현하던 코드와 오래된 설정·터치 행·모양 카드 CSS를 삭제했습니다. 이전 Harness에서는 플러그인 1.1.1을 사용하세요.

## 추가하는 기능

- 화면 폭 767px 이하에서 상단의 에이전트 팀·서브에이전트·백그라운드 작업을 40px 아이콘과 상태·개수 배지로 표시합니다. 텍스트 모드를 선택하면 공간에 따라 줄을 바꿉니다.
- 왼쪽 가장자리에서 오른쪽으로 스와이프하면 본체 서랍이 열립니다. 서랍이나 배경막에서 왼쪽으로 스와이프하면 닫힙니다. 다른 활성 모달이 있으면 스와이프하지 않습니다.
- 서랍에서 세션을 선택하거나 새 세션을 시작하면 닫힙니다. 페이지 이동과 Esc 처리는 본체가 담당합니다.
- `viewport-fit=cover`, `interactive-widget=resizes-content`, safe-area 여백과 visual viewport 높이 추적으로 노치·홈 인디케이터·소프트 키보드에 대응합니다.
- 모바일 입력 필드는 16px로 표시해 iOS 포커스 확대를 줄이고, 긴 설정 설명은 컨트롤과 줄을 나눕니다.

레이아웃 규칙은 767px 이하의 웹 화면에만 적용됩니다. macOS·Windows 데스크톱 셸에는 적용하지 않습니다. 아이콘 설정 항목은 넓은 웹 화면에서도 표시됩니다.

## 설치

```bash
dsh plugin --profile <프로필> add github:DegreeCode/dsh-mobile-fix
# 또는 로컬 폴더 / 릴리스 패키지
dsh plugin --profile <프로필> add ./dsh-mobile-fix
dsh plugin --profile <프로필> add ./dsh-mobile-fix-1.2.0.tgz
```

앱의 **설정 → 플러그인 → 설치**에서도 설치할 수 있습니다. 제거는 `dsh plugin --profile <프로필> remove dsh-mobile-fix`입니다. 비활성화하면 플러그인의 스타일·속성·viewport 변경과 이벤트 처리를 되돌립니다.

## 상단 작업 버튼

**설정 → 일반 → 상단 작업 버튼을 아이콘으로 표시**에서 바꿉니다. 기본은 켜짐이며, 선택값은 본체 사용자 설정에 저장됩니다. 끄면 본체 텍스트 표시를 사용하고 버튼이 필요에 따라 줄을 바꿉니다.

짧게 탭하면 기능을 열고 같은 버튼을 다시 누르면 닫습니다. 길게 누르면 현재 상태를 설명하는 툴팁을 표시합니다. 설명은 손을 뗀 뒤에도 유지되며 다른 곳 누르기·스크롤·Esc로 닫습니다. 마우스 호버와 키보드 포커스로도 설명을 확인할 수 있습니다. 아이콘 영역은 한 줄을 유지하고 아주 좁은 화면에서 가로로 스크롤합니다.

## 개발과 검증

```bash
npm ci
npm run build
npm run check
npm test
node scripts/check-upstream.mjs <Harness 체크아웃>
```

`src/mobile.css`, `src/runtime.js`, `src/header.js`, `src/settings.js`를 고친 뒤 `npm run build`로 `client.js`를 재생성합니다. 본체의 CSS 모듈 클래스와 `data-sidebar-drawer` 등의 속성을 사용하며, 열기·닫기는 `ctx.layout.toggleSidebar()`로 처리합니다.

런타임 테스트는 본체의 dialog·열기 버튼·배경막을 포함한 jsdom fixture에서 중복 UI가 생기지 않는지, 스와이프·모달 차단·지연 마운트·해제·아이콘·설정 저장을 확인합니다. 구조 검사는 클래스·속성·본체 서랍 제공 위치와 768px 경계를 대조합니다. 실제 휴대폰의 키보드 동작 검증은 별도로 필요합니다.

CI는 패키지 검사와 `0.2.2-rc.1` 구조 검사를 필수로 실행하고, 최신 `master` 검사는 변경 알림용으로 실행합니다. 버전과 일치하는 `v<버전>` 태그를 푸시하면 GitHub Release와 `.tgz`를 생성합니다. 저장소에 `NPM_TOKEN`이 설정되어 있으면 npm에도 게시합니다.

## 라이선스

MIT. 레이아웃 선택자는 DeepSeek Harness(MIT, Copyright (c) 2026 DeepSeek)의 구조를 따릅니다.
