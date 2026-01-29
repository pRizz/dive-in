## ISSUES FOUND

**Phase:** 04-history-export-ci-gates  
**Plans checked:** 1  
**Issues:** 0 blocker(s), 1 warning(s), 0 info

### Warnings (should fix)

**1. [scope_sanity] Plan modifies 14 files (over 10 warning threshold)**
- Plan: 04-01
- Fix: Consider splitting UI work (Task 3) into a follow-on plan or reducing file touches.

### Coverage Summary

| Requirement | Plans | Status |
|-------------|-------|--------|
| View saved analysis history per image/tag | 04-01 | Covered |
| Export analysis reports (JSON/HTML) and share summary | 04-01 | Covered |
| Generate CI thresholds or `.dive-ci` rules | 04-01 | Covered |

### Structured Issues

```yaml
issues:
  - plan: "04-01"
    dimension: "scope_sanity"
    severity: "warning"
    description: "Plan modifies 14 files (over 10 warning threshold)"
    fix_hint: "Split UI work into a follow-on plan or reduce file touches"
```

### Recommendation

1 warning remains. Plan is otherwise coherent and covers phase requirements.
## ISSUES FOUND

**Phase:** 04-history-export-ci-gates  
**Plans checked:** 1  
**Issues:** 0 blocker(s), 3 warning(s), 0 info

### Warnings (should fix)

**1. [verification_derivation] HTML export is required in must_haves but optional in success criteria**
- Plan: 01
- Fix: Align `<success_criteria>` (and verification if needed) to require HTML summary export so it matches must_haves truths.

**2. [key_links_planned] UI dialogs calling export/CI endpoints not listed**
- Plan: 01
- Fix: Add key_links for `exportdialog.tsx` → `/history/:id/export` + `/history/:id/export/:format` and `cigatedialog.tsx` → `/ci/rules`.

**3. [scope_sanity] Plan touches 14 files**
- Plan: 01
- Fix: Consider splitting backend (history/export/ci) and UI wiring into two plans if context gets tight.

### Structured Issues

```yaml
issues:
  - plan: "01"
    dimension: "verification_derivation"
    severity: "warning"
    description: "must_haves requires HTML export, but success_criteria says HTML is optional."
    fix_hint: "Make HTML summary export required in success_criteria/verification to match must_haves."

  - plan: "01"
    dimension: "key_links_planned"
    severity: "warning"
    description: "Key links omit UI dialogs calling export and CI rule endpoints."
    fix_hint: "Add key_links for exportdialog -> /history/:id/export + /history/:id/export/:format and cigatedialog -> /ci/rules."

  - plan: "01"
    dimension: "scope_sanity"
    severity: "warning"
    description: "Plan modifies 14 files, approaching context budget."
    fix_hint: "Split into backend vs UI plans if execution feels risky."
```

### Recommendation

Warnings should be addressed to reduce risk before execution.
