# 3D Try-On MVP Setup Guide

This document explains the current implementation and the manual setup still required.

The project now has two generation/display modes:

- local MVP preview mode:
  - local `avatar.glb`
  - local or procedural garment preview
- Replicate mannequin mode:
  - backend asks Replicate for a dressed mannequin `GLB`
  - backend downloads that temporary `GLB`
  - backend uploads it to Firebase Storage
  - backend saves the Firebase URL in the database
  - frontend reopens that saved model later from history

## 1. What Is Already Implemented

### Backend

- `C:\Users\Administrator\Desktop\FYP\rhems\backend\src\controllers\designController.js`
  - builds the Replicate 3D prompt
  - injects measurements and garment description
  - asks for a mannequin with:
    - head
    - torso
    - full arms
    - hands
    - legs
    - feet
    - upright `A-pose`
  - infers a mannequin profile:
    - `male`
    - `female`
    - `androgynous`
  - uploads the returned `GLB` from Replicate to Firebase Storage
  - saves the Firebase URL in `Generation.render_url`

- `C:\Users\Administrator\Desktop\FYP\rhems\backend\src\utils\firebaseUpload.js`
  - fetches the temporary Replicate asset
  - uploads it to Firebase Storage
  - returns a signed Firebase URL

- `C:\Users\Administrator\Desktop\FYP\rhems\backend\src\config\firebase.js`
  - initializes Firebase Admin SDK from environment variables

### Frontend

- `C:\Users\Administrator\Desktop\FYP\rhems\frontend\src\pages\Dashboard.jsx`
  - sends the prompt, measurements, and garment options to the backend
  - stores the returned `render_url`
  - replays saved history

- `C:\Users\Administrator\Desktop\FYP\rhems\frontend\src\components\ThreeModel.jsx`
  - if `modelUrl` exists:
    - loads the generated mannequin `GLB`
  - otherwise:
    - loads local `avatar.glb`
    - shows local garment preview

## 2. What You Need Installed

Install these first:

- Node.js 18 or newer
- npm
- PostgreSQL

You also need:

- a Replicate account and API token
- a Firebase project with Storage enabled

## 3. Required Backend Environment Variables

Create:

- `C:\Users\Administrator\Desktop\FYP\rhems\backend\.env`

At minimum, it should contain:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/rhems"
JWT_SECRET="replace_this_with_a_long_random_secret"
PORT=5000
REPLICATE_API_TOKEN="r8_xxxxxxxxxxxxxxxxx"
FIREBASE_STORAGE_BUCKET="your-project-id.firebasestorage.app"
```

Then choose one Firebase credential method.

### Option A: single JSON string

Add:

```env
FIREBASE_SERVICE_ACCOUNT_JSON="{\"type\":\"service_account\",\"project_id\":\"your-project-id\",\"private_key_id\":\"...\",\"private_key\":\"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n\",\"client_email\":\"firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com\",\"client_id\":\"...\",\"auth_uri\":\"https://accounts.google.com/o/oauth2/auth\",\"token_uri\":\"https://oauth2.googleapis.com/token\",\"auth_provider_x509_cert_url\":\"https://www.googleapis.com/oauth2/v1/certs\",\"client_x509_cert_url\":\"...\"}"
```

If you use this option, you do not need the split Firebase variables below.

### Option B: split variables

Add:

```env
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Notes:

- keep the `\n` sequences inside `FIREBASE_PRIVATE_KEY`
- do not paste the private key as multiple physical lines unless you know your shell loader supports it

## 4. Firebase Manual Setup

Do this exactly in Firebase Console.

### Step 1: create or choose a Firebase project

Go to:

