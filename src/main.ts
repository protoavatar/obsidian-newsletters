import { Plugin } from "obsidian";
import { NewslogSettings } from "./types";
import { DEFAULT_SETTINGS, NewslogSettingTab } from "./settings";
import { registerCommands } from "./commands";

export default class Newslog extends Plugin {
	settings!: NewslogSettings;

	async onload() {
		await this.loadSettings();

		registerCommands(this);

		this.addSettingTab(new NewslogSettingTab(this.app, this));

		console.log("newslog Sync Plugin Loaded");
	}

	onunload() {
		console.log("newslog Sync Plugin Unloaded");
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
