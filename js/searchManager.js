import { escapeRegExp, unescapeString } from './utils.js';

export class SearchManager {
    constructor(editor, searchPanel, searchInput, replaceInput, caseSensitiveCheckbox, regexCheckbox, notificationManager, historyManager, updateStats, selectionScopeCheckbox, selectionScopeInfo) {
        this.editor = editor;
        this.searchPanel = searchPanel;
        this.searchInput = searchInput;
        this.replaceInput = replaceInput;
        this.caseSensitiveCheckbox = caseSensitiveCheckbox;
        this.regexCheckbox = regexCheckbox;
        this.notificationManager = notificationManager;
        this.historyManager = historyManager;
        this.updateStats = updateStats;
        this.selectionScopeCheckbox = selectionScopeCheckbox;
        this.selectionScopeInfo = selectionScopeInfo;

        // パネルを開いた時点の選択範囲（置換範囲として使う）
        this.scope = null;
    }

    show() {
        // パネルを開いた時点で範囲選択されていれば、その範囲を置換対象として記録する
        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        this.scope = start !== end ? { start, end } : null;
        this.updateScopeUI();
        this.searchPanel.style.display = 'flex';
    }

    hide() {
        this.searchPanel.style.display = 'none';
    }

    updateScopeUI() {
        if (!this.selectionScopeCheckbox) return;
        const hasScope = this.scope !== null;
        this.selectionScopeCheckbox.disabled = !hasScope;
        this.selectionScopeCheckbox.checked = hasScope;
        if (this.selectionScopeInfo) {
            this.selectionScopeInfo.textContent = hasScope
                ? `（${this.scope.end - this.scope.start}文字）`
                : '（範囲選択してから開くと使えます）';
        }
    }

    // 現在有効な検索・置換範囲を返す
    getRange() {
        const useScope = this.scope && this.selectionScopeCheckbox && this.selectionScopeCheckbox.checked;
        if (useScope) {
            return { start: this.scope.start, end: this.scope.end, scoped: true };
        }
        return { start: 0, end: this.editor.value.length, scoped: false };
    }

    // 範囲内のテキスト変化に合わせて記録した範囲を伸縮させる
    adjustScope(delta) {
        if (this.scope && this.selectionScopeCheckbox && this.selectionScopeCheckbox.checked) {
            this.scope.end += delta;
            if (this.selectionScopeInfo) {
                this.selectionScopeInfo.textContent = `（${this.scope.end - this.scope.start}文字）`;
            }
        }
    }

    buildRegex(searchTerm, flags) {
        const pattern = this.regexCheckbox.checked ? searchTerm : escapeRegExp(searchTerm);
        return new RegExp(pattern, flags);
    }

    // 範囲内のすべてのマッチ位置（エディタ全体での位置）を返す
    collectMatches(searchTerm, range) {
        const flags = this.caseSensitiveCheckbox.checked ? 'g' : 'gi';
        const regex = this.buildRegex(searchTerm, flags);
        const target = this.editor.value.substring(range.start, range.end);
        const matches = [];
        let match;
        while ((match = regex.exec(target)) !== null) {
            if (match[0].length === 0) {
                // 空マッチで無限ループしないように進める
                regex.lastIndex++;
                continue;
            }
            matches.push({ index: range.start + match.index, length: match[0].length });
        }
        return matches;
    }

    find(backward = false, silent = false) {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) return false;

        const range = this.getRange();
        let matches;
        try {
            matches = this.collectMatches(searchTerm, range);
        } catch (error) {
            this.notificationManager.show('正規表現が無効です');
            return false;
        }

        if (matches.length === 0) {
            if (!silent) {
                this.notificationManager.show(range.scoped ? '選択範囲内に見つかりませんでした' : '見つかりませんでした');
            }
            return false;
        }

        const currentPos = backward ? this.editor.selectionStart : this.editor.selectionEnd;

        let targetMatch;
        if (backward) {
            const beforeMatches = matches.filter(m => m.index < currentPos);
            targetMatch = beforeMatches.length > 0 ? beforeMatches[beforeMatches.length - 1] : matches[matches.length - 1];
        } else {
            const afterMatches = matches.filter(m => m.index >= currentPos);
            targetMatch = afterMatches.length > 0 ? afterMatches[0] : matches[0];
        }

        this.editor.focus();
        this.editor.setSelectionRange(targetMatch.index, targetMatch.index + targetMatch.length);
        return true;
    }

    replace() {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) return;

        // エスケープシーケンスを変換（\n → 改行など）
        const replaceTerm = unescapeString(this.replaceInput.value);

        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const range = this.getRange();

        // 現在の選択が検索結果（範囲内のマッチ）でなければ、まず検索する
        let isMatch = false;
        if (start !== end && start >= range.start && end <= range.end) {
            const flags = this.caseSensitiveCheckbox.checked ? '' : 'i';
            try {
                const pattern = this.regexCheckbox.checked ? searchTerm : escapeRegExp(searchTerm);
                isMatch = new RegExp('^(?:' + pattern + ')$', flags).test(this.editor.value.substring(start, end));
            } catch (error) {
                this.notificationManager.show('正規表現が無効です');
                return;
            }
        }

        if (!isMatch) {
            this.find();
            return;
        }

        const selectedText = this.editor.value.substring(start, end);
        let newText;
        if (this.regexCheckbox.checked) {
            // 正規表現の場合、置換文字列でキャプチャグループを使えるようにする
            const flags = this.caseSensitiveCheckbox.checked ? '' : 'i';
            newText = selectedText.replace(new RegExp(searchTerm, flags), replaceTerm);
        } else {
            newText = replaceTerm;
        }

        this.editor.setRangeText(newText, start, end, 'end');
        this.adjustScope(newText.length - selectedText.length);
        this.updateStats();
        this.historyManager.record(true);

        // 次の検索対象を探す（見つからなくても通知は表示しない）
        this.find(false, true);
    }

    replaceAll() {
        const searchTerm = this.searchInput.value;
        if (!searchTerm) return;

        // エスケープシーケンスを変換（\n → 改行など）
        const replaceTerm = unescapeString(this.replaceInput.value);

        const range = this.getRange();
        const originalText = this.editor.value;
        const target = originalText.substring(range.start, range.end);

        try {
            const flags = this.caseSensitiveCheckbox.checked ? 'g' : 'gi';
            const regex = this.buildRegex(searchTerm, flags);
            const replaced = target.replace(regex, replaceTerm);

            if (replaced === target) {
                this.notificationManager.show(range.scoped ? '選択範囲内に見つかりませんでした' : '見つかりませんでした');
                return;
            }

            const replacements = (target.match(regex) || []).length;
            this.editor.value = originalText.substring(0, range.start) + replaced + originalText.substring(range.end);
            this.adjustScope(replaced.length - target.length);

            if (range.scoped) {
                // 置換後の範囲を選択状態にして、どこが変わったか分かるようにする
                this.editor.setSelectionRange(this.scope.start, this.scope.end);
            }

            this.updateStats();
            this.historyManager.record(true);
            this.notificationManager.show(range.scoped
                ? `選択範囲内で${replacements}件を置換しました`
                : `${replacements}件を置換しました`);
        } catch (error) {
            this.notificationManager.show('正規表現が無効です');
        }
    }
}
