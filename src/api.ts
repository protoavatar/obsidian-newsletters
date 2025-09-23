// api.ts (or wherever fetchMarkdownBundle is defined)
import { Notice, requestUrl } from "obsidian"; // Optional: for user feedback
import { DailyBundle } from "./types";

// The URL for the Newslog server. This is hardcoded as it's a specific service.
const NEWSLOG_SERVER_URL =
	"https://ifkf2fi17a.execute-api.us-east-2.amazonaws.com";

// Type guards
function isUploadUrlResponse(data: unknown): data is { uploadUrl: string } {
	return (
		typeof data === "object" &&
		data !== null &&
		"uploadUrl" in data &&
		typeof (data as { uploadUrl: unknown }).uploadUrl === "string"
	);
}

function isS3KeysResponse(data: unknown): data is { s3Keys: string[] } {
	return (
		typeof data === "object" &&
		data !== null &&
		"s3Keys" in data &&
		Array.isArray((data as { s3Keys: unknown }).s3Keys)
	);
}

function isDownloadUrlResponse(data: unknown): data is { downloadUrl: string } {
	return (
		typeof data === "object" &&
		data !== null &&
		"downloadUrl" in data &&
		typeof (data as { downloadUrl: unknown }).downloadUrl === "string"
	);
}

function isBundlesResponse(data: unknown): data is { bundles: DailyBundle[] } {
	return (
		typeof data === "object" &&
		data !== null &&
		"bundles" in data &&
		Array.isArray((data as { bundles: unknown }).bundles)
	);
}

/**
 * A helper to make authenticated requests to the Newslog API.
 * It handles common logic like authentication headers, error handling, and notices.
 * @param endpoint The API endpoint to call (e.g., "/clippings/get-upload-url").
 * @param username The user's Newslog username.
 * @param apiKey The user's Newslog API key.
 * @param options Additional options for the request.
 * @param options.queryParams An object of query parameters to add to the URL.
 * @param options.noticeMessage A message to show in a notice when the request starts. If empty, no notice is shown.
 * @returns The JSON response from the server, or null if an error occurred.
 */
async function makeNewslogRequest(
	endpoint: string,
	username: string,
	apiKey: string,
	options: {
		queryParams?: Record<string, string | null>;
		noticeMessage: string;
	}
): Promise<unknown | null> {
	const { queryParams = {}, noticeMessage } = options;

	if (!username || !apiKey) {
		new Notice("Username or API Key not configured in settings.", 5000);
		return null;
	}

	const cleanServerUrl = NEWSLOG_SERVER_URL.replace(/\/$/, "");
	const url = new URL(`${cleanServerUrl}${endpoint}`);
	Object.entries(queryParams).forEach(([key, value]) => {
		if (value) {
			url.searchParams.append(key, value);
		}
	});

	const headers = {
		"x-user-id": username,
		"x-user-secret": apiKey, // La API Key se envía como un secreto.
	};

	// Clonamos la URL para no modificar la original al remover datos sensibles para el log.
	const logUrl = new URL(url.toString());
	logUrl.searchParams.delete("apiKey"); // Asumiendo que la apiKey no debería estar en los logs.
	console.log(`Requesting from: ${logUrl.toString()}`);
	if (noticeMessage) {
		new Notice(noticeMessage);
	}

	try {
		const response = await requestUrl({
			url: url.toString(),
			headers: headers as Record<string, string>,
		});

		if (response.status === 200) {
			return response.json;
		} else {
			console.error(
				`Error from ${endpoint}: ${response.status}`,
				response.text
			);
			new Notice(
				`Server error: ${response.status}. See console for details.`,
				7000
			);
			return null;
		}
	} catch (error) {
		console.error(`Network or other error from ${endpoint}:`, error);
		new Notice(`Network error. See console for details.`, 7000);
		return null;
	}
}

/**
 * Fetches a pre-signed S3 URL for uploading clippings.
 * @param username The username for the API.
 * @param apiKey The API Key for authentication.
 * @param filename The name of the clippings file to upload.
 * @returns A pre-signed URL string or null if an error occurs.
 */
export async function getUploadUrl(
	username: string,
	apiKey: string,
	filename: string
): Promise<string | null> {
	if (!filename || filename.trim() === "") {
		new Notice("Filename is empty.", 5000);
		return null;
	}

	const data = await makeNewslogRequest(
		"/clippings/get-upload-url",
		username,
		apiKey,
		{
			queryParams: { fileName: filename },
			noticeMessage: `Requesting upload URL for ${filename}...`,
		}
	);

	if (isUploadUrlResponse(data)) {
		console.log("Successfully received upload URL.");
		return data.uploadUrl;
	}

	if (data) {
		console.error("Upload URL not found in response:", data);
		new Notice("Error: Upload URL not provided by server.", 7000);
	}
	return null;
}

/**
 * Uploads a file to a pre-signed S3 URL.
 * @param apiKey The API Key for authentication (though not strictly needed for pre-signed URL upload, good practice to pass it if backend requires it for some reason).
 * @param uploadUrl The pre-signed URL to upload the file to.
 * @param file The File object to upload.
 * @returns True if the upload was successful, false otherwise.
 */
