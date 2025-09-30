#!/usr/bin/env node

// Test runner script for Todo App E2E tests

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Todo App E2E Test Runner');
console.log('============================\n');

// Check if Playwright is installed
try {
    require('@playwright/test');
    console.log('✅ Playwright is installed');
} catch (error) {
    console.log('❌ Playwright not found. Installing...');
    execSync('npm install @playwright/test', { stdio: 'inherit' });
    execSync('npx playwright install', { stdio: 'inherit' });
    console.log('✅ Playwright installed successfully');
}

// Check if server is running
function checkServer() {
    try {
        execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'pipe' });
        console.log('✅ Server is running on http://localhost:3000');
        return true;
    } catch (error) {
        console.log('❌ Server is not running on http://localhost:3000');
        console.log('Please start the server with: npm start');
        return false;
    }
}

// Run tests based on command line arguments
function runTests() {
    const args = process.argv.slice(2);
    
    let command = 'npx playwright test';
    
    if (args.includes('--ui')) {
        command += ' --ui';
        console.log('🎭 Starting Playwright UI mode...');
    } else if (args.includes('--headed')) {
        command += ' --headed';
        console.log('👀 Running tests in headed mode...');
    } else if (args.includes('--debug')) {
        command += ' --debug';
        console.log('🐛 Starting debug mode...');
    } else if (args.includes('--report')) {
        command += ' && npx playwright show-report';
        console.log('📊 Running tests and showing report...');
    } else {
        console.log('🧪 Running tests in headless mode...');
    }
    
    // Add specific test files if provided
    const testFiles = args.filter(arg => arg.endsWith('.spec.js'));
    if (testFiles.length > 0) {
        command += ' ' + testFiles.join(' ');
    }
    
    try {
        execSync(command, { stdio: 'inherit' });
        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.log('\n❌ Some tests failed. Check the output above for details.');
        process.exit(1);
    }
}

// Main execution
function main() {
    if (checkServer()) {
        runTests();
    } else {
        process.exit(1);
    }
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Usage: node tests/run-tests.js [options] [test-files]

Options:
  --ui        Start Playwright UI mode
  --headed    Run tests in headed mode (visible browser)
  --debug     Start debug mode
  --report    Run tests and show HTML report
  --help      Show this help message

Examples:
  node tests/run-tests.js                    # Run all tests
  node tests/run-tests.js --ui               # Start UI mode
  node tests/run-tests.js --headed           # Run with visible browser
  node tests/run-tests.js auth.spec.js       # Run specific test file
  node tests/run-tests.js --report           # Run and show report

Test Files:
  auth.spec.js              # Authentication tests
  todo-crud.spec.js         # CRUD operations tests
  state-persistence.spec.js # State persistence tests
  e2e-flow.spec.js          # Complete end-to-end flow
`);
    process.exit(0);
}

main();
