import { App, Modal, Notice, moment } from "obsidian";
import NewslogSyncPlugin from "../main";
import { getDailyBundle, downloadFileContent } from "../api";

export class CalendarModal extends Modal {
	plugin: NewslogSyncPlugin;
	currentDate: Date;

	constructor(app: App, plugin: NewslogSyncPlugin) {
		super(app);
		this.plugin = plugin;
		this.currentDate = new Date();
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Download newslog Bundle" });
		contentEl.createEl("p", {
			text: "Select a date to download the bundle(s). Dates with downloaded bundles are highlighted.",
		});

		this.renderCalendar(contentEl);
	}

	renderCalendar(container: HTMLElement) {
		container.empty(); // Clear previous content

		const header = container.createDiv({ cls: "calendar-header" });
		header.createEl("button", { text: "<" }).onclick = () => {
			this.currentDate.setMonth(this.currentDate.getMonth() - 1);
			this.renderCalendar(container);
		};
		header.createEl("h3", {
			text: this.currentDate.toLocaleString(moment.locale(), {
				month: "long",
				year: "numeric",
			}),
		});
		header.createEl("button", { text: ">" }).onclick = () => {
			this.currentDate.setMonth(this.currentDate.getMonth() + 1);
			this.renderCalendar(container);
		};

		const calendarGrid = container.createDiv({ cls: "calendar-container" });
		const year = this.currentDate.getFullYear();
		const month = this.currentDate.getMonth();
		const firstDay = new Date(year, month, 1).getDay();
		const daysInMonth = new Date(year, month + 1, 0).getDate();

		// Add day labels
		const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
		dayLabels.forEach((day) => {
			calendarGrid.createDiv({ text: day, cls: "calendar-day-label" });
		});

		// Add empty cells for days before the 1st
		for (let i = 0; i < firstDay; i++) {
			calendarGrid.createDiv({ cls: "calendar-day disabled" });
		}

		// Add day cells
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day);
			const dateString = date.toISOString().split("T")[0];
			const dayCell = calendarGrid.createDiv({
				text: String(day),
				cls: "calendar-day",
			});

			if (this.plugin.settings.downloadedDates.includes(dateString)) {
				dayCell.addClass("downloaded");
			}

			if (
				date.getDate() === new Date().getDate() &&
				date.getMonth() === new Date().getMonth() &&
				date.getFullYear() === new Date().getFullYear()
			) {
				dayCell.addClass("today");
			}

			dayCell.onclick = async () => {
				this.close();
				await this.downloadBundlesForDate(dateString);
			};
		}
	}

	async downloadBundlesForDate(date: string) {
		const { settings } = this.plugin;
		if (!settings.username || !settings.apiKey) {
			new Notice("Username or API Key not configured.", 5000);
			return;
		}

		new Notice(`Fetching bundles for ${date}...`);
		const bundles = await getDailyBundle(
			settings.username,
			settings.apiKey,
			date
		);

		if (!bundles) {
			new Notice(`Failed to fetch bundles for ${date}.`, 5000);
			return;
		}

		if (bundles.length === 0) {
			new Notice(`No bundles found for ${date}.`, 5000);
			return;
		}

		new Notice(`Found ${bundles.length} bundle(s). Downloading...`);

		const rootFolderPath = this.plugin.settings.bundleFolderPath;
		// Ensure root "Newslog" folder exists
		if (
			rootFolderPath &&
			!this.app.vault.getAbstractFileByPath(rootFolderPath)
		) {
			await this.app.vault.createFolder(rootFolderPath);
		}

		let totalFilesDownloaded = 0;
		for (const bundle of bundles) {
			const bundleFolderPath = `${rootFolderPath}/${bundle.bundle_folder_name}`;
			if (!this.app.vault.getAbstractFileByPath(bundleFolderPath)) {
				await this.app.vault.createFolder(bundleFolderPath);
			}

			for (const file of bundle.files) {
				const fileContent = await downloadFileContent(file.url);
				if (fileContent !== null) {
					const filePath = `${bundleFolderPath}/${file.filename}`;
					await this.app.vault.create(filePath, fileContent);
					totalFilesDownloaded++;
				}
			}
		}

		new Notice(
			`Successfully downloaded ${totalFilesDownloaded} file(s) for ${bundles.length} bundle(s).`
		);

		// Save the downloaded date
		if (!this.plugin.settings.downloadedDates.includes(date)) {
			this.plugin.settings.downloadedDates.push(date);
			await this.plugin.saveSettings();
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
