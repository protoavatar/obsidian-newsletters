export interface Newsletter {
  name: string;
  url: string;
  author: string;
  description: string;
}

export interface NewslogSyncSettings {
  newsletters: Newsletter[];
  username: string;
  apiKey: string;
  lastSyncDate: string;
  outputFolderPath: string;
  bundleFolderPath: string;
  downloadedDates: string[];
}

export interface BundleFile {
  filename: string;
  content: string;
  url: string;
}

export interface DailyBundle {
  files: BundleFile[];
  bundle_folder_name: string;
}