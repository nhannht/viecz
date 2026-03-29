#!/usr/bin/env python3
"""Migrate open YouTrack issues to GitHub Issues with sub-issue relationships."""

import subprocess
import json
import time
import sys

REPO = "nhannht/viecz"

# All 52 open issues organized by hierarchy
# Format: (youtrack_id, summary, description, labels, state)
# Parents/standalone first, subtasks after

PARENTS = [
    # KNS standalone tasks
    ("KNS-224", "Fix whale free-swim behavior — movement too flat and static after entrance",
     "Fix whale free-swim behavior. Movement too flat and static after entrance animation.\n\n_Migrated from YouTrack KNS-224_",
     ["kns", "in-progress"], "open"),
    ("KNS-225", "Fix whale entrance animation — rotation locked, skeleton looks frozen",
     "Fix whale entrance animation — rotation locked, skeleton looks frozen.\n\n_Migrated from YouTrack KNS-225_",
     ["kns", "in-progress"], "open"),
    ("KNS-223", "Add Three.js debug visualization tools (trail, lil-gui, helpers)",
     "Add Three.js debug visualization tools (trail, lil-gui, helpers).\n\n_Migrated from YouTrack KNS-223_",
     ["kns", "in-progress"], "open"),
    ("KNS-222", "Replace angular-three with standard Three.js for whale model hero 3D rendering",
     "Replace angular-three with standard Three.js for whale model hero 3D rendering.\n\n_Migrated from YouTrack KNS-222_",
     ["kns", "in-progress"], "open"),
    ("KNS-221", "Add 3D glass egg to hero section using Three.js",
     "Add 3D glass egg to hero section using Three.js.\n\n_Migrated from YouTrack KNS-221_",
     ["kns", "in-progress"], "open"),
    ("KNS-220", "Liquid glass hero section for non-login landing page",
     "Liquid glass hero section for non-login landing page.\n\n_Migrated from YouTrack KNS-220_",
     ["kns", "in-progress"], "open"),
    ("KNS-208", "Split Storybook into two projects: metro-brutal + glassmorphism design systems",
     "Split Storybook into two projects: metro-brutal + glassmorphism design systems.\n\n_Migrated from YouTrack KNS-208_",
     ["kns", "in-progress"], "open"),
    ("KNS-206", "[Test] Demo issue for Jellyfish webhook testing",
     "Demo issue for Jellyfish webhook testing.\n\n_Migrated from YouTrack KNS-206_",
     ["kns"], "open"),
    ("KNS-205", "Bot hỗ trợ team quản lý task/project collaboration",
     "Bot hỗ trợ team quản lý task/project collaboration [cần thêm chi tiết cụ thể].\n\n_Migrated from YouTrack KNS-205_",
     ["kns"], "open"),
    ("KNS-204", "Bug: PayOS deposit allows double-spend via reused transaction code",
     "PayOS deposit allows double-spend via reused transaction code.\n\n_Migrated from YouTrack KNS-204_",
     ["kns", "bug"], "open"),
    ("KNS-203", "Login error",
     "Login error reported by user.\n\n_Migrated from YouTrack KNS-203 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-198", "Sơ đồ kiến trúc hệ thống",
     "Sơ đồ kiến trúc hệ thống.\n\n_Migrated from YouTrack KNS-198_",
     ["kns"], "open"),
    ("KNS-184", "Thu thập hình ảnh và logo cho báo cáo dự án",
     "Thu thập hình ảnh và logo cho báo cáo dự án.\n\nAssignee: thaikhabaofifa\n\n_Migrated from YouTrack KNS-184_",
     ["kns"], "open"),
    ("KNS-200", "Screenshot: Bản đồ với task pins",
     "Screenshot: Bản đồ với task pins.\n\n_Migrated from YouTrack KNS-200_",
     ["kns"], "open"),
    ("KNS-196", "Screenshot: Giao diện marketplace + luồng đăng việc",
     "Screenshot: Giao diện marketplace + luồng đăng việc.\n\n_Migrated from YouTrack KNS-196_",
     ["kns"], "open"),
    ("KNS-168", "Lỗi (bug report)",
     "Bug report from user.\n\n_Migrated from YouTrack KNS-168 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-146", "Self-host OSRM for real walking/driving distance and travel time",
     "Self-host OSRM for real walking/driving distance and travel time.\n\n_Migrated from YouTrack KNS-146_",
     ["kns", "enhancement"], "open"),
    ("KNS-145", "Nearby job notifications — alert users when new tasks appear near their location",
     "Nearby job notifications — alert users when new tasks appear near their location.\n\n_Migrated from YouTrack KNS-145_",
     ["kns", "enhancement"], "open"),
    ("KNS-132", "There isn't any email verify method",
     "No email verification method available.\n\n_Migrated from YouTrack KNS-132 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-130", "Installation issue",
     "Installation issue reported by user.\n\n_Migrated from YouTrack KNS-130 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-75", "Add avatar selection/upload to user profile",
     "Add avatar selection/upload to user profile.\n\n_Migrated from YouTrack KNS-75_",
     ["kns", "enhancement"], "open"),
    ("KNS-74", "Make taskerBio and taskerSkills editable from Android profile",
     "Make taskerBio and taskerSkills editable from Android profile.\n\n_Migrated from YouTrack KNS-74_",
     ["kns", "enhancement"], "open"),
    ("KNS-63", "Outdated showing error",
     "Outdated showing error.\n\n_Migrated from YouTrack KNS-63 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-56", "Allow task creator to edit task details",
     "Task creators need ability to edit task information (title, description, price, category, etc.).\nOnly the task creator should be allowed to edit.\nShould respect validation rules (e.g., available balance check on price increase).\n\n_Migrated from YouTrack KNS-56_",
     ["kns", "enhancement"], "open"),
    ("KNS-55", "Add user description and skills to profile with edit capability",
     "Add user description and skills to profile with edit capability.\n\n_Migrated from YouTrack KNS-55_",
     ["kns", "enhancement"], "open"),
    ("KNS-54", "Hide task from marketplace after applicant is accepted",
     "Hide task from marketplace after applicant is accepted.\n\n_Migrated from YouTrack KNS-54_",
     ["kns", "enhancement"], "open"),
    ("KNS-49", "Timed out and deletion",
     "Timed out and deletion issue.\n\n_Migrated from YouTrack KNS-49 (reporter: trangiasang77)_",
     ["kns", "bug"], "open"),
    ("KNS-47", "Implement email and phone number verification",
     "Implement email and phone number verification.\n\n_Migrated from YouTrack KNS-47_",
     ["kns", "enhancement"], "open"),
    ("KNS-46", "Add third-party authentication (Google, GitHub, etc.)",
     "Add third-party authentication (Google, GitHub, etc.).\n\n_Migrated from YouTrack KNS-46_",
     ["kns", "enhancement"], "open"),
    ("KNS-45", "Implement task deadline feature",
     "Implement task deadline feature.\n\n_Migrated from YouTrack KNS-45_",
     ["kns", "enhancement"], "open"),
    # KNS parent issues (have children)
    ("KNS-183", "HCMUS I&E 2025 — Cuộc thi Sáng tạo Khởi nghiệp",
     "HCMUS I&E 2025 — Cuộc thi Sáng tạo Khởi nghiệp.\n\n_Migrated from YouTrack KNS-183_",
     ["kns", "milestone"], "open"),
    ("KNS-177", "Vòng 1: Chuẩn bị và nộp hồ sơ dự thi HCMUS I&E 2025",
     "Parent issue tracking tất cả deliverables cho Vòng 1 cuộc thi Sáng tạo – Khởi nghiệp.\n\nDeadline: Cuối tháng 03/2026\nTeam: 4 thành viên\nDự án: Viecz\n\n_Migrated from YouTrack KNS-177_",
     ["kns", "milestone"], "open"),
    ("KNS-226", None, None, None, None),  # skip — already added above
    ("KNS-209", "Frostglass UI Design",
     "Major task: implement creative glass effects for the Frostglass theme.\n\nAll effects must be cross-platform (desktop web, mobile web, Android native).\nPrioritized in 3 tiers by impact vs complexity.\n\n_Migrated from YouTrack KNS-209_",
     ["kns", "enhancement"], "open"),
    ("KNS-149", "Android: Full nhannht-metro-meow theme + web feature parity",
     "Bring the Android app to full parity with the web client.\n\nTwo major tracks:\n1. Theme migration — Replace MD3 with nhannht-metro-meow\n2. Feature parity — Phone auth, bank withdrawal, geo search, map view, etc.\n\n_Migrated from YouTrack KNS-149_",
     ["kns", "milestone"], "open"),
    ("KNS-116", "Abuse prevention system",
     "Implement comprehensive abuse prevention measures.\n\nScope: Rate limiting, wallet race conditions, brute force protection, input bounds, user reporting/blocking, spam detection, input sanitization.\n\n_Migrated from YouTrack KNS-116_",
     ["kns", "enhancement"], "open"),
    ("KNS-29", "Production readiness for Android app",
     "Epic tracking all work needed to make the Viecz Android app production-ready for Play Store release.\n\nBlocking categories:\n- Release build config (signing, ProGuard, environments)\n- Security (token encryption, cleartext traffic, logging)\n- Data integrity (Room migrations)\n- Observability (crash reporting)\n- Deep link / manifest cleanup\n\n_Migrated from YouTrack KNS-29_",
     ["kns", "milestone"], "open"),
    # CVP issues
    ("CVP-1", "[Epic] Enterprise Code Review Pipeline for Viecz",
     "Enterprise Code Review Pipeline for Viecz.\n\n_Migrated from YouTrack CVP-1_",
     ["cvp", "milestone"], "open"),
    ("CVP-19", "Add benchmark regression detection for performance-critical paths",
     "Add benchmark regression detection for performance-critical paths.\n\n_Migrated from YouTrack CVP-19_",
     ["cvp", "enhancement"], "open"),
    ("CVP-11", "Add pre-push hook to run lint + tests before pushing",
     "Add pre-push hook to run lint + tests before pushing.\n\n_Migrated from YouTrack CVP-11_",
     ["cvp"], "open"),
    ("CVP-20", "Add dependency license compliance checking to CI",
     "Add dependency license compliance checking to CI.\n\n_Migrated from YouTrack CVP-20_",
     ["cvp"], "open"),
    ("CVP-14", "Add GitHub PR template with built-in review checklist",
     "Add GitHub PR template with built-in review checklist.\n\n_Migrated from YouTrack CVP-14_",
     ["cvp"], "open"),
    ("CVP-12", "Create dedicated accessibility review skill for Angular web",
     "Create dedicated accessibility review skill for Angular web.\n\n_Migrated from YouTrack CVP-12_",
     ["cvp", "enhancement"], "open"),
]

