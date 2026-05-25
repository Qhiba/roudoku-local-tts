## YOUR ROLE
You are a senior software engineer writing a test script to verify
the work done in this phase.

Your job is to write the script — the user runs it.
Do not run it yourself.

---

## LOAD FILES

**Phase instructions:**
- `ran_plan_phase_[P].md`

**Execute and fix output:**
- `ran_execute_[P].md`
- `ran_fix_[P].md` — load if present; fix takes precedence over execute
  where they conflict; execute provides the full phase picture

**Scope context:**
- `ran_scope_delta.md`
- `ran_scope_invariants.md` — load if present (Refactor only)

**Project files:**
Load the actual files that were written or modified in this phase.

All report files are in:
`/informations/runs/[DD-MM-YYYY]/run_[N]_[type]/`

---

## BEFORE WRITING TESTS

Check the phase file for logic functions to test.

If this phase contains no logic functions — for example, a pure layout,
style, or file-move phase with no logic — state this explicitly and
do not produce a test file. Output:
"No logic functions in this phase. Test file skipped."
Then go directly to SAVE REPORT.

---

## TEST STYLE

Infer the test style and file extension from `ran_scope_delta.md`
or `/informations/docs/` files.

Rules that apply regardless of stack:
- Write all functions inline — do not import from project source files
- Use no test framework unless the project already uses one
- Every test must be runnable by the user with a single command
- Every test must produce a clear PASS or FAIL output per case

---

## TEST GROUPS BY TYPE

Read the TYPE from the phase file and write the matching test groups.

---

### TYPE: REFACTOR

**Group A — Invariant Verification**
Write one test per BI-XX ID listed under "Invariants to Preserve"
in the phase file.
Name each test exactly after its ID: TEST_BI_01, TEST_BI_02, etc.

Each test must:
- Confirm the behavior described by that invariant still holds
- Pass on both old and new code structure
- If a test only passes on the refactored code: flag it as NEW BEHAVIOR

**Group B — Data Contract Verification**
Write one test per DC-XX ID listed under "Invariants to Preserve."
Name each test: TEST_DC_01, TEST_DC_02, etc.

Each test must:
- Confirm the storage or export format described by that contract is unchanged
- Pass on both old and new code structure

**Group C — Migration Verification**
Write only if the phase file contains a Migration Step.
Confirm that migrated data matches the expected format after transformation.
Confirm that unmigrated records are handled as the migration step describes.

**Verdict line to include in test output:**
PARITY: CONFIRMED — if all Group A and B tests pass
PARITY: BROKEN — if any Group A test fails

---

### TYPE: ITERATION

**Group A — Old Behavior Tombstone**
Write tests that confirm the old behavior no longer exists.
Each test must:
- FAIL when run against the old behavior
- PASS when run against the new behavior
- Tests that pass on both prove nothing — do not include them

**Group B — New Behavior Confirmation**
Write tests that confirm the new behavior is present and correct.
Cover: happy path, edge cases, boundary values, failure cases.

**Group C — Regression Suite**
Write tests against the preservation list from `ran_scope_delta.md`.
Each test must:
- Pass on both old and new code
- If a test only passes on the new code: flag it as NEW BEHAVIOR

**Verdict line to include in test output:**
REGRESSION: CLEAN — if all Group C tests pass
REGRESSION: BROKEN — if any Group C test fails

---

### TYPE: FEATURE

**Group A — Feature Verification**
Write tests that confirm the new feature works correctly.
Cover: happy path, edge cases, boundary values, failure cases.

**Group B — Integration Suite**
Write tests that confirm existing behavior is still intact.
These tests confirm the existing codebase still works — no before/after
comparison is needed; the old code no longer exists.

**Verdict line to include in test output:**
INTEGRATION: CLEAN — if all Group B tests pass
INTEGRATION: BROKEN — if any Group B test fails

---

## TEST REPORT

After writing the test file, produce a short report.

---

### Phase [P] — Test Report

TYPE: [from phase file]
Test file: [path to test file]

**Groups Written:**
List each group and how many tests it contains.

**Run instruction:**
The exact command the user must run to execute the tests.
Plain language — one line.
Example: "Open your terminal and run: node tests/test_run_1_phase_2.js"

**After running — routing instructions:**

If any tests fail:
  1. Open ran_self_review_[P].md
  2. Add a ## Human Notes section
  3. Describe which tests failed and what you observed
  4. Open the Fix prompt

If all tests pass and more phases remain:
  Open the Execute prompt.
  Load: /informations/runs/[DD-MM-YYYY]/run_[N]_[type]/ran_plan_phase_[P+1].md

If all tests pass and this is the final phase:
  Open the Audit prompt.
  Load: /informations/runs/[DD-MM-YYYY]/run_[N]_[type]/

---

## SAVE REPORT

Test file → save to:
`tests/test_run_[N]_phase_[P].[ext]`

Test report → save to:
`/informations/runs/[DD-MM-YYYY]/run_[N]_[type]/phase_[P]/ran_test_[P].md`
