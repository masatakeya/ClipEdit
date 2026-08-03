export class ClipboardManager {
    constructor(editor, notificationManager, historyManager, updateStats, clipboardHistoryManager) {
        this.editor = editor;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
        this.clipboardHistoryManager = clipboardHistoryManager;
    }

    async paste() {
        try {
            const text = await navigator.clipboard.readText();
            this.editor.value = text;
            this.updateStats();
            this.historyManager.record(true);
            this.clipboardHistoryManager.add(text);
            this.notificationManager.show('ペーストしました');
        } catch (err) {
            console.error('Failed to read clipboard: ', err);
            this.fallbackPaste();
        }
    }

    fallbackPaste() {
        this.editor.focus();
        this.notificationManager.show('Ctrl+V または右クリックメニューからペーストしてください');
    }

    async copy() {
        try {
            await navigator.clipboard.writeText(this.editor.value);
            this.clipboardHistoryManager.add(this.editor.value);
            this.notificationManager.show('コピーしました');
        } catch (err) {
            console.error('Failed to copy: ', err);
            this.editor.select();
            this.notificationManager.show('コピーに失敗しました。手動でコピーしてください。');
        }
    }
    
}