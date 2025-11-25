# Invoice Overhaul - Implementation Status & Remaining Work

## ✅ Completed

### 1. API Client Unification
- **Status**: ✅ Complete
- **Changes**: 
  - Migrated `useInvoices` hook from `api/invoiceApi.js` to unified `lib/api/invoices.ts`
  - All invoice operations now use TypeScript client with proper types
  - Endpoints standardized: GET/POST/PUT/DELETE `/api/invoices`, `/api/invoices/:id/pdf`, `/api/invoices/:id/resend`

### 2. InvoiceRowActions Component
- **Status**: ✅ Complete
- **Changes**:
  - Replaced `onClick` with `onSelect` for all DropdownMenuItem components
  - Removed custom blue/slate colors, now using shadcn theme tokens
  - Added proper toast notifications for resend/delete actions
  - AlertDialog now uses theme tokens (`bg-destructive`, `text-destructive-foreground`)
  - Loading states shown with Loader2 spinner

### 3. Invoice Date Handling
- **Status**: ✅ Complete (from previous work)
- **Changes**:
  - `NewInvoiceModal` and `InvoiceDetailModal` now use Date objects with Calendar
  - Form validation schema updated to accept `z.date()`
  - Payload conversion to ISO string on submit

### 4. Tax/Discount Integer Enforcement
- **Status**: ✅ Complete (from previous work)
- **Changes**:
  - Input fields accept whole numbers only
  - onBlur clamps values between 0-100 and rounds
  - Payload explicitly converts to integers via `Math.round(parseInt(...))`

## 🔧 InProgress

### 5. InvoiceTable Theme Tokens
- **Status**: 🔧 Partially Complete
- **What's Done**:
  - Card loading skeleton already uses theme tokens
  - Row actions updated with theme tokens via InvoiceRowActions
- **Remaining Work** (see code block below):
  ```jsx
  // In InvoiceTable.jsx, replace remaining slate classes:
  
  // Line ~152: Tabs styling
  <TabsList className="bg-slate-900/60 border border-slate-800">
  // Should be:
  <TabsList>
  
  // Line ~175: Table header
  <TableHeader className="bg-slate-900/50">
    <TableRow className="border-b border-slate-800 hover:bg-transparent">
      <TableHead className="text-slate-400">
  // Should be:
  <TableHeader>
    <TableRow className="hover:bg-transparent">
      <TableHead className="text-muted-foreground">
  
  // Line ~190: Empty state text colors
  <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
  <p className="text-slate-400 mb-1">No invoices found</p>
  <p className="text-sm text-slate-500">
  // Should be:
  <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
  <p className="text-muted-foreground mb-1">No invoices found</p>
  <p className="text-sm text-muted-foreground">
  
  // Line ~205: Invoice rows
  className="hover:bg-slate-900/50 transition-colors border-slate-800"
  <div className="p-2 bg-slate-800 rounded">
    <FileText className="w-4 h-4 text-slate-400" />
  <p className="text-sm font-mono font-medium text-white">
  <p className="text-[10px] text-slate-500">
  <p className="text-sm text-white truncate max-w-[200px]">
  <p className="text-xs text-slate-500 truncate max-w-[150px]">
  // Should be:
  className="hover:bg-muted/50 transition-colors"
  <div className="p-2 bg-muted rounded">
    <FileText className="w-4 h-4 text-muted-foreground" />
  <p className="text-sm font-mono font-medium">
  <p className="text-[10px] text-muted-foreground">
  <p className="text-sm truncate max-w-[200px]">
  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
  
  // Line ~245: Status popover
  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
  <PopoverContent className="w-48 bg-slate-900 border-slate-800">
    <SelectTrigger className="bg-slate-900 border-slate-800 text-white">
    <SelectContent className="bg-slate-900 text-white border-slate-800">
  // Should be:
  <Loader2 className="w-4 h-4 animate-spin" />
  <PopoverContent className="w-48">
    <SelectTrigger>
    <SelectContent>
  
  // Line ~260: Due date and amount
  <p className="text-sm text-white">{formatDate(invoice.dueDate)}</p>
  <p className="text-sm font-semibold text-white">
  // Should be:
  <p className="text-sm">{formatDate(invoice.dueDate)}</p>
  <p className="text-sm font-semibold">
  
  // Line ~310: Pagination
  <div className="p-4 border-t border-slate-800 flex items-center justify-between">
    <p className="text-sm text-slate-400">
    className="bg-slate-900 border-slate-700 text-white hover:bg-slate-800"
    <span className="text-sm text-slate-400">
  // Should be:
  <div className="p-4 border-t flex items-center justify-between">
    <p className="text-sm text-muted-foreground">
    (remove all className overrides from Button, use variant="outline" only)
    <span className="text-sm text-muted-foreground">
  ```

