## Change Request: Party ID & Host Flow Integration (iOS + Web)

### Overview
The **party ID logic** and **queue persistence (DB)** are already implemented in backend and web frontend.  
This task is to integrate and align the iOS Swift app with the same logic and ensure both platforms behave identically.

All API endpoints must be tested and adjusted if necessary.

---

## 1. iOS App (Swift)

### Step 1: “Ich bin ein Gastgeber”
- This button **remains unchanged**
- On click → navigate to a new view with **2 buttons**

---

### Step 2: Show 2 Buttons

### 1. “Create Party”
Flow:
1. Tap “Create Party”
2. Spotify Login
3. Create party via backend
4. Navigate to **Dashboard**

---

### 2. “Open Dashboard”
Flow:
1. User enters **Host Party PIN**
2. Validate via backend
3. Load party using Party ID
4. Open **Dashboard in the app**

---

### Dashboard
- Load queue from DB
- Use party ID for all requests

---

### QR Code Tab
- Display:
  - **Host Party PIN**

---

## 2. Web App Changes

### Step 1: “Ich bin ein Gastgeber”
- This button **remains unchanged**
- On click → navigate to a new view with **3 buttons**

---

### Step 2: Show 3 Buttons

#### 1. “Create Party”
Flow:
1. Create party
2. Spotify login
3. Open **Dashboard**

---

#### 2. “Open Dashboard”
Purpose:
- If party was created in iOS

Flow:
1. Enter **Host Party PIN**
2. Validate PIN
3. Open **Dashboard (web)**

---

#### 3. “Open Startpage”
Flow:
1. Enter **Host Party PIN**
2. Validate PIN
3. Open **Startpage of the party**

---

## 3. Backend / API

Ensure endpoints support:

- Create party (host)
- Fetch party by:
  - Party ID
  - Host PIN
- Persistent queue handling
- Spotify authentication

---

## 4. Consistency Requirements

- Same logic for:
  - iOS app
  - Web app
- Shared identifiers:
  - Party ID
  - Host PIN
- No platform-specific deviations

---

## 5. Final Behavior

- Parties created on web ↔ accessible in iOS
- Parties created in iOS ↔ accessible in web
- Queue is always loaded from DB
- Host PIN is required to access dashboards/startpages
- UX flow is consistent across both platforms