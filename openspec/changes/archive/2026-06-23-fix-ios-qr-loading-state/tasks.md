# Tasks

## 1. QR loading state
- [x] 1.1 In `QRCodeView.swift`, initialize `isLoadingQR` to `true` so the spinner shows on first render until the fetch completes

## 2. Verify
- [ ] 2.1 Manually verify on device/simulator: opening the iOS admin dashboard shows a spinner in the QR area immediately, replaced by the QR image once it loads

> Note: implementation landed in commit `06e51a43` (alongside the AdminDashboard gradient styling, which carries no spec behavior); task recorded retroactively. Manual check not run in this session.
