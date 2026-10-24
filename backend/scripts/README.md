# ELMS Bulk Course Upload

## Quick Start

### 1. Start the Backend Server
```bash
cd W:\FinTech\elms\backend
npm run dev
```
Wait until you see `Server running on http://localhost:5000`.

### 2. Prepare Your Videos
Create a folder for your videos inside the project (or use an existing one):
```
W:\FinTech\video_lessons
```

Copy your downloaded videos there. Rename them to match the `videoFile` names in the manifest (or edit the manifest to match your filenames).

### 3. Configure the Manifest
```bash
copy scripts\course-manifest.example.json scripts\course-manifest.json
```

Edit `scripts/course-manifest.json`:
- Update `videoFolder` to your actual video folder path
- Change `videoFile` values to match your actual video filenames
- Adjust course/module/lesson titles if desired

### 4. Run the Upload Script
In a **new** terminal (keep the server running):
```bash
cd W:\FinTech\elms\backend
npx tsx scripts/upload-course.ts
```

### 5. Add More Videos Later
When you download more videos:
1. Drop them into the `videoFolder`
2. Re-run the script: `npx tsx scripts/upload-course.ts`
3. It will **automatically skip** already-created items and upload only the new/missing videos.

## How It Works

The script reads `course-manifest.json` and executes these steps:
1. **Login** as instructor (uses seed account by default)
2. **Create Category** (Finance) — skipped if already exists
3. **Create Course** — skipped if already exists (tracked in `.upload-state.json`)
4. **Create Modules** — skipped if already exists
5. **For each lesson:**
   - If video file exists on disk → upload it → create lesson with video URL
   - If video file missing → create lesson without a video (you can re-run later)

## State File

`.upload-state.json` is auto-generated. **Do not delete it** — it lets you re-run the script safely. It stores:
- Auth token
- Created category/course/module IDs
- Uploaded video URLs

## Troubleshooting

| Issue | Fix |
|---|---|
| `API error (409)` | Category or course already exists — this is usually fine, the script handles it. |
| `Video not found` | The `videoFile` in manifest doesn't exist in `videoFolder`. Check the path and filename. |
| `ECONNREFUSED` | Backend server isn't running. Start it first with `npm run dev`. |
| Upload timeouts | Videos up to 500MB are supported. For very large files, ensure you have a stable connection. |

## PowerShell Alternative (One-Liners)

If you prefer not using the script, here are the equivalent PowerShell commands after logging in:

```powershell
$BASE = "http://localhost:5000"
$login = Invoke-RestMethod -Uri "$BASE/api/v1/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"instructor@elms.edu","password":"Instructor123!"}'
$TOKEN = $login.data.accessToken

# Upload a video
curl -X POST "$BASE/api/v1/upload/videos" -H "Authorization: Bearer $TOKEN" -F "file=@W:\FinTech\video_lessons\my-video.mp4"
```
