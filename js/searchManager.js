import { escapeRegExp, unescapeString } from './utils.js';

export class SearchManager {
    constructor(editor, searchPanel, searchInput, replaceInput, caseSensitiveCheckbox, regexCheckbox, notificationManager, historyManager, updateStats) {
        this.editor = editor;
        this.searchPanel = searchPanel;
        this.searchInput = searchInput;
        this.replaceInput = replaceInput;
        this.caseSensitiveCheckbox = caseSensitiveCheckbox;
        this.regexCheckbox = regexCheckbox;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
    }
    
    show() {
        this.searchPanel.style.display = 'flex';
    }
    
    hide() {
        this.searchPanel.style.display = 'none';
    }
    
    find(backward = false, silent = false) {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) return false;

        const text = this.editor.value;
        const isCaseSensitive = this.caseSensitiveCheckbox.checked;
        const useRegex = this.regexCheckbox.checked;

        const currentPos = backward ? this.editor.selectionStart : this.editor.selectionEnd;

        if (useRegex) {
            // 正規表現モード
            try {
                const flags = isCaseSensitive ? 'g' : 'gi';
                const regex = new RegExp(searchTerm, flags);
                const matches = [];
                let match;

                while ((match = regex.exec(text)) !== null) {
                    matches.push({ index: match.index, length: match[0].length });
                }

                if (matches.length === 0) {
                    if (!silent) {
                        this.notificationManager.show('見つかりませんでした');
                    }
                    return false;
                }

                // 現在位置に基づいて次/前のマッチを見つける
                let targetMatch;
                if (backward) {
                    // 現在位置より前のマッチを探す
                    const beforeMatches = matches.filter(m => m.index < currentPos);
                    targetMatch = beforeMatches.length > 0 ? beforeMatches[beforeMatches.length - 1] : matches[matches.length - 1];
                } else {
                    // 現在位置より後のマッチを探す
                    const afterMatches = matches.filter(m => m.index >= currentPos);
                    targetMatch = afterMatches.length > 0 ? afterMatches[0] : matches[0];
                }

                this.editor.focus();
                this.editor.setSelectionRange(targetMatch.index, targetMatch.index + targetMatch.length);
                return true;
            } catch (error) {
                this.notificationManager.show('正規表現が無効です');
                return false;
            }
        } else {
            // 通常の検索モード
            let searchText = text;
            let term = searchTerm;

            if (!isCaseSensitive) {
                searchText = text.toLowerCase();
                term = searchTerm.toLowerCase();
            }

            let findPos;
            if (backward) {
                findPos = searchText.lastIndexOf(term, currentPos - 1);
            } else {
                findPos = searchText.indexOf(term, currentPos);
            }

            if (findPos !== -1) {
                this.editor.focus();
                this.editor.setSelectionRange(findPos, findPos + searchTerm.length);
                return true;
            } else {
                if (!silent) {
                    this.notificationManager.show('見つかりませんでした');
                }
                return false;
            }
        }
    }
    
    replace() {
        const searchTerm = this.searchInput.value;
        let replaceTerm = this.replaceInput.value;
        if (!searchTerm) return;

        // エスケープシーケンスを変換（\n → 改行など）
        replaceTerm = unescapeString(replaceTerm);

        const useRegex = this.regexCheckbox.checked;
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const selectedText = this.editor.value.substring(start, end);

        // 選択範囲がない場合は、まず検索を実行
        if (start === end) {
            this.find();
            return;
        }

        let shouldReplace = false;

        if (useRegex) {
            // 正規表現モード
            try {
                const flags = this.caseSensitiveCheckbox.checked ? '' : 'i';
                const regex = new RegExp('^(?:' + searchTerm + ')$', flags);

                // 選択範囲全体が検索パターンと完全一致するか確認
                if (regex.test(selectedText)) {
                    shouldReplace = true;
                }
            } catch (error) {
                this.notificationManager.show('正規表現が無効です');
                return;
            }
        } else {
            // 通常モード
            const compareTerm = this.caseSensitiveCheckbox.checked ? searchTerm : searchTerm.toLowerCase();
            const compareSelected = this.caseSensitiveCheckbox.checked ? selectedText : selectedText.toLowerCase();

            if (compareSelected === compareTerm) {
                shouldReplace = true;
            }
        }

        if (shouldReplace) {
            // 正規表現の場合、置換文字列でキャプチャグループを使えるようにする
            if (useRegex) {
                try {
                    const flags = this.caseSensitiveCheckbox.checked ? '' : 'i';
                    const regex = new RegExp(searchTerm, flags);
                    const newText = selectedText.replace(regex, replaceTerm);
                    this.editor.setRangeText(newText, start, end, 'end');
                } catch (error) {
                    this.notificationManager.show('正規表現が無効です');
                    return;
                }
            } else {
                this.editor.setRangeText(replaceTerm, start, end, 'end');
            }
            this.updateStats();
            this.historyManager.record(true);
        }

        // 次の検索対象を探す（見つからなくても通知は表示しない）
        this.find(false, true);
    }
    
    replaceAll() {
        const searchTerm = this.searchInput.value;
        let replaceTerm = this.replaceInput.value;
        if (!searchTerm) return;

        // エスケープシーケンスを変換（\n → 改行など）
        replaceTerm = unescapeString(replaceTerm);

        const useRegex = this.regexCheckbox.checked;
        const originalText = this.editor.value;
        let newText;
        let regex;

        try {
            const flags = this.caseSensitiveCheckbox.checked ? 'g' : 'gi';

            if (useRegex) {
                // 正規表現モード: ユーザーが入力したパターンをそのまま使用
                regex = new RegExp(searchTerm, flags);
            } else {
                // 通常モード: 特殊文字をエスケープ
                regex = new RegExp(escapeRegExp(searchTerm), flags);
            }

            newText = originalText.replace(regex, replaceTerm);

            if (originalText !== newText) {
                const replacements = (originalText.match(regex) || []).length;
                this.editor.value = newText;
                this.updateStats();
                this.historyManager.record(true);
                this.notificationManager.show(`${replacements}件を置換しました`);
            } else {
                this.notificationManager.show('見つかりませんでした');
            }
        } catch (error) {
            this.notificationManager.show('正規表現が無効です');
        }
    }
}