# Remove the duplicate KNS-226 marker
PARENTS = [(yt, s, d, l, st) for yt, s, d, l, st in PARENTS if s is not None]

# Subtasks: (youtrack_id, summary, description, labels, parent_youtrack_id)
SUBTASKS = [
    # KNS-226 children (underwater environment)
    ("KNS-227", "Underwater background gradient (CSS behind transparent canvas)",
     "Underwater background gradient (CSS behind transparent canvas).\n\n_Migrated from YouTrack KNS-227_",
     ["kns", "subtask"], "KNS-226"),
    ("KNS-230", "God rays — volumetric light shafts from above",
     "God rays — volumetric light shafts from above.\n\n_Migrated from YouTrack KNS-230_",
     ["kns", "subtask"], "KNS-226"),
    ("KNS-231", "Depth of field post-processing",
     "Depth of field post-processing.\n\n_Migrated from YouTrack KNS-231_",
     ["kns", "subtask"], "KNS-226"),
    ("KNS-232", "Water surface plane (viewed from below)",
     "Water surface plane (viewed from below).\n\n_Migrated from YouTrack KNS-232_",
     ["kns", "subtask"], "KNS-226"),
    # KNS-209 children (frostglass)
    ("KNS-217", "Condensation droplets — ambient + scroll-triggered",
     "Condensation droplets — ambient + scroll-triggered.\n\n_Migrated from YouTrack KNS-217_",
     ["kns", "subtask"], "KNS-209"),
    # KNS-177 children (competition prep) — KNS-177 is child of KNS-183
    ("KNS-178", "Điền phiếu đăng ký dự thi",
     "Điền phiếu đăng ký dự thi.\n\n_Migrated from YouTrack KNS-178_",
     ["kns", "subtask"], "KNS-177"),
    ("KNS-179", "Viết bản mô tả dự án Viecz (Word/PDF)",
     "Viết bản mô tả dự án Viecz (Word/PDF).\n\n_Migrated from YouTrack KNS-179_",
     ["kns", "subtask"], "KNS-177"),
    ("KNS-180", "Tạo slide/clip mô tả ý tưởng Viecz",
     "Tạo slide/clip mô tả ý tưởng Viecz.\n\n_Migrated from YouTrack KNS-180_",
     ["kns", "subtask"], "KNS-177"),
    ("KNS-181", "Chuẩn bị screenshots & demo sản phẩm Viecz",
     "Chuẩn bị screenshots & demo sản phẩm Viecz.\n\n_Migrated from YouTrack KNS-181_",
     ["kns", "subtask"], "KNS-177"),
    ("KNS-182", "Cập nhật bài nghiên cứu ý tưởng cho phù hợp thực tế",
     "Cập nhật bài nghiên cứu ý tưởng KNS-A-1 cho phù hợp thực tế.\n\n_Migrated from YouTrack KNS-182_",
     ["kns", "subtask"], "KNS-177"),
    # KNS-149 children (Android parity)
    ("KNS-155", "Android: Loading skeletons + error fallback components",
     "Android: Loading skeletons + error fallback components.\n\n_Migrated from YouTrack KNS-155_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-158", "Android: Distance badges on task cards",
     "Android: Distance badges on task cards.\n\n_Migrated from YouTrack KNS-158_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-159", "Android: Category chips filter in marketplace",
     "Android: Category chips filter in marketplace.\n\n_Migrated from YouTrack KNS-159_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-160", "Android: Bilingual UI (English + Vietnamese string resources)",
     "Android: Bilingual UI (English + Vietnamese string resources).\n\n_Migrated from YouTrack KNS-160_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-161", "Android: Task image gallery display",
     "Android: Task image gallery display.\n\n_Migrated from YouTrack KNS-161_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-162", "Android: Deadline display + overdue badges",
     "Android: Deadline display + overdue badges.\n\n_Migrated from YouTrack KNS-162_",
     ["kns", "subtask"], "KNS-149"),
    ("KNS-163", "Android: Escrow confirmation dialog on accept application",
     "Android: Escrow confirmation dialog on accept application.\n\n_Migrated from YouTrack KNS-163_",
     ["kns", "subtask"], "KNS-149"),
    # KNS-116 children (abuse prevention)
    ("KNS-117", "API rate limiting middleware",
     "API rate limiting middleware.\n\n_Migrated from YouTrack KNS-117_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-119", "Brute force login protection",
     "Brute force login protection.\n\n_Migrated from YouTrack KNS-119_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-120", "WebSocket rate limiting and abuse prevention",
     "WebSocket rate limiting and abuse prevention.\n\n_Migrated from YouTrack KNS-120_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-121", "Price and deposit upper bound validation",
     "Price and deposit upper bound validation.\n\n_Migrated from YouTrack KNS-121_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-122", "User reporting and blocking system",
     "User reporting and blocking system.\n\n_Migrated from YouTrack KNS-122_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-123", "Task spam detection",
     "Task spam detection.\n\n_Migrated from YouTrack KNS-123_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-124", "LIKE wildcard injection sanitization",
     "LIKE wildcard injection sanitization.\n\n_Migrated from YouTrack KNS-124_",
     ["kns", "subtask"], "KNS-116"),
    ("KNS-125", "Fake account / registration spam prevention",
     "Fake account / registration spam prevention.\n\n_Migrated from YouTrack KNS-125_",
     ["kns", "subtask", "in-progress"], "KNS-116"),
    # KNS-29 children (Android production readiness)
    ("KNS-33", "Add crash reporting (Firebase Crashlytics or Sentry)",
     "Add crash reporting (Firebase Crashlytics or Sentry).\n\n_Migrated from YouTrack KNS-33_",
     ["kns", "subtask"], "KNS-29"),
    ("KNS-38", "Add release build to CI/CD pipeline",
     "Add release build to CI/CD pipeline.\n\n_Migrated from YouTrack KNS-38_",
     ["kns", "subtask"], "KNS-29"),
    # KNS-56 children (task editing)
    ("KNS-72", "Add confirmation dialog for price change on edit",
     "Add confirmation dialog for price change on edit.\n\n_Migrated from YouTrack KNS-72_",
     ["kns", "subtask"], "KNS-56"),
    ("KNS-73", "Add edit history / 'Edited' badge on task cards",
     "Add edit history / 'Edited' badge on task cards.\n\n_Migrated from YouTrack KNS-73_",
     ["kns", "subtask"], "KNS-56"),
]

