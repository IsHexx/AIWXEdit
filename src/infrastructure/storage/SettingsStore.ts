/**
 * Settings Store
 * 
 * Manages plugin settings persistence and access.
 * Provides a centralized, type-safe interface for settings management.
 */

import type { Plugin } from 'obsidian';
import type { PluginSettings, WechatAccountConfig, StyleConfig, AIConfig } from '../../types/settings.types';
import { DEFAULT_SETTINGS } from '../../types/settings.types';

/**
 * Settings Store
 * 
 * Singleton class that manages plugin settings.
 * Wraps Obsidian's loadData/saveData with type safety and convenience methods.
 */
export class SettingsStore {
    private static instance: SettingsStore | null = null;
    private plugin: Plugin | null = null;
    private settings: PluginSettings = { ...DEFAULT_SETTINGS };
    private listeners: Set<() => void> = new Set();

    private constructor() { }

    /**
     * Get the singleton instance
     */
    static getInstance(): SettingsStore {
        if (!SettingsStore.instance) {
            SettingsStore.instance = new SettingsStore();
        }
        return SettingsStore.instance;
    }

    /**
     * Initialize the store with plugin reference
     */
    initialize(plugin: Plugin): void {
        this.plugin = plugin;
    }

    /**
     * Load settings from disk
     */
    async load(): Promise<void> {
        if (!this.plugin) {
            throw new Error('SettingsStore not initialized');
        }

        const data = await this.plugin.loadData();
        if (data) {
            // Deep merge with defaults to handle new settings fields
            this.settings = this.mergeSettings(DEFAULT_SETTINGS, data);
        } else {
            this.settings = { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Save settings to disk
     */
    async save(): Promise<void> {
        if (!this.plugin) {
            throw new Error('SettingsStore not initialized');
        }

        await this.plugin.saveData(this.settings);
        this.notifyListeners();
    }

    /**
     * Get all settings
     */
    getAll(): PluginSettings {
        return { ...this.settings };
    }

    /**
     * Update settings with partial data
     */
    async update(partial: Partial<PluginSettings>): Promise<void> {
        this.settings = { ...this.settings, ...partial };
        await this.save();
    }

    // ==================== WeChat Accounts ====================

    /**
     * Get all WeChat accounts
     */
    getAccounts(): WechatAccountConfig[] {
        return [...this.settings.accounts];
    }

    /**
     * Get the default account
     */
    getDefaultAccount(): WechatAccountConfig | null {
        const accounts = this.settings.accounts;
        if (accounts.length === 0) return null;

        const index = this.settings.defaultAccountIndex;
        return accounts[Math.min(index, accounts.length - 1)] || null;
    }

    /**
     * Get account by App ID
     */
    getAccountByAppId(appId: string): WechatAccountConfig | null {
        return this.settings.accounts.find(a => a.appId === appId) || null;
    }

    /**
     * Add a new account
     */
    async addAccount(account: WechatAccountConfig): Promise<void> {
        this.settings.accounts.push(account);
        await this.save();
    }

    /**
     * Update an existing account
     */
    async updateAccount(appId: string, updates: Partial<WechatAccountConfig>): Promise<void> {
        const index = this.settings.accounts.findIndex(a => a.appId === appId);
        if (index >= 0) {
            this.settings.accounts[index] = { ...this.settings.accounts[index], ...updates };
            await this.save();
        }
    }

    /**
     * Remove an account
     */
    async removeAccount(appId: string): Promise<void> {
        this.settings.accounts = this.settings.accounts.filter(a => a.appId !== appId);
        // Adjust default index if needed
        if (this.settings.defaultAccountIndex >= this.settings.accounts.length) {
            this.settings.defaultAccountIndex = Math.max(0, this.settings.accounts.length - 1);
        }
        await this.save();
    }

    /**
     * Set default account index
     */
    async setDefaultAccount(index: number): Promise<void> {
        if (index >= 0 && index < this.settings.accounts.length) {
            this.settings.defaultAccountIndex = index;
            await this.save();
        }
    }

    // ==================== Style Settings ====================

    /**
     * Get style configuration
     */
    getStyleConfig(): StyleConfig {
        return { ...this.settings.style };
    }

    /**
     * Update style configuration
     */
    async updateStyleConfig(updates: Partial<StyleConfig>): Promise<void> {
        this.settings.style = { ...this.settings.style, ...updates };
        await this.save();
    }

    /**
     * Reset style to defaults
     */
    async resetStyleConfig(): Promise<void> {
        this.settings.style = { ...DEFAULT_SETTINGS.style };
        await this.save();
    }

    // ==================== AI Settings ====================

    /**
     * Get AI configuration
     */
    getAIConfig(): AIConfig {
        return { ...this.settings.ai };
    }

    /**
     * Update AI configuration
     */
    async updateAIConfig(updates: Partial<AIConfig>): Promise<void> {
        this.settings.ai = { ...this.settings.ai, ...updates };
        await this.save();
    }

    /**
     * Check if AI is enabled
     */
    isAIEnabled(): boolean {
        return this.settings.ai.enabled && !!this.settings.ai.apiKey;
    }

    // ==================== Change Listeners ====================

    /**
     * Add a listener for settings changes
     */
    addListener(callback: () => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of settings change
     */
    private notifyListeners(): void {
        this.listeners.forEach(callback => {
            try {
                callback();
            } catch (error) {
                console.error('SettingsStore listener error:', error);
            }
        });
    }

    // ==================== Utilities ====================

    /**
     * Deep merge settings with defaults
     */
    private mergeSettings(defaults: PluginSettings, data: Partial<PluginSettings>): PluginSettings {
        return {
            accounts: data.accounts ?? defaults.accounts,
            defaultAccountIndex: data.defaultAccountIndex ?? defaults.defaultAccountIndex,
            style: {
                ...defaults.style,
                ...(data.style ?? {}),
            },
            ai: {
                ...defaults.ai,
                ...(data.ai ?? {}),
            },
            linkStyle: data.linkStyle ?? defaults.linkStyle,
            embedStyle: data.embedStyle ?? defaults.embedStyle,
            showStyleUI: data.showStyleUI ?? defaults.showStyleUI,
        };
    }

    /**
     * Export settings for backup
     */
    exportSettings(): string {
        return JSON.stringify(this.settings, null, 2);
    }

    /**
     * Import settings from backup
     */
    async importSettings(json: string): Promise<void> {
        try {
            const imported = JSON.parse(json) as Partial<PluginSettings>;
            this.settings = this.mergeSettings(DEFAULT_SETTINGS, imported);
            await this.save();
        } catch {
            throw new Error('Invalid settings JSON');
        }
    }

    /**
     * Reset all settings to defaults
     */
    async resetAll(): Promise<void> {
        this.settings = { ...DEFAULT_SETTINGS };
        await this.save();
    }
}

/**
 * Get settings store instance
 */
export function getSettingsStore(): SettingsStore {
    return SettingsStore.getInstance();
}
