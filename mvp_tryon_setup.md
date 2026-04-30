# 3D Try-On MVP Setup Guide

This document explains:

1. what has already been implemented in code
2. what you need to run locally
3. what manual work you need to do next
4. which third-party tools you should use later

The current MVP is a local unisex 3D try-on prototype.

It already does these things:

- collects body measurements in the frontend
- derives a body descriptor from those measurements
- accepts a garment description prompt
- converts the prompt into a structured outfit configuration on the backend
- renders a measurement-shaped neutral avatar and a simple 3D garment preview in the frontend
- saves generated outfit configurations to history

It does not yet do these things:

- import a real rigged avatar from a third-party platform
- simulate real cloth behavior
- load production garment meshes from `glb`
- generate true custom garments from AI text prompts

## 1. Current Code Structure

These are the main files you should know about:

- `backend/src/services/outfitConfigService.js`
  - converts prompt text into a structured outfit config
  - contains the current starter garment catalog

- `backend/src/controllers/designController.js`
  - receives measurements and prompt from the frontend
  - stores generated outfit configs in the database
  - returns saved history

- `frontend/src/pages/Dashboard.jsx`
  - measurement form
  - garment prompt box
  - garment starter selection
  - saved history selection

- `frontend/src/components/ThreeModel.jsx`
  - renders the local 3D avatar
  - applies the generated outfit config as simple garment geometry

## 2. Before You Run Anything

Make sure these are installed on your machine:

- Node.js 18 or newer
- npm
- PostgreSQL

You also need a database created in PostgreSQL.

Example:

- database name: `rhems`
- username: `postgres`
- password: `yourpassword`

## 3. Backend Setup

Go to:

- `C:\Users\Administrator\Desktop\FYP\rhems\backend`

### Step 1: create or update `backend/.env`

Make sure `backend/.env` contains:

```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/rhems"
JWT_SECRET="replace_this_with_a_long_random_secret"
PORT=5000
```

You do not need `REPLICATE_API_TOKEN` for this MVP path anymore.

### Step 2: install backend dependencies

Run:

```powershell
cd C:\Users\Administrator\Desktop\FYP\rhems\backend
npm install
```

### Step 3: run Prisma migration if needed

If your database has not been set up yet, run:

```powershell
npx prisma migrate dev
```

If Prisma asks for a migration name, use something like:

```text
init
```

### Step 4: start the backend server

Run:

```powershell
npm run dev
```

Expected result:

- backend starts on `http://localhost:5000`

You can test it in browser or PowerShell:

```powershell
Invoke-WebRequest http://localhost:5000/health
```

## 4. Frontend Setup

Go to:

- `C:\Users\Administrator\Desktop\FYP\rhems\frontend`

### Step 1: install frontend dependencies

Run:

```powershell
cd C:\Users\Administrator\Desktop\FYP\rhems\frontend
npm install
```

### Step 2: start the frontend

Run:

```powershell
npm run dev
```

Expected result:

- Vite starts, usually on `http://localhost:5173`

Open the frontend in the browser.

## 5. How To Test The MVP

### Step 1: register or log in

Use the login page in the browser.

### Step 2: enter measurements

In the dashboard, fill:

- height
- neck
- shoulders
- chest
- waist
- hips
- inseam
- sleeve

These values shape the preview avatar.

### Step 3: choose a garment idea

You can do one of these:

- click a starter garment card
- type your own prompt into the prompt box

Example prompts:

- `Tailored navy suit with structured shoulders and gold button accents`
- `Cream senator set with subtle embroidery and relaxed premium tailoring`
- `Emerald satin evening gown with sleeveless bodice and slit`
- `Oversized charcoal hoodie with streetwear proportions`

### Step 4: generate

Click:

- `Generate 3D Try-On Look`

Expected result:

- backend creates an outfit config
- frontend renders a new outfit on the avatar
- look is saved in history

### Step 5: replay from history

Click a saved look in the history section.

Expected result:

- the active outfit config changes
- the 3D scene updates to the selected look

Important:

- old history records from the previous image-generation system may not work correctly
- only newly generated looks from this MVP should be expected to replay properly

## 6. What You Should Do Next Manually

This section is the most important one for continuing the project.

The current garment shapes are procedural placeholders.
They are useful for the MVP, but not enough for a final project.

Your next manual work should be done in this order.

### Step A: create a real garment asset library

You should create real 3D garment files for a small first set of clothes.

Start with only 4 or 5 garments:

- `tailored_suit_jacket.glb`
- `tailored_trouser.glb`
- `senator_top.glb`
- `formal_draped_look.glb`
- `hoodie.glb`

Where to create them:

- Blender
- Marvelous Designer
- CLO3D

Recommended approach:

