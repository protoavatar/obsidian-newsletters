import { App, Modal, Notice, moment } from "obsidian";
import NewslogSyncPlugin from "../main";
import { downloadDailyBundle } from "../commands";

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
				await downloadDailyBundle(this.plugin, dateString);
			};
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}