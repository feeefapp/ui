export function stageRatio(_model, options) {
    const value = options.aspectRatio ?? options.size ?? '1:1';
    const parts = value.split(/[:x]/).map(Number);
    return parts.length === 2 && parts[0] > 0 && parts[1] > 0 ? parts[0] / parts[1] : 1;
}
export function elapsed(from, now) {
    const seconds = Math.max(0, Math.round((now - Date.parse(from)) / 1000));
    return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}
export function takeErrorText(take, t, fallback) {
    const key = take.errorCode ? `lab.board.err_${take.errorCode}` : null;
    const coded = key ? t(key) : null;
    return coded && coded !== key ? coded : take.error || fallback;
}
//# sourceMappingURL=board-utils.js.map