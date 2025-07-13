// Constants
const CONSTANTS = {
    MAX_HISTORY: 10,
    NOTIFICATION_DURATION: 3000
};

// DOM Element IDs
const DOM_IDS = {
    editor: 'editor',
    pasteBtn: 'paste-btn',
    copyBtn: 'copy-btn',
    clearBtn: 'clear-btn',
    selectAllBtn: 'select-all-btn',
    undoBtn: 'undo-btn',
    redoBtn: 'redo-btn',
    searchBtn: 'search-btn',
    statsBar: 'stats-bar',
    notification: 'notification',
    notificationMessage: 'notification-message',
    searchPanel: 'search-replace-panel',
    closeSearchPanelBtn: 'close-search-panel-btn',
    searchInput: 'search-input',
    replaceInput: 'replace-input',
    caseSensitiveCheckbox: 'case-sensitive-checkbox',
    findPrevBtn: 'find-prev-btn',
    findNextBtn: 'find-next-btn',
    replaceBtn: 'replace-btn',
    replaceAllBtn: 'replace-all-btn'
};

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements Helper
    const getElement = (id) => document.getElementById(id);
    
    // --- DOM Elements ---
    const elements = {
        editor: getElement(DOM_IDS.editor),
        pasteBtn: getElement(DOM_IDS.pasteBtn),
        copyBtn: getElement(DOM_IDS.copyBtn),
        clearBtn: getElement(DOM_IDS.clearBtn),
        selectAllBtn: getElement(DOM_IDS.selectAllBtn),
        undoBtn: getElement(DOM_IDS.undoBtn),
        redoBtn: getElement(DOM_IDS.redoBtn),
        searchBtn: getElement(DOM_IDS.searchBtn),
        statsBar: getElement(DOM_IDS.statsBar),
        notification: getElement(DOM_IDS.notification),
        notificationMessage: getElement(DOM_IDS.notificationMessage),
        searchPanel: getElement(DOM_IDS.searchPanel),
        closeSearchPanelBtn: getElement(DOM_IDS.closeSearchPanelBtn),
        searchInput: getElement(DOM_IDS.searchInput),
        replaceInput: getElement(DOM_IDS.replaceInput),
        caseSensitiveCheckbox: getElement(DOM_IDS.caseSensitiveCheckbox),
        findPrevBtn: getElement(DOM_IDS.findPrevBtn),
        findNextBtn: getElement(DOM_IDS.findNextBtn),
        replaceBtn: getElement(DOM_IDS.replaceBtn),
        replaceAllBtn: getElement(DOM_IDS.replaceAllBtn)
    };

    // --- History Manager ---
    class HistoryManager {
        constructor(editor, undoBtn, redoBtn) {
            this.editor = editor;
            this.undoBtn = undoBtn;
            this.redoBtn = redoBtn;
            this.undoHistory = [];
            this.redoHistory = [];
            this.isUndoing = false;
            this.isRedoing = false;
        }
        
        updateButtonState() {
            this.undoBtn.disabled = this.undoHistory.length <= 1;
            this.redoBtn.disabled = this.redoHistory.length === 0;
        }
        
        record(force = false) {
            if (this.isUndoing || this.isRedoing) return;
            const currentText = this.editor.value;
            const lastHistory = this.undoHistory[this.undoHistory.length - 1];

            if (force || lastHistory !== currentText) {
                this.undoHistory.push(currentText);
                if (this.undoHistory.length > CONSTANTS.MAX_HISTORY + 1) {
                    this.undoHistory.shift();
                }
                this.redoHistory = [];
                this.updateButtonState();
            }
        }
        
        undo() {
            if (this.undoHistory.length > 1) {
                this.isUndoing = true;
                this.redoHistory.push(this.undoHistory.pop());
                this.editor.value = this.undoHistory[this.undoHistory.length - 1];
                this.updateButtonState();
                this.isUndoing = false;
                return true;
            }
            return false;
        }
        
        redo() {
            if (this.redoHistory.length > 0) {
                this.isRedoing = true;
                const nextState = this.redoHistory.pop();
                this.undoHistory.push(nextState);
                this.editor.value = nextState;
                this.updateButtonState();
                this.isRedoing = false;
                return true;
            }
            return false;
        }
        
        init() {
            this.undoHistory.push(this.editor.value);
            this.updateButtonState();
        }
    }
    
    const historyManager = new HistoryManager(elements.editor, elements.undoBtn, elements.redoBtn);

    // --- Stats ---
    const updateStats = () => {
        const text = elements.editor.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        elements.statsBar.innerHTML = `<span>文字数: ${charCount}</span><span>行数: ${lineCount}</span>`;
    };

    elements.editor.addEventListener('input', () => {
        updateStats();
        historyManager.record();
    });

    // --- Notification Manager ---
    class NotificationManager {
        constructor(notificationElement, messageElement) {
            this.notification = notificationElement;
            this.messageElement = messageElement;
        }
        
        show(message) {
            this.messageElement.textContent = message;
            this.notification.classList.add('show');
            setTimeout(() => {
                this.notification.classList.remove('show');
            }, CONSTANTS.NOTIFICATION_DURATION);
        }
    }
    
    const notificationManager = new NotificationManager(elements.notification, elements.notificationMessage);

    // --- Clipboard Manager ---
    class ClipboardManager {
        constructor(editor, notificationManager, historyManager, updateStats) {
            this.editor = editor;
            this.notificationManager = notificationManager;
            this.historyManager = historyManager;
            this.updateStats = updateStats;
        }
        
        async paste() {
            try {
                const text = await navigator.clipboard.readText();
                this.editor.value = text;
                this.updateStats();
                this.historyManager.record(true);
                this.notificationManager.show('ペーストしました');
            } catch (err) {
                console.error('Failed to read clipboard: ', err);
                this.notificationManager.show('ペーストに失敗しました。手動でペーストしてください。');
            }
        }
        
        async copy() {
            try {
                await navigator.clipboard.writeText(this.editor.value);
                this.notificationManager.show('コピーしました');
            } catch (err) {
                console.error('Failed to copy: ', err);
                this.editor.select();
                this.notificationManager.show('コピーに失敗しました。手動でコピーしてください。');
            }
        }
        
        async pasteWithPermissionCheck() {
            if (navigator.permissions) {
                try {
                    const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
                    if (permissionStatus.state === 'denied') {
                        this.notificationManager.show('クリップボードへのアクセスが拒否されています。');
                        return;
                    }
                    this.paste();
                } catch (error) {
                    this.paste();
                }
            } else {
                this.paste();
            }
        }
    }
    
    const clipboardManager = new ClipboardManager(elements.editor, notificationManager, historyManager, updateStats);

    elements.pasteBtn.addEventListener('click', () => clipboardManager.pasteWithPermissionCheck());
    elements.copyBtn.addEventListener('click', () => clipboardManager.copy());

    // --- Toolbar Actions ---
    elements.clearBtn.addEventListener('click', () => {
        elements.editor.value = '';
        updateStats();
        historyManager.record(true);
        notificationManager.show('クリアしました');
    });

    elements.selectAllBtn.addEventListener('click', () => elements.editor.select());

    elements.undoBtn.addEventListener('click', () => {
        if (historyManager.undo()) {
            updateStats();
        }
    });

    elements.redoBtn.addEventListener('click', () => {
        if (historyManager.redo()) {
            updateStats();
        }
    });

    // --- Search Manager ---
    class SearchManager {
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
            const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
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
    
    const searchManager = new SearchManager(
        elements.editor, elements.searchPanel, elements.searchInput, elements.replaceInput,
        elements.caseSensitiveCheckbox, notificationManager, historyManager, updateStats
    );

    elements.searchBtn.addEventListener('click', () => searchManager.show());
    elements.closeSearchPanelBtn.addEventListener('click', () => searchManager.hide());
    elements.findNextBtn.addEventListener('click', () => searchManager.find());
    elements.findPrevBtn.addEventListener('click', () => searchManager.find(true));
    elements.replaceBtn.addEventListener('click', () => searchManager.replace());
    elements.replaceAllBtn.addEventListener('click', () => searchManager.replaceAll());

    // --- Init ---
    const init = () => {
        historyManager.init();
        updateStats();
    };

    init();
});