# KNS-177 is a sub-issue of KNS-183
NESTED_LINKS = [("KNS-177", "KNS-183")]


def run(cmd, check=True):
    result = subprocess.run(cmd, capture_output=True, text=True, shell=True)
    if check and result.returncode != 0:
        print(f"ERROR: {cmd}\n{result.stderr}", file=sys.stderr)
    return result


def create_issue(summary, description, labels):
    label_args = " ".join(f'--label "{l}"' for l in labels)
    # Escape description for shell
    desc_escaped = description.replace("'", "'\\''")
    cmd = f"gh issue create --repo {REPO} --title '{summary}' --body $'{desc_escaped}' {label_args}"
    result = run(cmd)
    if result.returncode == 0:
        url = result.stdout.strip()
        number = url.split("/")[-1]
        return int(number), url
    return None, None


def get_node_id(issue_number):
    cmd = f'gh api graphql -f query=\'{{ repository(owner: "nhannht", name: "viecz") {{ issue(number: {issue_number}) {{ id }} }} }}\''
    result = run(cmd)
    if result.returncode == 0:
        data = json.loads(result.stdout)
        return data["data"]["repository"]["issue"]["id"]
    return None


def add_sub_issue(parent_node_id, child_node_id):
    cmd = f'gh api graphql -f query=\'mutation {{ addSubIssue(input: {{ issueId: "{parent_node_id}", subIssueId: "{child_node_id}" }}) {{ issue {{ id }} }} }}\''
    result = run(cmd, check=False)
    return result.returncode == 0


