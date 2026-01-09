import { DOM_IDS, STORAGE_KEYS } from './constants.js';
import { getElement } from './utils.js';
import { NotificationManager } from './notificationManager.js';
import { HistoryManager } from './historyManager.js';
import { ClipboardManager } from './clipboardManager.js';
import { SearchManager } from './searchManager.js';
import { StorageManager } from './storageManager.js';
import { TextTransformManager } from './textTransformManager.js';

class ClipEditApp {
    constructor() {
        this.elements = this.initializeElements();
        this.initializeManagers();
        this.bindEvents();
        this.init();
    }

    initializeElements() {
        const elements = {};
        for (const [key, id] of Object.entries(DOM_IDS)) {
            const element = getElement(id);
            if (!element) {
                console.error(`Element not found: ${id} (${key})`);
            }
            elements[key] = element;
        }
        return elements;
    }

    initializeManagers() {
        this.notificationManager = new NotificationManager(
            this.elements.notification,
            this.elements.notificationMessage
        );

        this.historyManager = new HistoryManager(
            this.elements.editor,
            this.elements.undoBtn,
            this.elements.redoBtn
        );

        this.clipboardManager = new ClipboardManager(
            this.elements.editor,
            this.notificationManager,
            this.historyManager,
            this.updateStats.bind(this)
        );

        this.storageManager = new StorageManager();

        this.searchManager = new SearchManager(
            this.elements.editor,
            this.elements.searchPanel,
            this.elements.searchInput,
            this.elements.replaceInput,
            this.elements.caseSensitiveCheckbox,
            this.elements.regexCheckbox,
            this.notificationManager,
            this.historyManager,
            this.updateStats.bind(this)
        );

        this.textTransformManager = new TextTransformManager(
            this.elements.editor,
            this.notificationManager,
            this.historyManager,
            this.updateStats.bind(this),
            this.storageManager,
            STORAGE_KEYS.EDITOR_CONTENT
        );
    }

    updateStats() {
        const text = this.elements.editor.value;
        const charCount = text.length;
        const lineCount = text.split('\n').length;
        this.elements.statsBar.innerHTML = `<span>文字数: ${charCount}</span><span>行数: ${lineCount}</span>`;
    }

    bindEvents() {
        this.elements.editor.addEventListener('input', () => {
            this.updateStats();
            this.historyManager.record();
            this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
        });

        this.elements.editor.addEventListener('paste', () => {
            setTimeout(() => {
                this.updateStats();
                this.historyManager.record(true);
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
                this.notificationManager.show('ペーストしました');
            }, 10);
        });

        this.elements.pasteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 直接ここでClipboard APIを呼び出す（ユーザーインタラクション内）
            try {
                const text = await navigator.clipboard.readText();
                this.elements.editor.value = text;
                this.elements.editor.value = text;
                this.updateStats();
                this.historyManager.record(true);
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
                this.notificationManager.show('ペーストしました');
            } catch (error) {
                console.log('Direct clipboard access failed:', error);
                // フォールバック
                this.clipboardManager.fallbackPaste();
            }
        });

        this.elements.copyBtn.addEventListener('click', () => {
            this.clipboardManager.copy();
        });

        this.elements.clearBtn.addEventListener('click', () => {
            this.elements.editor.value = '';
            this.updateStats();
            this.historyManager.record(true);
            this.storageManager.remove(STORAGE_KEYS.EDITOR_CONTENT);
            this.notificationManager.show('クリアしました');
        });

        this.elements.selectAllBtn.addEventListener('click', () => {
            this.elements.editor.select();
        });

        this.elements.undoBtn.addEventListener('click', () => {
            if (this.historyManager.undo()) {
                this.updateStats();
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
            }
        });

        this.elements.redoBtn.addEventListener('click', () => {
            if (this.historyManager.redo()) {
                this.updateStats();
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
            }
        });

        this.elements.searchBtn.addEventListener('click', () => {
            this.searchManager.show();
        });

        this.elements.closeSearchPanelBtn.addEventListener('click', () => {
            this.searchManager.hide();
        });

        this.elements.findNextBtn.addEventListener('click', () => {
            this.searchManager.find();
        });

        this.elements.findPrevBtn.addEventListener('click', () => {
            this.searchManager.find(true);
        });

        this.elements.replaceBtn.addEventListener('click', () => {
            this.searchManager.replace();
            this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
        });

        this.elements.replaceAllBtn.addEventListener('click', () => {
            this.searchManager.replaceAll();
            this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
        });

        if (this.elements.transformBtn) {
            this.elements.transformBtn.addEventListener('click', () => {
                if (this.elements.transformPanel) {
                    this.elements.transformPanel.style.display = 'flex';
                }
            });
        }

        if (this.elements.closeTransformPanelBtn) {
            this.elements.closeTransformPanelBtn.addEventListener('click', () => {
                this.elements.transformPanel.style.display = 'none';
            });
        }

        if (this.elements.toHalfWidthBtn) {
            this.elements.toHalfWidthBtn.addEventListener('click', () => {
                this.textTransformManager.toHalfWidth();
                this.elements.transformPanel.style.display = 'none';
            });
        }

        if (this.elements.toFullWidthBtn) {
            this.elements.toFullWidthBtn.addEventListener('click', () => {
                this.textTransformManager.toFullWidth();
                this.elements.transformPanel.style.display = 'none';
            });
        }
    }

    init() {
        this.historyManager.init();

        // Restore content from storage
        const savedContent = this.storageManager.get(STORAGE_KEYS.EDITOR_CONTENT);
        if (savedContent) {
            this.elements.editor.value = savedContent;
        }

        this.updateStats();
    }
}

export default ClipEditApp;