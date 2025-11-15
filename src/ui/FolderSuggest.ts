import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
    constructor(app: App, private textInputEl: HTMLInputElement) {
        super(app, textInputEl);
    }

    getSuggestions(inputStr: string): TFolder[] {
        const abstractFiles = this.app.vault.getAllLoadedFiles();
        const folders: TFolder[] = [];
        const lowerCaseInputStr = inputStr.toLowerCase();

        abstractFiles.forEach((file) => {
            if (file instanceof TFolder && file.path.toLowerCase().includes(lowerCaseInputStr)) {
                folders.push(file);
            }
        });

        return folders;
    }

    renderSuggestion(folder: TFolder, el: HTMLElement) {
        el.setText(folder.path);
    }

    selectSuggestion(folder: TFolder) {
        this.textInputEl.value = folder.path;
        this.textInputEl.dispatchEvent(new Event("input"));
        this.close();
    }
}
