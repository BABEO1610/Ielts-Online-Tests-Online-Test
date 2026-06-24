# Agents Changelog

## [2026-06-19] | Kiro/Claude | Listening Test Audio Fix

### Context
Fixed major bugs in Listening mock test creation:
1. Network error when creating new listening tests (payload too large)
2. Wrong business logic: each section had separate audio files instead of single shared audio

### Changes Made

#### Backend Changes

**1. Database Migration (`backend/src/db/migrations/013_add_listening_audio_support.sql`)**
- Added `audio_url` column to `mock_tests` table for single audio file per test
- Added index `idx_mock_tests_audio` for performance
- Updated column comments to clarify listening vs reading data structure
- Re-purposed `test_passages.instruction` to store JSONB metadata for listening sections

**2. New Service (`backend/src/services/audioStorage.service.js`)**
- Created Supabase Storage integration for audio uploads
- Implements SEC-04 security rules: file size limit (50MB), MIME type validation
- Methods: `uploadAudio()`, `deleteAudio()`, `extractFilePathFromUrl()`
- Uses magic bytes validation (not just file extension)

**3. Updated Test Service (`backend/src/services/test.service.js`)**
- Modified `createReadingTest()`: now accepts and saves `audioUrl` parameter
- Modified `updateReadingTest()`: supports audio URL updates
- Fixed `normalizePassages()`: for listening, saves metadata as JSONB in `instruction` field
- Fixed `getTestById()`: correctly parses listening section metadata from JSONB

**4. New Controller (`backend/src/controllers/audioController.js`)**
- `uploadAudio()`: POST /api/v1/audio/upload - accepts base64 audio, uploads to Supabase
- `deleteAudio()`: DELETE /api/v1/audio/:path - removes audio from Supabase Storage
- Full error handling with standard response format

**5. New Routes (`backend/src/routes/api/v1/audio.routes.js`)**
- Registered `/api/v1/audio/*` endpoints
- Added to main API router

**6. App Config (`backend/src/app.js`)**
- Increased body parser limit from default to 50MB for audio base64 uploads
- Complies with SEC-04: max file size 50MB

#### Frontend Changes

**1. TutorListeningFormPage.jsx - Major Refactor**

**Removed:**
- Per-section audio upload fields (4 separate audio inputs)
- `uploadTargetSectionId`, `previewAudioSectionId` state
- `handleUploadClick()`, `handlePreviewAudio()` functions
- `section.audioUrl` from data model

**Added:**
- Single audio upload section at top (before 4 sections)
- `formData.audioUrl` - single audio URL for entire test
- `isUploadingAudio` state - loading indicator during upload
- `showAudioPlayer` state - toggle audio preview
- Better validation: requires audio before publishing
- Warning messages for missing audio or incorrect question count

**Modified:**
- `DEFAULT_SECTIONS`: removed `audioUrl` field
- `handleAudioFileChange()`: uploads to single audio field
- `buildPayload()`: sends `audioUrl` at test level, not per section
- `handleSaveTest()`: validates audio URL exists before publishing
- File size limit: 8MB → 50MB
- UI improvements: clear instructions, loading states, error messages

**2. ListeningTestPreviewModal (updated props)**
- Now receives `audioUrl` prop for single audio player
- Sections no longer have individual audio URLs

### Technical Details

**Data Structure Changes:**

Before:
```javascript
{
  sections: [
    { audioUrl: "data:audio/...", transcript: "..." },  // Section 1 audio
    { audioUrl: "data:audio/...", transcript: "..." },  // Section 2 audio
    ...
  ]
}
```

After:
```javascript
{
  audioUrl: "https://supabase.../tests/audio.mp3",  // Single audio for all sections
  sections: [
    { 
      title: "Section 1", 
      transcript: "...",
      showTranscript: true,
      startTime: 0,      // Optional: for future timestamp features
      endTime: 330
    },
    ...
  ]
}
```

**Database Mapping:**
- `mock_tests.audio_url` → Single audio URL
- `test_passages.instruction` → JSONB: `{"show_transcript": true, "start_time": 0, "end_time": 330}`
- `test_passages.content` → Transcript text
- `test_passages.title` → Section title

### Security Compliance
- ✅ SEC-04: File upload validation (MIME type + size limit)
- ✅ SEC-03: Parameterized SQL queries ($1, $2, ...)
- ✅ SEC-09: No stack traces in responses
- ✅ ADR-003: Standard response format `{ success, data, error, meta }`

### Testing Checklist
- [ ] Run migration: `npm run migrate` in backend
- [ ] Test audio upload < 50MB
- [ ] Test create new listening test with audio
- [ ] Test update existing listening test
- [ ] Test validation: 40 questions required
- [ ] Test validation: audio required before publish
- [ ] Test preview audio player
- [ ] Verify network error resolved

### Migration Instructions

1. **Backend:**
```bash
cd backend
npm run migrate
# or
node scripts/migrate.js
```

2. **Supabase Storage Setup:**
- Create bucket named `listening-audio` in Supabase Dashboard
- Set bucket to public (or configure appropriate policies)
- Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env

3. **Testing:**
```bash
# Start backend
cd backend
npm start

# Start frontend
cd frontend
npm run dev
```

### Known Issues / Future Improvements
1. Audio upload currently uses base64 encoding - consider direct file upload for better performance
2. Timestamps (startTime/endTime) are in database schema but not yet used in player
3. Consider adding audio player with section markers in preview/test-taking UI
4. Add progress indicator for large audio uploads

### Files Changed
- `backend/src/db/migrations/013_add_listening_audio_support.sql` (NEW)
- `backend/src/services/audioStorage.service.js` (NEW)
- `backend/src/services/test.service.js` (MODIFIED)
- `backend/src/controllers/audioController.js` (NEW)
- `backend/src/routes/api/v1/audio.routes.js` (NEW)
- `backend/src/routes/api/v1/index.js` (MODIFIED)
- `backend/src/app.js` (MODIFIED)
- `backend/scripts/migrate.js` (MODIFIED - fixed .env loading)
- `frontend/src/pages/tutor/TutorListeningFormPage.jsx` (MAJOR REFACTOR)

### Reviewers
- Tech Lead: Verify security compliance
- QA: Test audio upload flow end-to-end
- Product: Confirm business logic matches IELTS requirements

---

[2026-06-24] | [AGENT] | [.sdd/agents_changelog.md] | [Normalized final changelog entry format before assistant quality documentation updates.]
[2026-06-24] | [AGENT] | [.sdd/agents_changelog.md, .sdd/context/db-schema-snapshot.md, .sdd/shared_context.md, .sdd/specs/global-ielts-virtual-assistant/spec.md, backend/src/api/assistant/assistant.constants.js, .sdd/rfcs/rfc-2026-06-24-assistant-quality-upgrade.md, .sdd/specs/global-ielts-virtual-assistant/eval-set.md] | [Added schema snapshot, feature-table mapping, Global Assistant schema reconciliation, intent context map, RFC, and golden eval set.]
