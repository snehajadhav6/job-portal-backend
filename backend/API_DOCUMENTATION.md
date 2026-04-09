# Backend ATS API Endpoints Documentation

Here are the complete specifications for the new API endpoints built into the backend. These can be mapped into your frontend (or provided to your third-party assessment platform).

---

### 1. Apply For Job (Triggers Mistral ATS Evaluation)
Used by candidates to submit their application. The backend halts until Mistral-7B scores the PDF before responding.

**Endpoint:** `POST /applications`
**Headers:** `Authorization: Bearer <Candidate_JWT>`
**Content-Type:** `multipart/form-data`

**Request Format:**
```javascript
// Form-Data
job_id: 1                       // (Required) Integer
resume: File                    // (Required) Valid PDF, JPG, or PNG string (Max: 5MB)
cover_letter: "string"          // (Optional) Text
college_name: "string"          // (Optional) Text
cgpa: 3.8                       // (Optional) Decimal
willing_to_relocate: true       // (Optional) Boolean
experience_years: 2             // (Optional) Integer
```

**Response (Success 201):**
```json
{
  "message": "Application submitted successfully",
  "applicationId": 5,
  "ats_score": 75,
  "status": "shortlisted",      // Will be 'shortlisted' (>=70) or 'rejected' (<70)
  "candidate_name": "Sneha",
  "job_role": "Backend Developer"
}
```

---

### 2. Update Assessment Score 
Used securely by the third-party coding platform (`assessment.shnoor.com`) to instantly push candidate scores right back into your backend. This auto-switches the application status to `test_completed`.

**Endpoint:** `POST /applications/update-test-score`
**Content-Type:** `application/json`

**Request Format:**
```json
{
  "application_id": 5,          // The ID of the application
  "test_score": 92.5            // Any Integer or Decimal score
}
```

**Response (Success 200):**
```json
{
  "candidate_name": "Sneha",
  "job_role": "Backend Developer",
  "ats_score": 75.00,
  "test_score": 92.5,
  "status": "test_completed"
}
```

---

### 3. Manager Approve For Interview
Used by your Manager frontend Dashboard to manually bump a tested candidate into the final interview stage. It shoots off the "Interview Shortlist" confirmation email instantly.

**Endpoint:** `PATCH /applications/manager-approve/:application_id`
**Headers:** `Authorization: Bearer <Manager_JWT>`
**Content-Type:** `application/json`

*(No Body required. Just pass the `application_id` directly in the URL!)*

**Response (Success 200):**
```json
{
  "candidate_name": "Sneha",
  "job_role": "Backend Developer",
  "ats_score": 75.00,
  "test_score": 92.5,
  "status": "interview_ready",
  "message": "Candidate approved for interview successfully"
}
```