export async function uploadFileToS3(
	apiKey: string, // Keep this parameter for consistency, even if not directly used for S3 PUT
	uploadUrl: string,
	file: File
): Promise<boolean> {
	console.log(`Uploading file to S3: ${uploadUrl}`);
	new Notice(`Uploading ${file.name}...`);

	try {
		const response = await requestUrl({
			url: uploadUrl,
			method: "PUT",
			body: await file.arrayBuffer(),
			headers: {
				"Content-Type": file.type || "application/octet-stream",
			},
		});

		if (response.status === 200) {
			console.log(`Successfully uploaded ${file.name} to S3.`);
			new Notice(
				`Successfully uploaded ${file.name}! Processing will continue on the server.`,
				7000
			);
			return true;
		} else {
			console.error(
				`Error uploading file to S3: ${response.status}`,
				response.text
			);
			new Notice(
				`Error uploading file: ${response.status}. See console.`,
				7000
			);
			return false;
		}
	} catch (error) {
		console.error(`Network or other error uploading file:`, error);
		new Notice(`Network error uploading file. See console.`, 7000);
		return false;
	}
}

/**
 * Fetches a list of highlighted article S3 keys for a user, optionally after a certain date.
 * @param username The username for the API.
 * @param apiKey The API Key for authentication.
 * @returns An array of S3 keys (strings) or null if an error occurs.
 */
export async function getHighlightedArticlesList(
	username: string,
	since: string | null, // ISO formatted date string
	apiKey: string
): Promise<string[] | null> {
	const data = await makeNewslogRequest(
		"/clippings/highlights/list",
		username,
		apiKey,
		{
			queryParams: { lastSync: since },
			noticeMessage: "Fetching list of highlighted articles...",
		}
	);

	if (isS3KeysResponse(data)) {
		console.log(
			`Successfully received ${data.s3Keys.length} highlighted article keys.`
		);
		return data.s3Keys;
	}

	if (data) {
		console.error("S3 keys not found in response or invalid format:", data);
		new Notice(
			"Error: S3 keys not provided by server or invalid format.",
			7000
		);
	}
	return null;
}

/**
 * Fetches a pre-signed S3 URL for downloading a specific highlighted article.
 * @param username The username for the API.
 * @param apiKey The API Key for authentication.
 * @param s3Key The S3 key of the file to download (e.g., "user_id/highlights/article.md").
 * @returns A pre-signed URL string or null if an error occurs.
 */
export async function getDownloadUrl(
	username: string,
	apiKey: string,
	s3Key: string
): Promise<string | null> {
	if (!s3Key || s3Key.trim() === "") {
		new Notice("S3 Key is empty for download.", 5000);
		return null;
	}

	const data = await makeNewslogRequest(
		"/clippings/highlights/download",
		username,
		apiKey,
		{
			queryParams: { s3Key },
			noticeMessage: "", // No notice for this one, it's called in a loop
		}
	);

	if (isDownloadUrlResponse(data)) {
		return data.downloadUrl;
	}
	return null;
}

/**
 * Downloads content from a pre-signed S3 URL.
 * @param downloadUrl The pre-signed URL to download the file from.
 * @returns The content of the file as a string, or null if an error occurs.
 */
export async function downloadFileContent(
	downloadUrl: string
): Promise<string | null> {
	console.log(`Downloading file content from S3: ${downloadUrl}`);

	try {
		const response = await requestUrl({ url: downloadUrl });

		// Unlike fetch, requestUrl throws an error for non-2xx responses, which is caught below.
		// We just need to check for a successful status code.
		if (response.status === 200) {
			console.log(`Successfully downloaded file content.`);
			return response.text;
		} else {
			console.error(
				`Error downloading file content from S3: ${response.status}`,
				response.text
			);
			new Notice(
				`Error downloading file content: ${response.status}. See console.`,
				7000
			);
			return null;
		}
	} catch (error) {
		console.error(`Network or other error downloading file content:`, error);
		new Notice(`Network error downloading file content. See console.`, 7000);
		return null;
	}
}

/**
 * Fetches the daily bundles for a specific date from the server.
 * @param username The username for the API.
 * @param apiKey The API Key for authentication.
 * @param date The target date in "YYYY-MM-DD" format.
 * @returns A promise that resolves to an array of DailyBundle objects or null if an error occurs.
 */
export async function getDailyBundle(
	username: string,
	apiKey: string,
	date: string
): Promise<DailyBundle[] | null> {
	if (!date) {
		new Notice("Date is missing.", 5000);
		return null;
	}

	const data = await makeNewslogRequest(
		"/clippings/daily-bundle",
		username,
		apiKey,
		{
			queryParams: { date },
			noticeMessage: `Fetching newslog bundle for ${date}...`,
		}
	);

	if (isBundlesResponse(data)) {
		console.log(
			`Successfully received ${data.bundles.length} bundles for ${date}.`
		);
		return data.bundles as DailyBundle[];
	}

	if (data) {
		console.error("Bundles not found in response or invalid format:", data);
		new Notice(
			"Error: Bundles not provided by server or invalid format.",
			7000
		);
	}
	return null;
}