const DEFAULT_OPTIONS = {
    // 直前の履歴を「編集途中のスナップショット」とみなす時間（ミリ秒）
    mergeWindowMs: 30000,
    // 直前の履歴と同一視する類似度のしきい値（0〜1）
    mergeSimilarity: 0.8,
    // 短いテキストは別物として扱うため、まとめる対象の最小文字数
    mergeMinLength: 40
};

export class ClipboardHistoryManager {
    constructor(storageManager, storageKey, maxItems, options = {}) {
        this.storageManager = storageManager;
        this.storageKey = storageKey;
        this.maxItems = maxItems;
        this.options = { ...DEFAULT_OPTIONS, ...options };
        this.items = this.load();
    }

    load() {
        const raw = this.storageManager.get(this.storageKey);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Failed to parse clipboard history:', e);
            return [];
        }
    }

    save() {
        this.storageManager.set(this.storageKey, JSON.stringify(this.items));
    }

    add(text) {
        if (!text || !text.trim()) return;

        const now = Date.now();

        // 同一テキストは重複させず、先頭へ移動して時刻だけ更新する
        const duplicateIndex = this.items.findIndex(item => item.text === text);
        if (duplicateIndex !== -1) {
            const [duplicate] = this.items.splice(duplicateIndex, 1);
            duplicate.timestamp = now;
            this.items.unshift(duplicate);
            this.save();
            return;
        }

        // 直前の履歴の編集途中とみなせる場合は、新規追加せず上書きする
        const latest = this.items[0];
        if (latest && this.isRevisionOf(latest, text, now)) {
            latest.text = text;
            latest.timestamp = now;
            this.save();
            return;
        }

        this.items.unshift({ text, timestamp: now });
        if (this.items.length > this.maxItems) {
            this.items.length = this.maxItems;
        }
        this.save();
    }

    isRevisionOf(latest, text, now) {
        const { mergeWindowMs, mergeSimilarity, mergeMinLength } = this.options;

        if (now - latest.timestamp > mergeWindowMs) return false;

        const longerLength = Math.max(latest.text.length, text.length);
        if (longerLength < mergeMinLength) return false;

        return similarityRatio(latest.text, text) >= mergeSimilarity;
    }

    getAll() {
        return this.items;
    }

    remove(index) {
        this.items.splice(index, 1);
        this.save();
    }

    clear() {
        this.items = [];
        this.save();
    }
}

/**
 * 先頭と末尾の一致文字数から類似度を求める。
 * 文中の加筆・修正を拾えるよう前方一致だけでなく後方一致も見る。
 */
function similarityRatio(a, b) {
    const shorterLength = Math.min(a.length, b.length);
    const longerLength = Math.max(a.length, b.length);
    if (longerLength === 0) return 1;

    let prefix = 0;
    while (prefix < shorterLength && a[prefix] === b[prefix]) {
        prefix++;
    }

    let suffix = 0;
    while (
        suffix < shorterLength - prefix &&
        a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
    ) {
        suffix++;
    }

    return (prefix + suffix) / longerLength;
}