- [https://console.firebase.google.com/](https://console.firebase.google.com/)

Create a project if you do not already have one.

### Step 2: enable Firebase Storage

Inside the project:

1. open `Build`
2. open `Storage`
3. click `Get started`
4. choose your location
5. create the default bucket

You need the bucket name afterward.

Typical bucket names look like:

- `your-project-id.firebasestorage.app`
- or sometimes `your-project-id.appspot.com`

Use the exact bucket shown in Firebase.

### Step 3: create a service account key

Inside the same Firebase project:

1. click the gear icon
2. open `Project settings`
3. open the `Service accounts` tab
4. click `Generate new private key`
5. download the JSON file

From that JSON file, you will need either:

- the full JSON contents for `FIREBASE_SERVICE_ACCOUNT_JSON`
- or these fields for split env setup:
  - `project_id`
  - `client_email`
  - `private_key`

Keep that JSON file private.

### Step 4: confirm the service account can access Storage

This normally works automatically if you use the generated Admin SDK service account.

You do not need to make the bucket publicly readable because the backend creates signed URLs.

### Step 5: optional Storage Rules note

For this backend flow, the upload happens through Firebase Admin SDK.
That means Firebase Storage Rules do not block the server-side upload.

You can keep restrictive client-side rules for now.

## 5. Database Setup

Go to:

- `C:\Users\Administrator\Desktop\FYP\rhems\backend`

Run:

```powershell
npm install
```

Then run Prisma if your database is not initialized yet:

```powershell
npx prisma migrate dev
```

If asked for a migration name, use:

```text
init
```

## 6. Start The Backend

From:

- `C:\Users\Administrator\Desktop\FYP\rhems\backend`

Run:

```powershell
npm run dev
```

Expected behavior:

- server starts on `http://localhost:5000`
- when generation succeeds, Replicate returns a temporary model URL
- backend immediately uploads it to Firebase
- database stores the Firebase URL, not the temporary Replicate URL

## 7. Start The Frontend

From:

- `C:\Users\Administrator\Desktop\FYP\rhems\frontend`

Run:

```powershell
npm install
npm run dev
```

Expected behavior:

- frontend starts, usually on `http://localhost:5173`
- generation requests go to the backend
- history entries can reopen generated models after the original Replicate URL has expired

## 8. How The Mannequin Selection Works

The backend currently decides mannequin profile using prompt text and measurements.

### It tends toward `female` when the prompt mentions:

- dress
- gown
- skirt
- bodice
- bustier
- bralette
- blouse

### It tends toward `male` when the prompt mentions:

- suit
- tuxedo
- agbada
- senator
- menswear
- blazer

### Otherwise:

- it uses simple chest/waist/hips heuristics
- if still unclear, it falls back to `androgynous`

Important limitation:

- this is prompt guidance only
- Replicate may still return inconsistent mannequin styling

## 9. What Garments To Add Locally

Even with Replicate mannequin generation, keep a small local garment library.
You still need it for fallback preview and for any non-Replicate mode.

Add garment files here:

- `C:\Users\Administrator\Desktop\FYP\rhems\frontend\public\models\garments\`

Recommended first assets:

- `tailored-suit.glb`
- `senator-set.glb`
- `formal-draped-look.glb`
- `oversized-hoodie.glb`

These names should match the backend `catalogId` values.

## 10. How Measurement Dynamics Work In This MVP

There are now two different measurement behaviors.

### Local preview mode

When the frontend is showing the local avatar:

- measurements slightly adjust avatar proportions
- measurements influence procedural or local garment preview logic

This is lightweight approximation only.
It is not true morph-target body fitting yet.

### Replicate mannequin mode

When the backend is generating a remote mannequin:

- measurements are injected into the Replicate prompt
- Replicate interprets them semantically
- the final shape quality depends on the model following the prompt correctly

That means the measurement behavior is not deterministic in the Replicate branch.
It is AI-guided, not geometry-accurate.

## 11. Practical Limits Of This Firebase Flow

This solves one specific problem:

- Replicate asset URLs expire quickly

It does not solve these by itself:

- guaranteed accurate body morphing
- guaranteed male/female mannequin correctness
- guaranteed consistent A-pose output
- production-grade garment fitting

Those are model-quality and pipeline problems, not storage problems.

## 12. Recommended Next Engineering Steps

Do these next, in order:

1. confirm Firebase upload is working with one real generation
2. confirm the saved history reopens the same generated model after more than one hour
3. add local garment `GLB` files for the fallback path
4. move mannequin profile inference into a dedicated service if you want it easier to tune
5. add a database field like `storage_path` later if you want easier asset management inside Firebase

## 13. If You Want Me To Continue

The strongest next implementation step would be one of these:

1. add a Prisma column for Firebase `storagePath`
2. make the frontend show whether a history item is:
   - local preview
   - generated mannequin `GLB`
3. improve mannequin profile inference and prompt shaping
4. add garment `GLB` asset loading keyed by `catalogId`