1. model each garment
2. keep topology clean
3. export each one as `glb`
4. keep scale consistent with your avatar

Where to put them in the project later:

- create a folder like `frontend/public/models/garments/`

Example:

- `frontend/public/models/garments/tailored_suit_jacket.glb`
- `frontend/public/models/garments/tailored_trouser.glb`

### Step B: replace procedural garments in the frontend

After you create garment files, the next implementation step is:

1. load the garment `glb` in `frontend/src/components/ThreeModel.jsx`
2. choose the correct garment based on `outfitConfig.catalogId`
3. apply colors/material overrides where needed

That change has not been done yet.

Right now `ThreeModel.jsx` still uses primitive meshes like:

- cylinders
- cones
- capsules

### Step C: move to a better avatar source

The current avatar is also procedural.
It is acceptable for an MVP, but not for a serious final try-on.

For this project, prefer a neutral or customizable avatar base rather than a gender-locked one.

You should choose one of these routes:

#### Option 1: MakeHuman

Use if you want the easiest next step.

What to do:

1. download MakeHuman
2. create a base avatar
3. export it as `fbx` or `obj`
4. convert to `glb` if needed using Blender
5. place the final model in:
   - `frontend/public/models/avatar.glb`

Why choose it:

- easier than SMPL
- good enough for student MVP progress

#### Option 2: SMPL-based avatar

Use if you want a more research-oriented body model.

What to do:

1. get access to the SMPL model according to its licensing terms
2. build or use a measurement-to-shape mapping step
3. export a mesh or `glb` for frontend rendering

Why choose it:

- more academically credible
- better path if your report emphasizes body parameterization

Why not choose it first:

- significantly more engineering complexity

#### Option 3: Meshcapade or similar platform

Use if you want a commercial body-avatar route.

What to do:

1. create an account on the platform
2. review its avatar generation or API docs
3. test whether it accepts body measurements directly
4. export or retrieve a usable mesh format

Why choose it:

- may reduce body-model engineering work

Why not choose it first:

- platform dependency
- possible cost and licensing constraints

### Step D: attach real garments to the real avatar

Once you have:

- a real avatar mesh
- real garment meshes

you need to make them work together.

At MVP level, do this manually first:

1. open avatar and garment in Blender
2. align garment to avatar
3. adjust scale
4. export corrected version
5. test in frontend

This is the simplest path.

Do not try to build automatic cloth simulation immediately.

### Step E: later add actual cloth simulation

Only after the earlier steps are stable.

Possible tools:

- CLO3D
- Marvelous Designer
- Blender cloth workflow

What this would be used for:

- more realistic draping
- better sleeve behavior
- better dress or gown fall

This is a later-phase feature, not the immediate next step.

## 7. Where Third-Party APIs Fit Later

The current MVP does not need an external AI API.

When you add one later, use it for structured reasoning, not direct final rendering.

### Recommended use of an AI API

Good use:

- convert prompt text into outfit parameters
- classify garment category
- infer fabric, sleeve length, fit type, embroidery, slit, belt, and colors

Example output:

```json
{
  "catalogId": "evening-gown",
  "silhouette": "flowing",
  "sleeveLength": "sleeveless",
  "material": "satin",
  "primaryColor": "#047857",
  "accentColor": "#d4af37",
  "detailFlags": {
    "embroidery": false,
    "belt": false,
    "slit": true,
    "pockets": false,
    "layered": false
  }
}
```

Bad use:

- ask an image model to generate the final try-on image and then pretend it is 3D

### If you want to use OpenAI later

You would add:

1. API key in backend `.env`
2. a backend service like:
   - `backend/src/services/promptParserService.js`
3. call that service from `designController.js`
4. validate the JSON response before saving it

That is not implemented yet.

## 8. Recommended Immediate Next Task

If you want the project to become visibly more realistic, do this next:

1. create one real garment in Blender
2. export it as `glb`
3. tell me the exact path of that file
4. I will wire it into `ThreeModel.jsx`

The best first garment to build is:

- `senator_top.glb`

Why:

- simpler than a full suit
- easier to align than a gown
- directly relevant to your domain

## 9. Recommended Order Of Work

Follow this order:

1. run the current MVP locally
2. generate and save a few looks
3. create one real garment asset
4. integrate that garment into the viewer
5. replace the procedural avatar with a real avatar model
6. expand the catalog
7. add AI-based prompt parsing
8. add optional cloth simulation later

## 10. If You Want Me To Continue

The best next coding task is one of these:

1. integrate `glb` garment loading into the frontend viewer
2. redesign the database so outfit config has its own Prisma column
3. add a real prompt-to-JSON parser service
4. add avatar preset saving and loading

If you want, I can start with `1` now and prepare the codebase so you only need to drop garment files into a folder. 
