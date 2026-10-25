# DeepSeek Harness 모바일 레이아웃 개선

[![CI](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml/badge.svg)](https://github.com/DegreeCode/dsh-mobile-fix/actions/workflows/ci.yml)

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 웹 UI를 휴대폰에서 쓰기 편하게 바꾸는 플러그인입니다. 본체 코드를 고치지 않고, 클라이언트 모듈(`dsh.client`) 하나가 스타일시트와 몇 가지 동작을 더합니다.

화면 폭이 767px 이하일 때만 동작하고, 그보다 넓은 화면과 macOS·Windows 데스크톱 앱에는 아무것도 바꾸지 않습니다.

## 바뀌는 점

| 문제 (0.2.1-rc.3 기준) | 바뀐 동작 |
|---|---|
| 접힌 사이드바 레일이 390px 화면에서 56px(약 1/7)을 늘 차지함 | 레일을 없애고 왼쪽 위에 메뉴 버튼만 둡니다. 본문이 화면 전체 폭을 씁니다. |
| 사이드바를 펼치면 본문을 옆으로 밀어 한 글자씩 세로로 줄넘김됨 | 본문 위에 뜨는 서랍(drawer)으로 열리고, 뒤에 어두운 배경막이 깔립니다. |
| 서랍에서 세션을 골라도 사이드바가 열린 채로 남음 | 세션 선택, 새 세션, 플러그인·자동화 작업 같은 페이지 이동 시 자동으로 닫힙니다. 배경막 탭, Esc, 왼쪽으로 스와이프해도 닫힙니다. 화면 왼쪽 가장자리에서 오른쪽으로 스와이프하면 열립니다. |
| 설정이 800px 카드 + 188px 세로 메뉴라 항목마다 120px 남짓만 남아 글자가 한 자씩 줄넘김됨 | 전체 화면 시트로 열리고, 섹션 메뉴는 위쪽 가로 스크롤 탭이 됩니다. 항목 설명과 선택 버튼은 폭이 모자라면 줄을 나눠 배치합니다. |
| 모양(라이트·다크·시스템) 카드 세 개가 세로로 쌓여 화면 하나를 차지함 | 한 줄 3칸으로 놓습니다. |
| 터치 기기에서는 세션 행의 고정·보관·메뉴 버튼이 마우스 hover로만 나타나 누를 수 없음 | 선택된 세션과 워크스페이스 행에 버튼을 늘 보여 주고, 16px 아이콘의 터치 영역을 32px로 넓힙니다. |
| 입력창 글자가 14px라 iOS에서 포커스하면 화면이 확대됨 | 휴대폰에서는 입력 필드 글자를 16px로 둡니다. |
| 노치·홈 인디케이터에 화면이 가려지고, 키보드가 입력창을 덮음 | `viewport-fit=cover`, `interactive-widget=resizes-content`를 추가하고 safe-area 여백을 줍니다. |

## 설치

`dsh` CLI로 프로필에 설치합니다.

```bash
# Git 저장소에서 (client.js가 커밋되어 있어 빌드 단계가 필요 없습니다)
dsh plugin --profile <프로필> add github:DegreeCode/dsh-mobile-fix

# 로컬 폴더에서
dsh plugin --profile <프로필> add ./dsh-mobile-fix

# 릴리스 압축 파일로 (GitHub Releases에서 받은 .tgz)
dsh plugin --profile <프로필> add ./dsh-mobile-fix-1.0.0.tgz
```

앱 안에서는 **설정 → 플러그인 → 설치**에서 설치할 수 있습니다. 제거는 `dsh plugin --profile <프로필> remove dsh-mobile-fix`입니다. 제거하거나 끄면 넣었던 스타일, 버튼, 속성, viewport 설정을 모두 되돌립니다.

## 동작 방식

- Harness의 스타일은 CSS 모듈이라 클래스 이름이 `<해시>_<이름>` 꼴입니다. 해시는 빌드마다 바뀔 수 있으므로 `[class*="_sidebarCol"]`처럼 이름 부분으로만 찾고, `:has(> [data-shell-bottom])` 같은 구조 조건으로 범위를 좁힙니다.
- 사이드바 열기·닫기는 DOM 버튼을 누르는 대신 본체의 레이아웃 서비스(`ctx.layout.toggleSidebar()`)를 호출합니다. 열림 상태는 `AppFrame`이 내보내는 `data-sidebar-collapsed` 속성으로 읽습니다.
- 모든 규칙은 `html[data-dmf]` 아래에 있어서, 플러그인이 꺼지면 스타일이 남아 있어도 적용되지 않습니다.
- 업스트림 `master`에는 설정 패널의 좁은 화면 대응이 일부 들어가 있습니다(아직 릴리스 전). 이 플러그인의 설정 규칙도 같은 배치(제목·닫기 / 가로 탭 / 내용)를 목표로 하지만, 화면 확인은 릴리스 `0.2.1-rc.3`에서만 했습니다. 새 릴리스가 나오면 CI의 `Upstream master` 결과와 실제 화면을 다시 확인하세요.

## 구조

| 경로 | 역할 |
|---|---|
| `src/mobile.css` | 스타일 원본 |
| `src/runtime.js` | 메뉴 버튼, 배경막, 서랍 자동 닫기, 스와이프, viewport 설정 |
| `client.js` | 브라우저 모듈. `npm run build`가 `src/`에서 생성합니다. |
| `index.js`, `cordis.patch.yml` | 호스트 쪽 빈 플러그인과 번들 패치 |
| `locale/*.json`, `icon.svg` | 플러그인 목록에 표시되는 이름, 설명, 아이콘 |
| `scripts/check-upstream.mjs` | Harness 체크아웃에 이 플러그인이 기대는 클래스, 속성, 레이아웃 서비스가 남아 있는지 확인 |
| `tests/runtime.test.mjs` | AppFrame과 같은 모양의 DOM(jsdom)에서 `client.js` 동작 확인 |

## 개발

```bash
npm install
npm run build     # src/ → client.js
npm run check     # client.js가 src/와 일치하는지
npm test          # 런타임 테스트
node scripts/check-upstream.mjs <dsh 체크아웃>   # 업스트림 구조 대조
```

`src/`를 고친 뒤에는 `npm run build`로 `client.js`를 다시 만들어 함께 커밋합니다.

## CI/CD

- **CI** (`.github/workflows/ci.yml`): push, PR, 주 1회(월요일 09:00 KST) 실행합니다.
  - `Package`: `client.js`와 `src/` 일치 여부, 모듈 문법, 메타데이터, 런타임 테스트, 패키지 파일 목록을 확인합니다.
  - `Upstream base`: 기준 릴리스 `dsh-v0.2.1-rc.3`(`1f81c047fc`)의 Harness에서 `check-upstream.mjs`를 돌립니다. 실패하면 CI가 실패합니다.
  - `Upstream master`: 같은 검사를 업스트림 최신 `master`에 돌립니다. 본체 구조가 바뀐 것을 미리 알려 주는 용도라 실패해도 CI를 막지 않습니다.
- **CD** (`.github/workflows/release.yml`): `package.json`의 버전과 같은 `v<버전>` 태그를 푸시하면 검사 후 `.tgz`를 만들어 GitHub Release에 첨부합니다. 저장소 시크릿에 `NPM_TOKEN`이 있으면 npm에도 배포합니다.

```bash
npm version patch   # package.json 버전 올리기 + 태그 생성
git push --follow-tags
```

## 라이선스

MIT. 선택자와 레이아웃 값은 DeepSeek Harness(MIT, Copyright (c) 2026 DeepSeek)의 구조를 따릅니다.