def main():
    yt_to_gh = {}  # youtrack_id -> github_issue_number

    # Phase 1: Create parent/standalone issues
    print("=== Phase 1: Creating parent/standalone issues ===")
    for yt_id, summary, desc, labels, state in PARENTS:
        num, url = create_issue(summary, desc, labels)
        if num:
            yt_to_gh[yt_id] = num
            print(f"  {yt_id} -> #{num} {url}")
        else:
            print(f"  FAILED: {yt_id} - {summary}")
        time.sleep(0.5)  # rate limit

    # Phase 2: Create subtask issues
    print("\n=== Phase 2: Creating subtask issues ===")
    for yt_id, summary, desc, labels, parent_yt in SUBTASKS:
        num, url = create_issue(summary, desc, labels)
        if num:
            yt_to_gh[yt_id] = num
            print(f"  {yt_id} -> #{num} (parent: {parent_yt}) {url}")
        else:
            print(f"  FAILED: {yt_id} - {summary}")
        time.sleep(0.5)

    # Phase 3: Link sub-issues
    print("\n=== Phase 3: Linking sub-issues ===")
    for yt_id, summary, desc, labels, parent_yt in SUBTASKS:
        if yt_id not in yt_to_gh or parent_yt not in yt_to_gh:
            print(f"  SKIP: {yt_id} -> {parent_yt} (missing)")
            continue
        child_num = yt_to_gh[yt_id]
        parent_num = yt_to_gh[parent_yt]
        child_node = get_node_id(child_num)
        parent_node = get_node_id(parent_num)
        if child_node and parent_node:
            ok = add_sub_issue(parent_node, child_node)
            print(f"  {'OK' if ok else 'FAIL'}: #{child_num} -> sub of #{parent_num}")
        time.sleep(0.3)

    # Phase 4: Nested links (KNS-177 sub of KNS-183)
    print("\n=== Phase 4: Nested parent links ===")
    for child_yt, parent_yt in NESTED_LINKS:
        if child_yt not in yt_to_gh or parent_yt not in yt_to_gh:
            print(f"  SKIP: {child_yt} -> {parent_yt} (missing)")
            continue
        child_num = yt_to_gh[child_yt]
        parent_num = yt_to_gh[parent_yt]
        child_node = get_node_id(child_num)
        parent_node = get_node_id(parent_num)
        if child_node and parent_node:
            ok = add_sub_issue(parent_node, child_node)
            print(f"  {'OK' if ok else 'FAIL'}: #{child_num} -> sub of #{parent_num}")

    # Summary
    print(f"\n=== Done: {len(yt_to_gh)} issues created ===")
    print("\nMapping (YouTrack -> GitHub):")
    for yt, gh in sorted(yt_to_gh.items()):
        print(f"  {yt} -> #{gh}")


if __name__ == "__main__":
    main()
