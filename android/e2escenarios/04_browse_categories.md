# Scenario 4: Browse Categories

**Steps:**
1. Login and reach MainScreen (Marketplace tab)
2. Observe the category filter section

**Expected Results:**
- [ ] Categories load automatically on Marketplace tab
- [ ] 11 categories displayed:
  - Moving & Transport
  - Delivery
  - Assembly & Installation
  - Cleaning
  - Tutoring & Teaching
  - Tech Support
  - Event Help
  - Shopping & Errands
  - Pet Care
  - Photography
  - Other
- [ ] Categories shown with Vietnamese names
- [ ] Can select/deselect categories to filter tasks

**What to Check in Logcat:**
```
CategoryViewModel: Loading categories
OkHttp: --> GET http://localhost:8080/api/v1/categories
AuthInterceptor: Adding Authorization header
OkHttp: Authorization: Bearer eyJhbGc...
OkHttp: <-- 200 OK
CategoryViewModel: 11 categories loaded
```

**Automated Test:** `BrowseTasksE2ETest` (partially covers category loading)
