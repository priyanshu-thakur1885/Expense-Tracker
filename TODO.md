# Fix Daily Target Responsiveness to Monthly Budget Changes

## Tasks
- [x] Modify budget update route to recalculate dailyTarget after monthlyLimit changes
- [ ] Test that dailyTarget updates correctly when budget is modified
- [ ] Verify dashboard displays updated daily target

## Details
The dailyTarget calculation only happens in the pre-save hook, which doesn't run on updates. Need to manually recalculate dailyTarget in the PUT /budget route after updating monthlyLimit.
