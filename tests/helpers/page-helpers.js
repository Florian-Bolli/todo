// Page helper functions for common operations

import { waitForNetworkIdle } from './test-data.js';

/**
 * Base page helper class with common functionality
 */
export class BasePage {
    constructor(page) {
        this.page = page;
    }

    /**
     * Wait for element to be visible
     */
    async waitForElement(selector, timeout = 10000) {
        await this.page.waitForSelector(selector, { state: 'visible', timeout });
    }

    /**
     * Wait for element to be hidden
     */
    async waitForElementHidden(selector, timeout = 10000) {
        await this.page.waitForSelector(selector, { state: 'hidden', timeout });
    }

    /**
     * Click element and wait for network to be idle
     */
    async clickAndWait(selector) {
        await this.page.click(selector);
        await waitForNetworkIdle(this.page);
    }

    /**
     * Fill input and wait for network to be idle
     */
    async fillAndWait(selector, text) {
        await this.page.fill(selector, text);
        await waitForNetworkIdle(this.page);
    }

    /**
     * Wait for text to appear on page
     */
    async waitForText(text, timeout = 10000) {
        await this.page.waitForFunction(
            (text) => document.body.innerText.includes(text),
            text,
            { timeout }
        );
    }

    /**
     * Check if element exists
     */
    async elementExists(selector) {
        try {
            await this.page.waitForSelector(selector, { timeout: 1000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get element text
     */
    async getElementText(selector) {
        await this.waitForElement(selector);
        return await this.page.textContent(selector);
    }

    /**
     * Take screenshot
     */
    async takeScreenshot(name) {
        await this.page.screenshot({ 
            path: `test-results/screenshots/${name}-${Date.now()}.png`,
            fullPage: true 
        });
    }

    /**
     * Wait for page to be fully loaded
     */
    async waitForPageLoad() {
        await this.page.waitForLoadState('networkidle');
        await this.page.waitForLoadState('domcontentloaded');
    }

    /**
     * Reload page and wait for load
     */
    async reloadPage() {
        await this.page.reload();
        await this.waitForPageLoad();
    }

    /**
     * Navigate to URL and wait for load
     */
    async goto(url) {
        await this.page.goto(url);
        await this.waitForPageLoad();
    }
}
