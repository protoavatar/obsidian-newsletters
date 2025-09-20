import { App, PluginSettingTab, Setting } from "obsidian";
import Newslog from "./main";
import { NewslogSettings } from "./types";

export const DEFAULT_SETTINGS: NewslogSettings = {
	newsletters: [],
	username: "",
	apiKey: "",
	lastSyncDate: "",
	outputFolderPath: "",
	bundleFolderPath: "",
	downloadedDates: [],
};

export class NewslogSettingTab extends PluginSettingTab {
	plugin: Newslog;

	constructor(app: App, plugin: Newslog) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "newslog settings" });

		const usernameSetting = new Setting(containerEl)
			.setName("API Username")
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
					.setTooltip("Show Username")
					.onClick(() => {
						const input = usernameSetting.controlEl.querySelector("input");
						if (input) {
							if (input.type === "password") {
								input.type = "text";
								button.setIcon("eye-off").setTooltip("Hide Username");
							} else {
								input.type = "password";
								button.setIcon("eye").setTooltip("Show Username");
							}
						}
					});
			});

		const apiKeySetting = new Setting(containerEl)
			.setName("API Key")
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
					.setTooltip("Show API Key")
					.onClick(() => {
						const input = apiKeySetting.controlEl.querySelector("input");
						if (input) {
							if (input.type === "password") {
								input.type = "text";
								button.setIcon("eye-off");
								button.setTooltip("Hide API Key");
							} else {
								input.type = "password";
								button.setIcon("eye");
								button.setTooltip("Show API Key");
							}
						}
					});
			});

		new Setting(containerEl)
			.setName("Highlights Folder Path")
			.setDesc(
				"The path in your Obsidian vault where highlighted articles from Kindle will be saved."
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder path")
					.setValue(this.plugin.settings.outputFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.outputFolderPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Daily Bundle Folder Path")
			.setDesc(
				"The path in your Obsidian vault where daily bundles will be stored."
			)
			.addText((text) =>
				text
					.setPlaceholder("Enter the folder path")
					.setValue(this.plugin.settings.bundleFolderPath)
					.onChange(async (value) => {
						this.plugin.settings.bundleFolderPath = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Last Highlights Sync Date")
			.setDesc(
				this.plugin.settings.lastSyncDate
					? new Date(this.plugin.settings.lastSyncDate).toLocaleString()
					: "Never"
			);

		new Setting(containerEl)
			.setName("Reset Highlight History")
			.setDesc("This will re-download your entire highlight history.")
			.addButton((button) =>
				button.setButtonText("Reset").onClick(async () => {
					this.plugin.settings.lastSyncDate = "";
					await this.plugin.saveSettings();
					this.display();
				})
			);

		new Setting(containerEl)
			.setName("Reset Daily Bundle Download History")
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