### 6. InvoicesPage Theme Tokens
- **Status**: 🔧 Not Started
- **Remaining Work**:
  ```jsx
  // In InvoicesPage.jsx, replace:
  
  // Line ~214: Page background
  <div className="min-h-screen bg-slate-950 text-white">
  // Should be:
  <div className="min-h-screen bg-background">
  
  // Line ~222: Header text
  <h1 className="text-3xl font-bold text-white mb-1">Invoices</h1>
  <p className="text-slate-400">
  // Should be:
  <h1 className="text-3xl font-bold mb-1">Invoices</h1>
  <p className="text-muted-foreground">
  
  // Line ~230: New Invoice button
  className="bg-indigo-600 hover:bg-indigo-700 text-white"
  // Should be:
  className="bg-primary text-primary-foreground"
  
  // Line ~244: Error banner
  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
    <p className="text-red-400 font-semibold mb-1">Failed to load invoices</p>
    <p className="text-sm text-slate-300">
    className="border-red-500/30 text-red-400 hover:bg-red-500/20"
  // Should be:
  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
    <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
    <p className="text-destructive font-semibold mb-1">Failed to load invoices</p>
    <p className="text-sm text-foreground">
    variant="outline" (no className overrides)
  ```

## 📋 Remaining Tasks

### 7. Create Dedicated CreateInvoicePage
- **Status**: ❌ Not Started
- **Implementation**:
  1. Create `client/src/pages/invoices/CreateInvoicePage.jsx`
  2. Copy NewInvoiceModal form logic but render as full page layout
  3. Add route in App.jsx: `/invoices/new`
  4. Update "New Invoice" button in InvoicesPage to navigate instead of opening modal
  5. Keep NewInvoiceModal for quick edits from project detail pages

### 8. Fix Project Usage Display
- **Status**: ❌ Not Started
- **Problem**: CreateProject page shows "1 / ∞" instead of real limits
- **Implementation**:
  1. Add subscription data fetching in CreateProject page
  2. Use `useSubscription` hook to get current plan limits
  3. Display `usedProjects / plan.maxProjects` correctly
  4. Disable "New Project" button when limit reached

### 9. Fix Download Handler
- **Status**: ⚠️ Needs Verification
- **Current Issue**: `downloadInvoice` function in useInvoices expects `(invoiceId, invoiceNumber)`
- **Fix**: Update InvoicesPage handler:
  ```javascript
  const handleDownloadInvoice = async (invoice) => {
    try {
      await downloadInvoice(invoice._id, invoice.invoiceNumber);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };
  ```

### 10. Integration Tests
- **Status**: ❌ Not Started
- **Required Tests**:
  ```javascript
  // client/src/__tests__/invoices/InvoiceActions.test.jsx
  describe('Invoice Actions', () => {
    it('should edit invoice and update table', async () => {
      // Mock API, render InvoicesPage, click edit, modify, save
      // Verify table shows updated values
    });
    
    it('should delete invoice and remove from table', async () => {
      // Render page, click delete, confirm dialog
      // Verify row removed and toast shown
    });
    
    it('should resend invoice and show toast', async () => {
      // Click resend, verify POST /api/invoices/:id/resend called
      // Verify success toast and resend count updated
    });
    
    it('should download invoice PDF', async () => {
      // Mock blob response, click download
      // Verify PDF download triggered
    });
    
    it('should update status optimistically', async () => {
      // Click status badge, select new status
      // Verify immediate UI update, then API call
      // Verify rollback on error
    });
  });
  ```

### 11. Cypress E2E Test
- **Status**: ❌ Not Started
- **Required Test**:
  ```javascript
  // cypress/e2e/invoices.cy.js
  describe('Invoice PDF Download', () => {
    it('downloads invoice PDF when clicking download button', () => {
      cy.intercept('GET', '/api/invoices/*/pdf', {
        statusCode: 200,
        headers: { 'content-type': 'application/pdf' },
        body: 'fake-pdf-content'
      }).as('downloadPDF');
      
      cy.visit('/dashboard/invoices');
      cy.get('[data-testid="invoice-row-actions"]').first().click();
      cy.contains('Download PDF').click();
      cy.wait('@downloadPDF');
      cy.get('@downloadPDF').should('have.been.calledOnce');
    });
  });
  ```

## 🎯 Acceptance Criteria Checklist

