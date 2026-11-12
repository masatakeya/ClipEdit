// 定型文の保存・取得を担当する（クリップボード履歴とは別管理）
export class TemplateManager {
    constructor(storageManager, storageKey) {
        this.storageManager = storageManager;
        this.storageKey = storageKey;
        this.items = this.load();
    }

    load() {
        const raw = this.storageManager.get(this.storageKey);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.text === 'string') : [];
        } catch (e) {
            console.error('Failed to parse templates:', e);
            return [];
        }
    }

    save() {
        return this.storageManager.set(this.storageKey, JSON.stringify(this.items));
    }

    // 追加できたら true、同じ定型文が既にあれば false を返す
    add(text) {
        if (!text || !text.trim()) return false;
        if (this.items.some(item => item.text === text)) return false;
        this.items.push({ text, createdAt: Date.now() });
        this.save();
        return true;
    }

    getAll() {
        return this.items;
    }

    remove(index) {
        this.items.splice(index, 1);
        this.save();
    }
}
