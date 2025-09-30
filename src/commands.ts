import { Notice, TFolder, TFile } from "obsidian";
import NewslogSyncPlugin from "./main";
import {
	getUploadUrl,
	uploadFileToS3,
	getHighlightedArticlesList,
	getDownloadUrl,
	downloadFileContent,
} from "./api";
import { CalendarModal } from "./ui/CalendarModal";

export function registerCommands(plugin: NewslogSyncPlugin) {
	plugin.addCommand({
		id: "import-kindle-clippings-from-server",
		name: "Upload Kindle's My Clippings.txt to server",
		callback: () => {
			triggerClippingsUpload(plugin);
		},
	});

	plugin.addCommand({
		id: "download-newslog-highlights",
		name: "Download Highlights to Vault",
		callback: async () => {
			await triggerHighlightsDownload(plugin);
		},
	});

	// --- NEW COMMAND: Download Daily Bundle ---
	plugin.addCommand({
		id: "download-daily-newslog-bundle",
		name: "Download daily news bundle",
		callback: () => {
			new CalendarModal(plugin.app, plugin).open();
		},
	});
}

function triggerClippingsUpload(plugin: NewslogSyncPlugin): void {
	const input = document.createElement("input");
	input.type = "file";
	input.accept = ".txt";
	input.classList.add("hidden");

	input.onchange = async (e) => {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) {
			new Notice("No file selected.");
			if (input.parentNode) document.body.removeChild(input);
			return;
		}

		if (file.name.toLowerCase() !== "my clippings.txt") {
			new Notice(
				`Warning: Selected file is not named "My Clippings.txt"`,
				4000
			);
		}

		new Notice(`Reading ${file.name}...`);
		try {
			if (input.parentNode) document.body.removeChild(input);
			await processClippingsFile(plugin, file);
		} catch (error) {
			new Notice(
				"Error reading clippings file. See console for details.",
				5000
			);
			if (input.parentNode) document.body.removeChild(input);
		}
	};

	document.body.appendChild(input);
	input.click();
}

async function processClippingsFile(
	plugin: NewslogSyncPlugin,
	file: File
): Promise<void> {
	if (!plugin.settings.username || !plugin.settings.apiKey) {
		new Notice("Username or API Key not configured in plugin settings.", 5000);
		return;
	}

	try {
		const uploadUrl = await getUploadUrl(
			plugin.settings.username,
			plugin.settings.apiKey,
			file.name
		);

		if (!uploadUrl) {
			new Notice("Failed to get upload URL. Check console for details.", 7000);
			return;
		}

		const uploadSuccess = await uploadFileToS3(
			plugin.settings.apiKey,
			uploadUrl,
			file
		);

		if (uploadSuccess) {
		} else {
			new Notice("File upload failed. Check console for details.", 7000);
		}
	} catch (error) {
		new Notice(
			"An unexpected error occurred during upload. See console for details.",
			7000
		);
	}
}

