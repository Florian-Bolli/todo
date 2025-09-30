# Todo App E2E Test Suite

This directory contains comprehensive end-to-end tests for the Todo application using Playwright.

## 📁 Test Structure

```
tests/
├── README.md                 # This documentation
├── run-tests.js             # Test runner script
├── helpers/
│   ├── test-data.js         # Test data generators and utilities
│   └── page-helpers.js      # Common page helper functions
├── pages/
│   ├── auth-page.js         # Authentication page object model
│   └── todo-page.js         # Todo app page object model
└── specs/
    ├── auth.spec.js         # Authentication tests
    ├── todo-crud.spec.js    # CRUD operations tests
    ├── state-persistence.spec.js # State persistence tests
    └── e2e-flow.spec.js     # Complete end-to-end flow
```

## 🚀 Quick Start

### Prerequisites

1. **Start the Todo App server:**
   ```bash
   npm start
   ```
   The server should be running on `http://localhost:3000`

2. **Install test dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

### Running Tests

#### Option 1: Using the Test Runner Script
```bash
# Run all tests
node tests/run-tests.js

# Run with UI mode (interactive)
node tests/run-tests.js --ui

# Run in headed mode (visible browser)
node tests/run-tests.js --headed

# Run specific test file
node tests/run-tests.js auth.spec.js

# Run and show report
node tests/run-tests.js --report
```

#### Option 2: Using npm scripts
```bash
# Run all tests
npm test

# Run with UI mode
npm run test:ui

# Run in headed mode
npm run test:headed

# Run in debug mode
npm run test:debug

# Show test report
npm run test:report
```

#### Option 3: Using Playwright directly
```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test auth.spec.js

# Run with UI
npx playwright test --ui

# Run in headed mode
npx playwright test --headed

# Run in debug mode
npx playwright test --debug
```

## 📋 Test Coverage

### Authentication Tests (`auth.spec.js`)
- ✅ Display login form on initial load
- ✅ Register new user successfully
- ✅ Login with valid credentials
- ✅ Show error for invalid credentials
- ✅ Logout successfully
- ✅ Persist login state after page reload
- ✅ Require email and password for login
- ✅ Handle registration with existing email

### CRUD Operations Tests (`todo-crud.spec.js`)
- ✅ Create new todo
- ✅ Create multiple todos
- ✅ Add todo using Enter key
- ✅ Add todo using Add button
- ✅ Prevent adding empty todos
- ✅ Edit todo name
- ✅ Cancel todo edit with Escape
- ✅ Toggle todo completion
- ✅ Delete todo
- ✅ Update todo notes
- ✅ Update todo priority
- ✅ Expand and collapse todo details
- ✅ Show correct status count

### State Persistence Tests (`state-persistence.spec.js`)
- ✅ Persist todos after page reload
- ✅ Persist user session after page reload
- ✅ Persist filter selection after page reload
- ✅ Persist expanded todo state after page reload
- ✅ Maintain data consistency across multiple tabs
- ✅ Handle offline mode gracefully
- ✅ Preserve todos after logout and login
- ✅ Handle rapid successive operations

### Complete E2E Flow (`e2e-flow.spec.js`)
- ✅ **Complete user journey:** register → login → add items → modify → delete → logout → login → reload
- ✅ **Error handling and edge cases**
- ✅ **Rapid operations testing**
- ✅ **State persistence verification**

## 🎯 Test Features

### Page Object Model
- **AuthPage**: Handles all authentication-related interactions
- **TodoPage**: Handles all todo app interactions
- **BasePage**: Common functionality shared across pages

### Reusable Helpers
- **Test Data Generators**: Random emails, passwords, todos
- **Page Helpers**: Common operations like waiting, clicking, filling
- **Storage Utilities**: Clear browser storage between tests

### Test Data Management
- Each test uses unique random data
- Automatic cleanup between tests
- Isolated test environments

### Browser Support
Tests run on multiple browsers:
- Chromium
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

## 🔧 Configuration

### Playwright Configuration (`playwright.config.js`)
- **Base URL**: `http://localhost:3000`
- **Retries**: 2 on CI, 0 locally
- **Screenshots**: On failure
- **Videos**: Retain on failure
- **Traces**: On first retry
- **Web Server**: Automatically starts `npm start`

### Test Environment
- **Parallel Execution**: Tests run in parallel for speed
- **Isolation**: Each test starts with clean storage
- **Timeouts**: 10s default, configurable per test
- **Reports**: HTML, JSON, and JUnit formats

## 🐛 Debugging Tests

### Debug Mode
```bash
npm run test:debug
# or
npx playwright test --debug
```

### UI Mode
```bash
npm run test:ui
# or
npx playwright test --ui
```

### Headed Mode
```bash
npm run test:headed
# or
npx playwright test --headed
```

### Taking Screenshots
Screenshots are automatically taken on test failures and saved to `test-results/screenshots/`.

### Viewing Test Reports
```bash
npm run test:report
# or
npx playwright show-report
```

## 📊 Test Reports

After running tests, you'll find:
- **HTML Report**: Interactive test results
- **JSON Report**: Machine-readable results
- **JUnit Report**: CI/CD integration
- **Screenshots**: Failure screenshots
- **Videos**: Test execution videos
- **Traces**: Detailed execution traces

## 🔄 Continuous Integration

The test suite is designed to work in CI environments:
- Automatic server startup
- Parallel execution
- Retry on failure
- Multiple browser testing
- Comprehensive reporting

## 🚨 Troubleshooting

### Common Issues

1. **Server not running**
   ```bash
   npm start
   ```

2. **Playwright not installed**
   ```bash
   npx playwright install
   ```

3. **Tests timing out**
   - Check server is responsive
   - Increase timeout in test files
   - Check for JavaScript errors in browser console

4. **Flaky tests**
   - Add appropriate waits
   - Use `waitForElement` instead of `click`
   - Check for race conditions

### Debug Tips

1. **Use debug mode** to step through tests
2. **Check browser console** for JavaScript errors
3. **View screenshots** on test failures
4. **Use UI mode** for interactive debugging
5. **Check network tab** for API issues

## 📝 Writing New Tests

### Test Structure
```javascript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth-page.js';
import { TodoPage } from '../pages/todo-page.js';

test.describe('Feature Name', () => {
    test('should do something', async ({ page }) => {
        // Test implementation
    });
});
```

### Best Practices
1. **Use page objects** for better maintainability
2. **Generate unique test data** to avoid conflicts
3. **Clean up state** between tests
4. **Use descriptive test names**
5. **Group related tests** in describe blocks
6. **Add appropriate waits** for async operations

### Adding New Page Objects
1. Create new file in `tests/pages/`
2. Extend `BasePage` class
3. Define selectors and methods
4. Import and use in test files

## 🎉 Success Criteria

A successful test run should:
- ✅ All tests pass
- ✅ No flaky failures
- ✅ Fast execution (< 5 minutes)
- ✅ Good coverage of user flows
- ✅ Clear failure messages
- ✅ Useful screenshots on failure

---

**Happy Testing! 🧪✨**
