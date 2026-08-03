export class ClipboardHistoryManager {
    constructor(storageManager, storageKey, maxItems) {
        this.storageManager = storageManager;
        this.storageKey = storageKey;
        this.maxItems = maxItems;
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
        if (this.items.length > 0 && this.items[0].text === text) return;

        this.items.unshift({ text, timestamp: Date.now() });
        if (this.items.length > this.maxItems) {
            this.items.length = this.maxItems;
        }
        this.save();
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
