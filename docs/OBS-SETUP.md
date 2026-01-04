# OBS Browser Source 설정 가이드

## 1. Browser Source 추가

1. OBS Studio 실행
2. Sources 패널에서 **+** 클릭
3. **Browser** 선택
4. 새 소스 이름 입력 (예: `Coding Overlay`)

## 2. Browser Source 설정

### URL 설정

| 환경 | URL |
|------|-----|
| 로컬 개발 | `http://localhost:3001/overlay/` |
| Railway 배포 | `https://your-app.up.railway.app/overlay/` |

### 권장 설정

| 설정 | 값 |
|------|-----|
| Width | 1920 |
| Height | 1080 |
| FPS | 30 |
| Custom CSS | (아래 참조) |
| Shutdown source when not visible | ✅ 체크 |
| Refresh browser when scene becomes active | ✅ 체크 |

### Custom CSS (투명 배경)

```css
body {
  background-color: transparent !important;
}
```

## 3. Scene 구성 예시

### 레이어 순서 (아래 → 위)

```
1. Window Capture (터미널/에디터)
2. Coding Overlay (Browser Source)
3. Webcam (선택)
```

### Scene 구성

```
┌─────────────────────────────────────────────────────────┐
│ [상단 헤더: 제목 | 타이머 | 금액]                        │
├────────────────────────────────────┬────────────────────┤
│                                    │  Active Projects   │
│                                    │  ┌──────────────┐  │
│     Window Capture                 │  │ Project 1    │  │
│     (터미널/VS Code)               │  │ Last commit  │  │
│                                    │  ├──────────────┤  │
│     1600 x 900                     │  │ Project 2    │  │
│                                    │  │ Last commit  │  │
│                                    │  └──────────────┘  │
│                                    │      320 x 900     │
├────────────────────────────────────┴────────────────────┤
│ [하단 바: 활동 피드]                      1600 x 100     │
└─────────────────────────────────────────────────────────┘
```

## 4. 문제 해결

### Overlay가 보이지 않음

1. 서버 실행 확인: `curl http://localhost:3001/health`
2. URL 끝에 `/` 포함 확인: `/overlay/` (O), `/overlay` (X)
3. OBS에서 Browser Source 새로고침

### WebSocket 연결 실패

1. 브라우저 콘솔 (F12)에서 오류 확인
2. 방화벽 설정 확인 (Port 3001)
3. CORS 오류 시 서버 재시작

### 투명 배경이 적용 안됨

Custom CSS에 추가:
```css
body, html {
  background: transparent !important;
}
```

## 5. 단축키 설정 (권장)

| 기능 | 단축키 |
|------|--------|
| Overlay 새로고침 | `Ctrl+F5` |
| Scene 전환 (코딩) | `F1` |
| Scene 전환 (휴식) | `F2` |
