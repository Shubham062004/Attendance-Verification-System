# Manual, UAT, and Regression Testing Checklists

This document outlines the testing checklists and matrices used to verify features and ensure release stability before production deployment.

---

## 1. Student Attendance Flow Checklist

| Step | Action | Expected Behavior | Status |
| --- | --- | --- | --- |
| 1 | Scan QR / Navigate to Verification | Redirects to Student Location Verification page. | [ ] Pending |
| 2 | Allow GPS Permission | Geolocation triggers; distance to classroom coordinates is computed. | [ ] Pending |
| 3 | Allow Camera Permission | Video stream renders. Blink and Smile prompts display. | [ ] Pending |
| 4 | Capture Selfie Evidence | File is captured and sent to the cloud. | [ ] Pending |
| 5 | Submit Attendance | Record is created, risk score calculated, success screen is shown. | [ ] Pending |
| 6 | Weather and Hydration Advice | Current temp, hydration reminder, motivational quote, and GIF display. | [ ] Pending |

---

## 2. Admin Dashboard Flow Checklist

| Step | Action | Expected Behavior | Status |
| --- | --- | --- | --- |
| 1 | Log in as Administrator | Redirects to `/admin` dashboard instead of student view. | [ ] Pending |
| 2 | Create Daily Session | Classroom coordinates, range, class name, and room are set. | [ ] Pending |
| 3 | Generate Session QR Code | Cryptographically signed, auto-rotating dynamic QR code is displayed. | [ ] Pending |
| 4 | Monitor Active Logs | Live audit logs update with login, session creation, and submissions. | [ ] Pending |
| 5 | View Risk Analysis | Flags submissions with high deviation in GPS or missing blink/smile. | [ ] Pending |
| 6 | Export CSV/PDF Report | Generates clean, well-formatted spreadsheet or PDF summary. | [ ] Pending |

---

## 3. Regression Testing Suite
Before pushing updates, check that existing features have not broken:
- **Token Persistence**: Reloading the page maintains user login state via local storage or session storage.
- **JWT Expired Handling**: Expired JWT tokens automatically redirect the user to log in rather than locking the UI.
- **Offline Sync (Graceful Error)**: When network is lost during attendance submission, the user receives a helpful "Network offline" alert instead of a blank crash screen.

---

## 4. Error Handling Verification Matrix

| Error Scenario | How to Simulate | Expected App Behavior |
| --- | --- | --- |
| **GPS Denied** | Disable location permissions in browser. | Error message explaining how to enable GPS to proceed. |
| **Camera Denied** | Disable camera permissions in browser. | UI alert stating camera is required for liveness check. |
| **QR Code Expired** | Scan a QR code whose timestamp has passed. | Message: "QR code expired. Please scan the current code." |
| **Out of Range GPS** | Spoof coordinates to >100m away. | Attendance is submitted but marked as "FLAGGED" (High Risk). |
| **Cloudinary Offline**| Revoke Cloudinary API credentials. | Gracefully falls back to database-only save with warning logs. |
