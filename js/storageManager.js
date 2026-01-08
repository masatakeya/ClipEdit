export class StorageManager {
    set(key, value) {
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            return false;
        }
    }

    get(key) {
        try {
            return localStorage.getItem(key);
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
            return null;
        }
    }

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Failed to remove from localStorage:', e);
            return false;
        }
    }
}
