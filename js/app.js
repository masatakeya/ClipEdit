import { CONSTANTS, DOM_IDS, STORAGE_KEYS } from './constants.js';
import { getElement } from './utils.js';
import { NotificationManager } from './notificationManager.js';
import { HistoryManager } from './historyManager.js';
import { ClipboardManager } from './clipboardManager.js';
import { ClipboardHistoryManager } from './clipboardHistoryManager.js';
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

        this.storageManager = new StorageManager();

        this.clipboardHistoryManager = new ClipboardHistoryManager(
            this.storageManager,
            STORAGE_KEYS.CLIPBOARD_HISTORY,
            CONSTANTS.MAX_CLIPBOARD_HISTORY
        );

        this.clipboardManager = new ClipboardManager(
            this.elements.editor,
            this.notificationManager,
            this.historyManager,
            this.updateStats.bind(this),
            this.clipboardHistoryManager
        );

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
                this.clipboardHistoryManager.add(this.elements.editor.value);
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
                this.updateStats();
                this.historyManager.record(true);
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
                this.clipboardHistoryManager.add(text);
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

        this.elements.historyBtn.addEventListener('click', () => {
            this.renderHistoryList();
            this.elements.historyPanel.style.display = 'flex';
        });

        this.elements.closeHistoryPanelBtn.addEventListener('click', () => {
            this.elements.historyPanel.style.display = 'none';
        });

        this.elements.clearHistoryBtn.addEventListener('click', () => {
            this.clipboardHistoryManager.clear();
            this.renderHistoryList();
            this.notificationManager.show('履歴を削除しました');
        });
    }

    createPreviewText(text) {
        // 改行は残しつつ（CSS側で2行までに省略表示）、余分な空白だけを詰める
        const normalized = text
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t\u3000]+/g, ' ')
            .replace(/\n\s*\n+/g, '\n')
            .trim();

        if (!normalized) return '(空白のみ)';

        return normalized.length > CONSTANTS.HISTORY_PREVIEW_LENGTH
            ? `${normalized.slice(0, CONSTANTS.HISTORY_PREVIEW_LENGTH)}…`
            : normalized;
    }

    renderHistoryList() {
        const items = this.clipboardHistoryManager.getAll();
        this.elements.historyList.innerHTML = '';

        if (items.length === 0) {
            const emptyItem = document.createElement('li');
            emptyItem.className = 'history-empty';
            emptyItem.textContent = '履歴がありません';
            this.elements.historyList.appendChild(emptyItem);
            return;
        }

        items.forEach((item, index) => {
            const li = document.createElement('li');
            li.className = 'history-item';

            const contentBtn = document.createElement('button');
            contentBtn.type = 'button';
            contentBtn.className = 'history-item__content';

            const preview = document.createElement('span');
            preview.className = 'history-item__preview';
            preview.textContent = this.createPreviewText(item.text);

            const time = document.createElement('span');
            time.className = 'history-item__time';
            time.textContent = new Date(item.timestamp).toLocaleString('ja-JP', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            contentBtn.title = item.text.slice(0, CONSTANTS.HISTORY_TOOLTIP_LENGTH);
            contentBtn.appendChild(preview);
            contentBtn.appendChild(time);
            contentBtn.addEventListener('click', () => {
                this.elements.editor.value = item.text;
                this.updateStats();
                this.historyManager.record(true);
                this.storageManager.set(STORAGE_KEYS.EDITOR_CONTENT, this.elements.editor.value);
                this.elements.historyPanel.style.display = 'none';
                this.notificationManager.show('履歴から復元しました');
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.className = 'history-item__delete';
            deleteBtn.textContent = '×';
            deleteBtn.setAttribute('aria-label', '削除');
            deleteBtn.addEventListener('click', () => {
                this.clipboardHistoryManager.remove(index);
                this.renderHistoryList();
            });

            li.appendChild(contentBtn);
            li.appendChild(deleteBtn);
            this.elements.historyList.appendChild(li);
        });
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