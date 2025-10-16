# TODO: Implement Monetization and AI Assistant for Expense Tracking App

## Monetization Implementation
- [x] Update User model to include membershipPlan field (enum: 'gym', 'lpu', 'normal')
- [x] Modify Login.js to display membership plans with different login options
- [x] Add demo Razorpay payment modal for gym membership (19/-)
- [x] Update auth routes to assign membership during login callback
- [x] Update AuthContext to verify and store membership information
- [ ] Add conditional rendering in components based on membership
- [ ] Test all membership flows including demo mode

## AI Assistant Implementation
- [ ] Update Expense model to include broader category mapping (Food & Drinks, Transport, Shopping, Utilities, Entertainment, Other)
- [ ] Add new API endpoint for categorizing expenses (POST /api/expenses/categorize)
- [ ] Add new API endpoint for spending insights (GET /api/expenses/insights)
- [ ] Add new API endpoint for predicting future spending (GET /api/expenses/predict)
- [ ] Add new API endpoint for generating reports (GET /api/expenses/report)
- [ ] Test all new endpoints with demo mode support
- [ ] Update server.js to register new routes if needed
