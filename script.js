document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const editor = document.getElementById('editor');
    const pasteBtn = document.getElementById('paste-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const searchBtn = document.getElementById('search-btn');
    const statsBar = document.getElementById('stats-bar');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');

    // Search Panel Elements
    const searchPanel = document.getElementById('search-replace-panel');
    const closeSearchPanelBtn = document.getElementById('close-search-panel-btn');
    const searchInput = document.getElementById('search-input');
    const replaceInput = document.getElementById('replace-input');
    const caseSensitiveCheckbox = document.getElementById('case-sensitive-checkbox');
    const findPrevBtn = document.getElementById('find-prev-btn');
    const findNextBtn = document.getElementById('find-next-btn');
    const replaceBtn = document.getElementById('replace-btn');
    const replaceAllBtn = document.getElementById('replace-all-btn');

    // --- State ---
    const MAX_HISTORY = 10;
    let undoHistory = [];
    let redoHistory = [];
    let isUndoing = false;
    let isRedoing = false;

    // --- History Management ---
    const updateButtonState = () => {
        undoBtn.disabled = undoHistory.length <= 1;
        redoBtn.disabled = redoHistory.length === 0;
    };

    const recordHistory = (force = false) => {
        if (isUndoing || isRedoing) return;
        const currentText = editor.value;
        const lastHistory = undoHistory[undoHistory.length - 1];

        if (force || lastHistory !== currentText) {
            undoHistory.push(currentText);
            if (undoHistory.length > MAX_HISTORY + 1) {
                undoHistory.shift();
            }
            redoHistory = [];
            updateButtonState();
        }
    };

    // --- Stats ---
    const updateStats = () => {
        const text = editor.value;
        const charCount = text.length;
        const lineCount = text.split('\n').filter(Boolean).length || (text.length > 0 ? 1 : 0);
        statsBar.innerHTML = `<span>文字数: ${charCount}</span><span>行数: ${lineCount}</span>`;
    };

    editor.addEventListener('input', () => {
        updateStats();
        recordHistory();
    });

    // --- Notifications ---
    const showNotification = (message) => {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    // --- Clipboard ---
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            editor.value = text;
            updateStats();
            recordHistory(true);
            showNotification('ペーストしました');
        } catch (err) {
            console.error('Failed to read clipboard: ', err);
            showNotification('ペーストに失敗しました。手動でペーストしてください。');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(editor.value);
            showNotification('コピーしました');
        } catch (err) {
            console.error('Failed to copy: ', err);
            editor.select();
            showNotification('コピーに失敗しました。手動でコピーしてください。');
        }
    };

    pasteBtn.addEventListener('click', async () => {
        if (navigator.permissions) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
                if (permissionStatus.state === 'denied') {
                    showNotification('クリップボードへのアクセスが拒否されています。');
                    return;
                }
                // For 'granted' or 'prompt', proceed to handlePaste()
                handlePaste();
            } catch (error) {
                // Fallback for browsers that don't support the permission query
                handlePaste();
            }
        } else {
            // Fallback for browsers that don't support the Permissions API
            handlePaste();
        }
    });

    copyBtn.addEventListener('click', handleCopy);

    // --- Toolbar Actions ---
    clearBtn.addEventListener('click', () => {
        editor.value = '';
        updateStats();
        recordHistory(true);
        showNotification('クリアしました');
    });

    selectAllBtn.addEventListener('click', () => editor.select());

    undoBtn.addEventListener('click', () => {
        if (undoHistory.length > 1) {
            isUndoing = true;
            redoHistory.push(undoHistory.pop());
            editor.value = undoHistory[undoHistory.length - 1];
            updateStats();
            updateButtonState();
            isUndoing = false;
        }
    });

    redoBtn.addEventListener('click', () => {
        if (redoHistory.length > 0) {
            isRedoing = true;
            const nextState = redoHistory.pop();
            undoHistory.push(nextState);
            editor.value = nextState;
            updateStats();
            updateButtonState();
            isRedoing = false;
        }
    });

    // --- Search and Replace ---
    searchBtn.addEventListener('click', () => searchPanel.style.display = 'flex');
    closeSearchPanelBtn.addEventListener('click', () => searchPanel.style.display = 'none');

    const find = (backward = false) => {
        const searchTerm = searchInput.value;
        if (!searchTerm) return;

        const text = editor.value;
        const isCaseSensitive = caseSensitiveCheckbox.checked;
        const searchFlags = isCaseSensitive ? '' : 'i';

        const currentPos = backward ? editor.selectionStart : editor.selectionEnd;
        let searchText = text;
        if (!isCaseSensitive) {
            searchText = text.toLowerCase();
            searchTerm = searchTerm.toLowerCase();
        }

        let findPos;
        if (backward) {
            findPos = searchText.lastIndexOf(searchTerm, currentPos - 1);
        } else {
            findPos = searchText.indexOf(searchTerm, currentPos);
        }

        if (findPos !== -1) {
            editor.focus();
            editor.setSelectionRange(findPos, findPos + searchTerm.length);
        } else {
            showNotification('見つかりませんでした');
        }
    };

    findNextBtn.addEventListener('click', () => find());
    findPrevBtn.addEventListener('click', () => find(true));

    replaceBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value;
        const replaceTerm = replaceInput.value;
        if (!searchTerm) return;

        const selectedText = editor.value.substring(editor.selectionStart, editor.selectionEnd);
        const compareTerm = caseSensitiveCheckbox.checked ? searchTerm : searchTerm.toLowerCase();
        const compareSelected = caseSensitiveCheckbox.checked ? selectedText : selectedText.toLowerCase();

        if (compareSelected === compareTerm) {
            const start = editor.selectionStart;
            editor.setRangeText(replaceTerm, start, editor.selectionEnd, 'end');
            updateStats();
            recordHistory(true);
        }
        find();
    });

    replaceAllBtn.addEventListener('click', () => {
        const searchTerm = searchInput.value;
        const replaceTerm = replaceInput.value;
        if (!searchTerm) return;

        const flags = caseSensitiveCheckbox.checked ? 'g' : 'gi';
        const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('editor');
    const pasteBtn = document.getElementById('paste-btn');
    const copyBtn = document.getElementById('copy-btn');
    const clearBtn = document.getElementById('clear-btn');
    const selectAllBtn = document.getElementById('select-all-btn');
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    const statsBar = document.getElementById('stats-bar');
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');

    const MAX_HISTORY = 10;
    let undoHistory = [];
    let redoHistory = [];
    let isUndoing = false;
    let isRedoing = false;

    // --- 履歴管理 ---
    const updateButtonState = () => {
        undoBtn.disabled = undoHistory.length === 0;
        redoBtn.disabled = redoHistory.length === 0;
    };

    const recordHistory = () => {
        if (isUndoing || isRedoing) return;
        const currentText = editor.value;
        const lastHistory = undoHistory[undoHistory.length - 1];

        if (lastHistory !== currentText) {
            undoHistory.push(currentText);
            if (undoHistory.length > MAX_HISTORY) {
                undoHistory.shift(); // 古い履歴から削除
            }
            redoHistory = []; // 新しい操作でRedo履歴はクリア
            updateButtonState();
        }
    };

    // --- 統計情報の更新 ---
    const updateStats = () => {
        const text = editor.value;
        const charCount = text.length;
        const lineCount = text.split('\n').filter(Boolean).length || (text.length > 0 ? 1 : 0);

        statsBar.innerHTML = `
            <span>文字数: ${charCount}</span>
            <span>行数: ${lineCount}</span>
        `;
    };

    editor.addEventListener('input', () => {
        updateStats();
        recordHistory();
    });

    // --- 通知の表示 ---
    const showNotification = (message) => {
        notificationMessage.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    };

    // --- クリップボード操作 ---
    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            editor.value = text;
            updateStats();
            recordHistory();
            showNotification('ペーストしました');
        } catch (err) {
            console.error('Failed to read clipboard contents: ', err);
            showNotification('ペーストに失敗しました。手動でペーストしてください。');
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(editor.value);
            showNotification('コピーしました');
        } catch (err) {
            console.error('Failed to copy text: ', err);
            editor.select();
            showNotification('コピーに失敗しました。テキストを選択しましたので、手動でコピーしてください。');
        }
    };

    pasteBtn.addEventListener('click', async () => {
        if (navigator.permissions) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'clipboard-read' });
                if (permissionStatus.state === 'granted' || permissionStatus.state === 'prompt') {
                    handlePaste();
                }
            } catch (error) {
                handlePaste();
            }
        } else {
            handlePaste();
        }
    });

    copyBtn.addEventListener('click', handleCopy);

    // --- ツールバー操作 ---
    clearBtn.addEventListener('click', () => {
        editor.value = '';
        updateStats();
        recordHistory();
        showNotification('クリアしました');
    });

    selectAllBtn.addEventListener('click', () => {
        editor.select();
    });

    undoBtn.addEventListener('click', () => {
        if (undoHistory.length > 1) {
            isUndoing = true;
            const currentState = undoHistory.pop();
            redoHistory.push(currentState);
            editor.value = undoHistory[undoHistory.length - 1];
            updateStats();
            updateButtonState();
            isUndoing = false;
        }
    });

    redoBtn.addEventListener('click', () => {
        if (redoHistory.length > 0) {
            isRedoing = true;
            const nextState = redoHistory.pop();
            undoHistory.push(nextState);
            editor.value = nextState;
            updateStats();
            updateButtonState();
            isRedoing = false;
        }
    });

    // 初期化
    const init = () => {
        undoHistory.push(editor.value);
        updateStats();
        updateButtonState();
    };

    init();
});'), flags);
        const originalText = editor.value;
        const newText = originalText.replace(regex, replaceTerm);

        if (originalText !== newText) {
            const replacements = (originalText.match(regex) || []).length;
            editor.value = newText;
            updateStats();
            recordHistory(true);
            showNotification(`${replacements}件を置換しました`);
        } else {
            showNotification('見つかりませんでした');
        }
    });

    // --- Init ---
    const init = () => {
        undoHistory.push(editor.value);
        updateStats();
        updateButtonState();
    };

    init();
});
