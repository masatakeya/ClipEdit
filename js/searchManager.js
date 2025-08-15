import { escapeRegExp } from './utils.js';

export class SearchManager {
    constructor(editor, searchPanel, searchInput, replaceInput, caseSensitiveCheckbox, notificationManager, historyManager, updateStats) {
        this.editor = editor;
        this.searchPanel = searchPanel;
        this.searchInput = searchInput;
        this.replaceInput = replaceInput;
        this.caseSensitiveCheckbox = caseSensitiveCheckbox;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
    }
    
    show() {
        this.searchPanel.style.display = 'flex';
    }
    
    hide() {
        this.searchPanel.style.display = 'none';
    }
    
    find(backward = false) {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) return;

        const text = this.editor.value;
        const isCaseSensitive = this.caseSensitiveCheckbox.checked;

        const currentPos = backward ? this.editor.selectionStart : this.editor.selectionEnd;
        let searchText = text;
        let term = searchTerm;
        
        if (!isCaseSensitive) {
            searchText = text.toLowerCase();
            term = searchTerm.toLowerCase();
        }

        let findPos;
        if (backward) {
            findPos = searchText.lastIndexOf(term, currentPos - 1);
        } else {
            findPos = searchText.indexOf(term, currentPos);
        }

        if (findPos !== -1) {
            this.editor.focus();
            this.editor.setSelectionRange(findPos, findPos + searchTerm.length);
        } else {
            this.notificationManager.show('見つかりませんでした');
        }
    }
    
    replace() {
        const searchTerm = this.searchInput.value;
        const replaceTerm = this.replaceInput.value;
        if (!searchTerm) return;

        const selectedText = this.editor.value.substring(this.editor.selectionStart, this.editor.selectionEnd);
        const compareTerm = this.caseSensitiveCheckbox.checked ? searchTerm : searchTerm.toLowerCase();
        const compareSelected = this.caseSensitiveCheckbox.checked ? selectedText : selectedText.toLowerCase();

        if (compareSelected === compareTerm) {
            const start = this.editor.selectionStart;
            this.editor.setRangeText(replaceTerm, start, this.editor.selectionEnd, 'end');
            this.updateStats();
            this.historyManager.record(true);
        }
        this.find();
    }
    
    replaceAll() {
        const searchTerm = this.searchInput.value;
        const replaceTerm = this.replaceInput.value;
        if (!searchTerm) return;

        const flags = this.caseSensitiveCheckbox.checked ? 'g' : 'gi';
        const regex = new RegExp(escapeRegExp(searchTerm), flags);
        const originalText = this.editor.value;
        const newText = originalText.replace(regex, replaceTerm);

        if (originalText !== newText) {
            const replacements = (originalText.match(regex) || []).length;
            this.editor.value = newText;
            this.updateStats();
            this.historyManager.record(true);
            this.notificationManager.show(`${replacements}件を置換しました`);
        } else {
            this.notificationManager.show('見つかりませんでした');
        }
    }
}