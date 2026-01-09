export const getElement = (id) => document.getElementById(id);

export const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * エスケープシーケンスを実際の文字に変換
 * \n → 改行, \t → タブ, \r → キャリッジリターン, \\ → バックスラッシュ
 */
export const unescapeString = (string) => {
    return string
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
};