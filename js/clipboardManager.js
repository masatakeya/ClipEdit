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

/**
 * iOS / iPadOS の WebKit は、paste イベントの clipboardData に先頭アイテムの
 * テキストしか渡さない。そのため直接ペーストでも clipboard.read() で全アイテムを読む。
 * それ以外の環境では read() が権限確認を出すことがあるため、標準の貼り付けに任せる。
 */
function shouldReadAllItemsOnPaste() {
    if (!navigator.clipboard || !navigator.clipboard.read) return false;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOS || isIPadOS;
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
        const text = joinTextParts(await this.readAllTextItems());
        if (text) return text;
        return navigator.clipboard.readText();
    }

    /**
     * clipboard.read() で全アイテムの text/plain を読む。
     * 使えない・失敗した場合は空配列を返す。
     */
    async readAllTextItems() {
        if (!navigator.clipboard || !navigator.clipboard.read) return [];
        try {
            const items = await navigator.clipboard.read();
            const parts = [];
            for (const item of items) {
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    parts.push(await blob.text());
                }
            }
            return parts;
        } catch (err) {
            console.log('clipboard.read() failed:', err);
            return [];
        }
    }

    /**
     * エディタへの直接ペーストで、標準の貼り付けでは取りこぼす内容があれば
     * 標準の貼り付けを止めて、すべてのテキストを結合して返す。
     * - テキスト系ファイルが含まれる場合: テキストとファイルの中身を結合
     * - iOS / iPadOS の場合: clipboard.read() で読んだ全アイテムも結合
     * どちらにも当たらなければ null を返し、ブラウザ標準の貼り付けに任せる。
     */
    async readPasteEvent(event) {
        const data = event.clipboardData;
        if (!data) return null;

        const textFiles = Array.from(data.files || []).filter(isTextFile);
        const readAllItems = shouldReadAllItemsOnPaste();
        if (textFiles.length === 0 && !readAllItems) return null;

        // await より前に止めないと標準の貼り付けが走ってしまう
        event.preventDefault();
        const plain = data.getData('text/plain');
        const fileTexts = await Promise.all(textFiles.map(file => file.text()));
        const itemTexts = readAllItems ? await this.readAllTextItems() : [];
        // read() に失敗しても plain は残るので、少なくとも標準と同じ内容は入る
        return joinTextParts([plain, ...fileTexts, ...itemTexts]);
    }

    insertAtCursor(text, start = this.editor.selectionStart, end = this.editor.selectionEnd) {
        this.editor.setRangeText(text, start, end, 'end');
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