async function triggerHighlightsDownload(
	plugin: NewslogSyncPlugin
): Promise<void> {
	if (!plugin.settings.username || !plugin.settings.apiKey) {
		new Notice("Username or API Key not configured in plugin settings.", 5000);
		return;
	}

	new Notice("Starting download of newslog highlights...", 5000);
	try {
		const s3Keys = await getHighlightedArticlesList(
			plugin.settings.username,
			plugin.settings.lastSyncDate,
			plugin.settings.apiKey
		);

		if (!s3Keys || s3Keys.length === 0) {
			new Notice("No highlighted articles found on the server.", 5000);
			return;
		}

		new Notice(`Found ${s3Keys.length} articles. Downloading...`, 5000);
		let downloadedCount = 0;
		let failedCount = 0;

		const folderPath = plugin.settings.outputFolderPath;
		const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
		if (!(folder instanceof TFolder)) {
			await plugin.app.vault.createFolder(folderPath);
		}

		for (const s3Key of s3Keys) {
			try {
				const downloadUrl = await getDownloadUrl(
					plugin.settings.username,
					plugin.settings.apiKey,
					s3Key
				);

				if (!downloadUrl) {
					failedCount++;
					continue;
				}

				const fileContent = await downloadFileContent(downloadUrl);

				if (fileContent === null) {
					failedCount++;
					continue;
				}

				const parts = s3Key.split("/");
				if (parts.length < 4) {
					failedCount++;
					continue;
				}

				const bundleFolderName = parts[parts.length - 2];
				const filename = parts[parts.length - 1];

				const bundleFolderPath = `${folderPath}/${bundleFolderName}`;
				const bundleFolder =
					plugin.app.vault.getAbstractFileByPath(bundleFolderPath);
				if (!(bundleFolder instanceof TFolder)) {
					await plugin.app.vault.createFolder(bundleFolderPath);
				}

				const filePath = `${bundleFolderPath}/${filename}`;

				const existingFile = plugin.app.vault.getAbstractFileByPath(filePath);
				if (existingFile && existingFile instanceof TFile) {
					await plugin.app.vault.modify(existingFile, fileContent);
				} else if (existingFile) {
					failedCount++;
					continue;
				} else {
					await plugin.app.vault.create(filePath, fileContent);
				}
				downloadedCount++;
			} catch (innerError) {
				failedCount++;
			}
		}

		new Notice(
			`Download complete! Successfully downloaded ${downloadedCount} articles. Failed to download ${failedCount}.`,
			10000
		);

		if (s3Keys && s3Keys.length > 0) {
			plugin.settings.lastSyncDate = new Date().toISOString();
			await plugin.saveSettings();
		}
	} catch (error) {
		new Notice(
			"An unexpected error occurred during highlights download. See console for details.",
			7000
		);
	}
}

// --- NEW FUNCTION: To handle the download of the daily bundle ---
export async function downloadDailyBundle(
	plugin: NewslogSyncPlugin,
	date: string
): Promise<void> {
	if (!plugin.settings.username || !plugin.settings.apiKey) {
		new Notice("Username or API Key not configured in plugin settings.", 5000);
		return;
	}

	try {
		const bundles = await plugin.api.getDailyBundle(
			plugin.settings.username,
			plugin.settings.apiKey,
			date
		);

		if (!bundles || bundles.length === 0) {
			new Notice(`No bundles found for ${date}.`, 5000);
			return;
		}

		new Notice(`Found ${bundles.length} bundles. Downloading...`, 5000);
		let downloadedCount = 0;
		let failedCount = 0;

		const folderPath = plugin.settings.bundleFolderPath;
		const folder = plugin.app.vault.getAbstractFileByPath(folderPath);
		if (!(folder instanceof TFolder)) {
			await plugin.app.vault.createFolder(folderPath);
		}

		for (const bundle of bundles) {
			const bundleFolderPath = `${folderPath}/${bundle.bundle_folder_name}`;
			const bundleFolder =
				plugin.app.vault.getAbstractFileByPath(bundleFolderPath);
			if (!(bundleFolder instanceof TFolder)) {
				await plugin.app.vault.createFolder(bundleFolderPath);
			}

			// Download each article in the bundle
			for (const file of bundle.files) {
				const articleContent = await downloadFileContent(file.url);
				if (articleContent) {
					const articleFilePath = `${bundleFolderPath}/${file.filename}`;
					await plugin.app.vault.create(articleFilePath, articleContent);
					downloadedCount++;
				} else {
					failedCount++;
				}
			}
		}

		new Notice(
			`Download complete! Successfully downloaded ${downloadedCount} files. Failed: ${failedCount}.`,
			10000
		);

		if (!plugin.settings.downloadedDates.includes(date)) {
			plugin.settings.downloadedDates.push(date);
			await plugin.saveSettings();
		}
	} catch (error) {
		new Notice(
			`An error occurred during the daily bundle download. See console for details.`,
			7000
		);
	}
}