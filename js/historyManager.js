import { CONSTANTS } from './constants.js';

export class HistoryManager {
    constructor(editor, undoBtn, redoBtn) {
        this.editor = editor;
        this.undoBtn = undoBtn;
        this.redoBtn = redoBtn;
        this.undoHistory = [];
        this.redoHistory = [];
        this.isUndoing = false;
        this.isRedoing = false;
    }
    
    updateButtonState() {
        this.undoBtn.disabled = this.undoHistory.length <= 1;
        this.redoBtn.disabled = this.redoHistory.length === 0;
    }
    
    record(force = false) {
        if (this.isUndoing || this.isRedoing) return;
        const currentText = this.editor.value;
        const lastHistory = this.undoHistory[this.undoHistory.length - 1];

        if (force || lastHistory !== currentText) {
            this.undoHistory.push(currentText);
            if (this.undoHistory.length > CONSTANTS.MAX_HISTORY + 1) {
                this.undoHistory.shift();
            }
            this.redoHistory = [];
            this.updateButtonState();
        }
    }
    
    undo() {
        if (this.undoHistory.length > 1) {
            this.isUndoing = true;
            this.redoHistory.push(this.undoHistory.pop());
            this.editor.value = this.undoHistory[this.undoHistory.length - 1];
            this.updateButtonState();
            this.isUndoing = false;
            return true;
        }
        return false;
    }
    
    redo() {
        if (this.redoHistory.length > 0) {
            this.isRedoing = true;
            const nextState = this.redoHistory.pop();
            this.undoHistory.push(nextState);
            this.editor.value = nextState;
            this.updateButtonState();
            this.isRedoing = false;
            return true;
        }
        return false;
    }
    
    init() {
        this.undoHistory.push(this.editor.value);
        this.updateButtonState();
    }
}