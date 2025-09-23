import { Plugin } from 'obsidian';
import { NewslogSyncSettings } from './types';
import { DEFAULT_SETTINGS, NewslogSettingTab } from './settings';
import { registerCommands, downloadDailyBundle } from './commands';
import * as api from './api';

export default class NewslogSyncPlugin extends Plugin {
	settings!: NewslogSyncSettings;
	api = api;

	async onload() {
		await this.loadSettings();

		registerCommands(this);

		this.addSettingTab(new NewslogSettingTab(this.app, this));

		// Make the downloadDailyBundle function available globally on the plugin instance
		(this as any).downloadDailyBundle = (date: string) => downloadDailyBundle(this, date);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