- [x] Three-dot menu actions use `onSelect` (not `onClick`)
- [x] Edit action opens modal with prefilled data
- [ ] Delete shows AlertDialog, calls DELETE endpoint, removes row, shows toast
- [ ] Resend calls POST /api/invoices/:id/resend, shows toast, updates count
- [ ] Download fetches PDF blob and triggers download
- [x] Status popover performs optimistic update (already in InvoiceTable)
- [x] All invoice code uses unified API client (lib/api/invoices.ts)
- [ ] Theme tokens everywhere (InvoicesPage and InvoiceTable need final touches)
- [x] Calendar selectable and writes to RHF
- [x] Tax/discount always whole numbers
- [ ] Create invoice has dedicated page (not just modal)
- [ ] Project usage shows real limits (not ∞)
- [ ] Integration tests cover all flows
- [ ] Cypress e2e test for PDF download

## 🚀 Quick Finish Steps

1. **Theme Token Cleanup** (15 min):
   - Apply all InvoiceTable.jsx replacements listed above
   - Apply all InvoicesPage.jsx replacements listed above

2. **Create Invoice Page** (30 min):
   - Copy NewInvoiceModal logic to CreateInvoicePage.jsx
   - Add route and update button navigation

3. **Project Usage Fix** (15 min):
   - Import useSubscription in CreateProject
   - Display real limits

4. **Tests** (45 min):
   - Write 5 integration tests for invoice actions
   - Write 1 Cypress e2e test for PDF download

5. **Verify & Polish** (15 min):
   - Manual QA of all flows
   - Verify no console errors
   - Check responsive design

## 📝 PR Description Template

```markdown
## Invoice Feature Overhaul

### Summary
Comprehensive refactor of the invoicing system to fix UX issues, standardize styling, and ensure all actions work end-to-end.

### Changes
- **API Unification**: Consolidated `invoiceApi.js` and `lib/api/invoices.ts` into single TypeScript client
- **Action Handlers**: Fixed three-dot menu to use `onSelect` handlers that actually execute
- **Status Updates**: Implemented optimistic UI updates with rollback on error
- **Theme Tokens**: Replaced all custom blue/slate colors with shadcn theme tokens
- **Date Handling**: Calendar now properly integrates with React Hook Form
- **Tax/Discount**: Enforced integer-only percentages with proper validation
- **Create Invoice Page**: Added dedicated route at `/invoices/new`
- **Project Usage**: Fixed to show real plan limits instead of "∞"
- **Tests**: Added comprehensive integration and e2e tests

### QA Checklist
- [ ] Click Edit → modal opens with correct data → save → table updates
- [ ] Click Delete → AlertDialog appears → confirm → row removed → toast shown
- [ ] Click Resend → loading spinner → success toast → resend count increments
- [ ] Click Download → PDF file downloads with correct filename
- [ ] Click status badge → select new status → immediate UI update → persists
- [ ] Create new invoice → redirects to dedicated page → form validates → saves
- [ ] Navigate to Projects → click New Project → shows "X / Y projects used"
- [ ] All invoice pages/modals use consistent dark theme (no blue tint)
- [ ] Calendar date picker works in both New and Edit modals
- [ ] Tax/discount inputs only accept whole numbers 0-100

### Testing
```bash
# Integration tests
npm test -- InvoiceActions.test.jsx

# E2E tests
npm run cypress:run -- --spec "cypress/e2e/invoices.cy.js"
```

### Screenshots
- Before: Custom blue backgrounds, broken actions
- After: Consistent theme tokens, fully functional

### Breaking Changes
None - all changes are internal improvements

### Migration Notes
The old `api/invoiceApi.js` is deprecated. All imports have been updated to use `lib/api/invoices.ts`.
```

## 🔗 Related Files
- ✅ `client/src/hooks/useInvoices.js` - Migrated to unified client
- ✅ `client/src/components/invoices/InvoiceRowActions.jsx` - Fixed onSelect handlers
- ✅ `client/src/components/invoices/InvoiceDetailModal.jsx` - Date handling fixed
- ✅ `client/src/components/invoices/NewInvoiceModal.jsx` - Date handling fixed
- 🔧 `client/src/components/invoices/InvoiceTable.jsx` - Needs theme token cleanup
- 🔧 `client/src/pages/InvoicesPage.jsx` - Needs theme token cleanup
- ❌ `client/src/pages/invoices/CreateInvoicePage.jsx` - Needs creation
- ❌ `client/src/__tests__/invoices/InvoiceActions.test.jsx` - Needs creation
- ❌ `cypress/e2e/invoices.cy.js` - Needs creation
