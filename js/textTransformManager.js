export class TextTransformManager {
    constructor(editor, notificationManager, historyManager, updateStats, storageManager, storageKey) {
        this.editor = editor;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
        this.storageManager = storageManager;
        this.storageKey = storageKey;
    }

    /**
     * 全角英数字を半角に変換
     */
    toHalfWidth() {
        const text = this.editor.value;
        const converted = text.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
        });

        if (text !== converted) {
            this.editor.value = converted;
            this.updateStats();
            this.historyManager.record(true);
            this.storageManager.set(this.storageKey, converted);
            this.notificationManager.show('半角に変換しました');
        } else {
            this.notificationManager.show('変換する文字がありません');
        }
    }

    /**
     * 半角英数字を全角に変換
     */
    toFullWidth() {
        const text = this.editor.value;
        const converted = text.replace(/[A-Za-z0-9]/g, (char) => {
            return String.fromCharCode(char.charCodeAt(0) + 0xFEE0);
        });

        if (text !== converted) {
            this.editor.value = converted;
            this.updateStats();
            this.historyManager.record(true);
            this.storageManager.set(this.storageKey, converted);
            this.notificationManager.show('全角に変換しました');
        } else {
            this.notificationManager.show('変換する文字がありません');
        }
    }

    /**
     * 変換メニューを表示
     */
    showTransformMenu(callback) {
        return {
            toHalf: () => {
                this.toHalfWidth();
                if (callback) callback();
            },
            toFull: () => {
                this.toFullWidth();
                if (callback) callback();
            }
        };
    }
}
