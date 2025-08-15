export class ClipboardManager {
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
            this.fallbackPaste();
        }
    }
    
    fallbackPaste() {
        this.editor.focus();
        this.editor.select();
        
        // execCommandを試す（一部のブラウザでは動作する可能性がある）
        try {
            if (document.execCommand('paste')) {
                // 少し待ってから統計を更新
                setTimeout(() => {
                    this.updateStats();
                    this.historyManager.record(true);
                    this.notificationManager.show('ペーストしました');
                }, 100);
                return;
            }
        } catch (error) {
            console.log('execCommand fallback failed:', error);
        }
        
        // 最終フォールバック: ユーザーに手動操作を促す
        this.notificationManager.show('Ctrl+V または右クリックメニューからペーストしてください');
    }
    
    triggerPaste() {
        this.editor.focus();
        const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer()
        });
        this.editor.dispatchEvent(pasteEvent);
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
        console.log('Paste button clicked');
        this.editor.focus();
        
        // Clipboard APIの存在確認
        console.log('navigator.clipboard available:', !!navigator.clipboard);
        console.log('navigator.clipboard.readText available:', !!(navigator.clipboard && navigator.clipboard.readText));
        
        // 最初にClipboard APIを試す
        if (navigator.clipboard && navigator.clipboard.readText) {
            try {
                console.log('Attempting to read clipboard...');
                const text = await navigator.clipboard.readText();
                console.log('Clipboard read successful, text length:', text.length);
                this.editor.value = text;
                this.updateStats();
                this.historyManager.record(true);
                this.notificationManager.show('ペーストしました');
                return;
            } catch (error) {
                console.error('Clipboard API failed:', error);
                console.log('Error name:', error.name);
                console.log('Error message:', error.message);
                // 権限がない場合は下のフォールバックへ
            }
        } else {
            console.log('Clipboard API not available');
        }

        // フォールバック: ユーザーに手動ペーストを促す
        console.log('Falling back to manual paste');
        this.fallbackPaste();
    }
}