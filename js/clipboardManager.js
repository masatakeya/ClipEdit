// Markdown などテキストとして読めるファイルの拡張子
const TEXT_FILE_PATTERN = /\.(md|markdown|txt|text)$/i;

export function isTextFile(file) {
    return file.type.startsWith('text/') || TEXT_FILE_PATTERN.test(file.name);
}

/**
 * 複数のテキスト断片を結合する。
 * 空の断片や、他の断片に丸ごと含まれる重複は取り除く。
 */
export function joinTextParts(parts) {
    const candidates = parts.filter(part => part && part.trim());
    const unique = candidates.filter((part, index) =>
        candidates.findIndex(other => other === part) === index &&
        !candidates.some(other => other !== part && other.includes(part))
    );
    return unique.join('\n\n');
}

export class ClipboardManager {
    constructor(editor, notificationManager, historyManager, updateStats, clipboardHistoryManager) {
        this.editor = editor;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
        this.clipboardHistoryManager = clipboardHistoryManager;
    }

    /**
     * クリップボードのテキストをすべて読み取る。
     * 共有シート経由のコピー（例: Obsidian Web Clipper）では
     * 「共有メッセージ」と「本文」が別アイテムで入るため、readText() だけだと
     * 先頭のアイテムしか取れない。read() で全アイテムを読んで結合する。
     */
    async readText() {
        if (navigator.clipboard.read) {
            try {
                const items = await navigator.clipboard.read();
                const parts = [];
                for (const item of items) {
                    if (item.types.includes('text/plain')) {
                        const blob = await item.getType('text/plain');
                        parts.push(await blob.text());
                    }
                }
                const text = joinTextParts(parts);
                if (text) return text;
            } catch (err) {
                console.log('clipboard.read() failed, falling back to readText():', err);
            }
        }
        return navigator.clipboard.readText();
    }

    /**
     * エディタへの直接ペーストで、テキスト系ファイルが含まれていれば
     * 標準の貼り付けを止めて、テキストとファイルの内容を結合して挿入する。
     * 含まれていなければ null を返し、ブラウザ標準の貼り付けに任せる。
     */
    async readPasteEvent(event) {
        const data = event.clipboardData;
        if (!data) return null;

        const textFiles = Array.from(data.files || []).filter(isTextFile);
        if (textFiles.length === 0) return null;

        // await より前に止めないと標準の貼り付けが走ってしまう
        event.preventDefault();
        const plain = data.getData('text/plain');
        const fileTexts = await Promise.all(textFiles.map(file => file.text()));
        return joinTextParts([plain, ...fileTexts]);
    }

    insertAtCursor(text) {
        const { selectionStart, selectionEnd } = this.editor;
        this.editor.setRangeText(text, selectionStart, selectionEnd, 'end');
    }

    async paste() {
        try {
            const text = await this.readText();
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
