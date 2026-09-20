export const CONSTANTS = {
    MAX_HISTORY: 10,
    MAX_CLIPBOARD_HISTORY: 20,
    HISTORY_PREVIEW_LENGTH: 200,
    HISTORY_MERGE_WINDOW_MS: 30000,
    HISTORY_MERGE_SIMILARITY: 0.8,
    HISTORY_MERGE_MIN_LENGTH: 40,
    HISTORY_TOOLTIP_LENGTH: 500,
    NOTIFICATION_DURATION: 3000
};

export const DOM_IDS = {
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
    regexCheckbox: 'regex-checkbox',
    findPrevBtn: 'find-prev-btn',
    findNextBtn: 'find-next-btn',
    replaceBtn: 'replace-btn',
    replaceAllBtn: 'replace-all-btn',
    transformBtn: 'transform-btn',
    transformPanel: 'transform-panel',
    closeTransformPanelBtn: 'close-transform-panel-btn',
    toHalfWidthBtn: 'to-half-width-btn',
    toFullWidthBtn: 'to-full-width-btn',
    historyBtn: 'history-btn',
    historyPanel: 'history-panel',
    closeHistoryPanelBtn: 'close-history-panel-btn',
    historyList: 'history-list',
    clearHistoryBtn: 'clear-history-btn'
};

export const STORAGE_KEYS = {
    EDITOR_CONTENT: 'clipedit_editor_content',
    CLIPBOARD_HISTORY: 'clipedit_clipboard_history'
};