// Authentication page object model

import { BasePage } from '../helpers/page-helpers.js';

export class AuthPage extends BasePage {
    constructor(page) {
        super(page);
        
        // Selectors
        this.selectors = {
            emailInput: 'input[name="email"]',
            passwordInput: 'input[name="password"]',
            loginButton: 'button[type="submit"]',
            registerButton: 'button.btn-secondary',
            form: 'form',
            errorMessage: '.error, .alert, [role="alert"]',
            loginForm: '.login-form'
        };
    }

    /**
     * Navigate to login page
     */
    async gotoLogin() {
        await this.goto('/');
        await this.waitForElement(this.selectors.loginForm);
    }

    /**
     * Fill login form
     */
    async fillLoginForm(email, password) {
        await this.fillAndWait(this.selectors.emailInput, email);
        await this.fillAndWait(this.selectors.passwordInput, password);
    }

    /**
     * Click login button
     */
    async clickLogin() {
        await this.clickAndWait(this.selectors.loginButton);
    }

    /**
     * Click register button
     */
    async clickRegister() {
        await this.clickAndWait(this.selectors.registerButton);
    }

    /**
     * Submit login form
     */
    async submitLoginForm(email, password) {
        await this.fillLoginForm(email, password);
        await this.clickLogin();
    }

    /**
     * Submit register form
     */
    async submitRegisterForm(email, password) {
        await this.fillLoginForm(email, password);
        await this.clickRegister();
    }

    /**
     * Check if login form is visible
     */
    async isLoginFormVisible() {
        return await this.elementExists(this.selectors.loginForm);
    }

    /**
     * Check if error message is visible
     */
    async hasErrorMessage() {
        return await this.elementExists(this.selectors.errorMessage);
    }

    /**
     * Get error message text
     */
    async getErrorMessage() {
        if (await this.hasErrorMessage()) {
            return await this.getElementText(this.selectors.errorMessage);
        }
        return null;
    }

    /**
     * Wait for successful login (login form to disappear)
     */
    async waitForLoginSuccess() {
        await this.waitForElementHidden(this.selectors.loginForm);
    }

    /**
     * Login with credentials
     */
    async login(email, password) {
        await this.gotoLogin();
        await this.submitLoginForm(email, password);
        await this.waitForLoginSuccess();
    }

    /**
     * Register with credentials
     */
    async register(email, password) {
        await this.gotoLogin();
        await this.submitRegisterForm(email, password);
        await this.waitForLoginSuccess();
    }

    /**
     * Login and register flow
     */
    async registerAndLogin(email, password) {
        await this.register(email, password);
        // After registration, user should be automatically logged in
        await this.waitForLoginSuccess();
    }
}
