import { App, normalizePath, PluginSettingTab, Setting } from "obsidian";
import { FolderSuggest } from "./ui/FolderSuggest";
import NewslogSyncPlugin from "./main";
import { NewslogSyncSettings } from "./types";

export const DEFAULT_SETTINGS: NewslogSyncSettings = {
	newsletters: [],
	username: "",
	apiKey: "",
	lastSyncDate: "",
	outputFolderPath: "",
	bundleFolderPath: "",
	downloadedDates: [],
};

export class NewslogSettingTab extends PluginSettingTab {
	plugin: NewslogSyncPlugin;

	constructor(app: App, plugin: NewslogSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		const usernameSetting = new Setting(containerEl)
			.setName("API username")
			.setDesc("Your newslog.me username.")
			.addText((text) => {
				text
					.setPlaceholder("Enter your username")
					.setValue(this.plugin.settings.username)
					.onChange(async (value) => {
						this.plugin.settings.username = value;
						await this.plugin.saveSettings();
					});
				text.inputEl.type = "password";
			})
			.addExtraButton((button) => {
				button
					.setIcon("eye")
					.setTooltip("Show username")
					.onClick(() => {
						const input = usernameSetting.controlEl.querySelector("input");
						if (input) {
							if (input.type === "password") {
								input.type = "text";
								button.setIcon("eye-off").setTooltip("Hide username");
							} else {
								input.type = "password";
								button.setIcon("eye").setTooltip("Show username");
							}
						}
					});
			});

		const apiKeySetting = new Setting(containerEl)
			.setName("API key")
			.setDesc("Your newslog.me API key.")
			.addText((text) => {
				text
					.setPlaceholder("Enter your API key")
					.setValue(this.plugin.settings.apiKey)
					.onChange(async (value) => {
						this.plugin.settings.apiKey = value;
						await this.plugin.saveSettings();
					});

				text.inputEl.type = "password";
			})
			.addExtraButton((button) => {
				button
					.setIcon("eye")
					.setTooltip("Show API key")
					.onClick(() => {
						const input = apiKeySetting.controlEl.querySelector("input");
						if (input) {
							if (input.type === "password") {
								input.type = "text";
								button.setIcon("eye-off");
								button.setTooltip("Hide API key");
							} else {
								input.type = "password";
								button.setIcon("eye");
								button.setTooltip("Show API key");
							}
						}
					});
			});

		new Setting(containerEl)
			.setName("Highlights folder path")
			.setDesc(
				"The path in your obsidian vault where highlighted articles from kindle will be saved."
			)
			.addText((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder("Enter the folder path")
					.setValue(this.plugin.settings.outputFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.outputFolderPath = normalizePath(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Daily bundle folder path")
			.setDesc(
				"The path in your Obsidian vault where daily bundles will be stored."
			)
			.addText((text) => {
				new FolderSuggest(this.app, text.inputEl);
				text
					.setPlaceholder("Enter the folder path")
					.setValue(this.plugin.settings.bundleFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.bundleFolderPath = normalizePath(value);
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Last highlights sync date")
			.setDesc(
				this.plugin.settings.lastSyncDate
					? new Date(this.plugin.settings.lastSyncDate).toLocaleString()
					: "Never"
			);

		new Setting(containerEl)
			.setName("Reset highlight history")
			.setDesc("This will re-download your entire highlight history.")
			.addButton((button) =>
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.lastSyncDate = "";
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName("Reset daily bundle download history")
			.setDesc("This will clear the downloaded dates from the calendar picker.")
			.addButton((button) =>
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.downloadedDates = [];
					await this.plugin.saveSettings();
					this.display();
				})
			);
	}
}
