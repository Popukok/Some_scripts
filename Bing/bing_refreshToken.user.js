// ==UserScript==
// @name         捕获 Microsoft Rewards code
// @namespace    http://tampermonkey.net/
// @version      2.1
// @description  捕获 Microsoft OAuth 回调链接和 code 值，用于配置 Microsoft Rewards 脚本令牌。
// @author       null_null
// @icon         https://bing.com/th?id=OMR.icon-96.png&pid=Rewards
// @match        *://login.live.com/oauth20_desktop.srf*
// @include      /^https?:\/\/login\.live\.com\/oauth20_desktop\.srf[?#].*/
// @grant        GM_setClipboard
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    // 读取 OAuth 回调链接，并从 query 参数中提取 code。
    const capturedUrl = location.href;
    const url = new URL(capturedUrl);
    const codeValue = url.searchParams.get('code');
    const errorValue = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');

    // 防止浏览器或脚本管理器重复执行同一页逻辑。
    if (window.__oauthRefreshTokenCapturedDone) {
        return;
    }
    window.__oauthRefreshTokenCapturedDone = true;

    const state = {
        code: codeValue || '',
        finalCode: '',
        status: '',
        error: ''
    };

    // 尽量阻止微软回调页继续跳转，保留当前含 code 的链接。
    stopPage();
    keepCurrentUrl();
    renderLoading();

    if (errorValue) {
        state.error = `${errorValue}${errorDescription ? ': ' + errorDescription : ''}`;
        renderResult();
        return;
    }

    if (!codeValue) {
        state.error = 'OAuth 回调链接中没有 code 参数。';
        renderResult();
        return;
    }

    // 这里按用户需求直接使用回调链接中的 code，不再调用 token 接口换取其他值。
    state.finalCode = codeValue;
    state.status = '已捕获 OAuth 回调 code。';
    copyToClipboard(state.finalCode);
    console.log('[TokenCapture] 回调链接:', capturedUrl);
    console.log('[TokenCapture] code 值:', state.finalCode);
    renderResult();

    setInterval(() => {
        stopPage();
        if (location.href !== capturedUrl) {
            keepCurrentUrl();
        }
    }, 250);

    function renderLoading() {
        writePage(`
            <main>
                <h1>Microsoft Rewards code 捕获</h1>
                <p class="muted">${escapeHtml(state.status || '正在读取 OAuth 回调参数...')}</p>
                <p class="muted">已捕获 code 前缀: ${escapeHtml(shortTokenPrefix(state.code))}</p>
            </main>
        `);
    }

    function renderResult() {
        const hasCode = Boolean(state.finalCode);
        const codeText = hasCode ? state.finalCode : '';
        writePage(`
            <main>
                ${hasCode ? `
                    <div class="modal-backdrop" role="presentation">
                        <section class="modal" role="dialog" aria-modal="true" aria-labelledby="result-dialog-title">
                            <h2 id="result-dialog-title">捕获结果</h2>
                            <div class="field">
                                <label for="dialog-link">链接</label>
                                <textarea id="dialog-link" readonly>${escapeHtml(capturedUrl)}</textarea>
                            </div>
                            <div class="field">
                                <label for="dialog-code">code 值</label>
                                <textarea id="dialog-code" readonly>${escapeHtml(codeText)}</textarea>
                            </div>
                            <div class="dialog-actions">
                                <button id="copy-dialog-code" data-copy="dialog-code">复制 code</button>
                                <button id="close-dialog" type="button">关闭</button>
                            </div>
                        </section>
                    </div>
                ` : `
                    <h1>OAuth code 捕获失败</h1>
                    <p class="err">${escapeHtml(state.error)}</p>
                    <div class="field">
                        <label for="code-prefix">已捕获的 OAuth code 前缀</label>
                        <textarea id="code-prefix" readonly>${escapeHtml(shortTokenPrefix(state.code))}</textarea>
                    </div>
                    <div class="field">
                        <label for="full-url">回调链接</label>
                        <textarea id="full-url" readonly>${escapeHtml(capturedUrl)}</textarea>
                    </div>
                `}
            </main>
        `);

        document.querySelectorAll('button[data-copy]').forEach((button) => {
            button.addEventListener('click', () => {
                const target = document.getElementById(button.dataset.copy);
                copyToClipboard(target ? target.value : '');
                const oldText = button.textContent;
                button.textContent = '已复制';
                setTimeout(() => {
                    button.textContent = oldText;
                }, 1200);
            });
        });

        document.getElementById('close-dialog')?.addEventListener('click', () => {
            document.querySelector('.modal-backdrop')?.remove();
        });
    }

    function writePage(content) {
        const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Microsoft Rewards code 捕获</title>
<style>
    * { box-sizing: border-box; }
    html, body { min-height: 100%; margin: 0; }
    body {
        display: grid;
        place-items: center;
        padding: 24px;
        background: #eef3f8;
        color: #172033;
        font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
    }
    main {
        width: min(820px, 100%);
        padding: 24px;
        border: 1px solid #d3deea;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 48px rgba(23, 32, 51, 0.14);
    }
    h1 {
        margin: 0 0 14px;
        font-size: 22px;
        line-height: 1.3;
    }
    .field { margin-top: 16px; }
    label {
        display: block;
        margin-bottom: 8px;
        font-weight: 700;
    }
    .row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 8px;
    }
    textarea {
        width: 100%;
        min-height: 76px;
        resize: vertical;
        padding: 10px;
        border: 1px solid #b8c6d7;
        border-radius: 6px;
        background: #f8fafc;
        color: #182235;
        font: 13px Consolas, "Liberation Mono", monospace;
        line-height: 1.45;
        word-break: break-all;
    }
    button {
        min-height: 40px;
        padding: 0 14px;
        border: 0;
        border-radius: 6px;
        background: #0f6cbd;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
    }
    button:hover { background: #0c5ca3; }
    p { margin: 14px 0 0; font-size: 13px; line-height: 1.6; }
    .muted { color: #536174; }
    .warn { color: #9a5b00; font-weight: 700; }
    .ok { color: #0f7b46; font-weight: 700; }
    .err { color: #b42318; font-weight: 700; }
    .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(15, 23, 42, 0.45);
    }
    .modal {
        width: min(760px, 100%);
        max-height: calc(100vh - 40px);
        overflow: auto;
        padding: 22px;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.35);
    }
    .modal h2 {
        margin: 0 0 12px;
        font-size: 20px;
        line-height: 1.3;
    }
    .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
    }
    @media (max-width: 560px) {
        main { padding: 18px; }
        .row { grid-template-columns: 1fr; }
    }
</style>
</head>
<body>
${content}
</body>
</html>`;

        document.open();
        document.write(html);
        document.close();
        stopPage();
        keepCurrentUrl();
    }

    function copyToClipboard(text) {
        if (!text) {
            return false;
        }
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
                return true;
            }
        } catch (err) {
            console.error('[TokenCapture] GM_setClipboard 复制失败:', err);
        }
        try {
            const input = document.createElement('textarea');
            input.value = text;
            input.style.position = 'fixed';
            input.style.left = '-9999px';
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            input.remove();
            return true;
        } catch (err) {
            console.error('[TokenCapture] 剪贴板备用复制失败:', err);
            return false;
        }
    }

    function shortTokenPrefix(value) {
        if (!value) {
            return '<empty>';
        }
        const text = String(value);
        return text.length > 36 ? `${text.slice(0, 36)}...` : text;
    }

    function stopPage() {
        try {
            window.stop();
        } catch (_) {
            // 某些浏览器可能不允许停止页面加载，忽略即可。
        }
    }

    function keepCurrentUrl() {
        try {
            history.replaceState(null, '', capturedUrl);
        } catch (_) {
            // 某些 OAuth 页面可能限制 history 修改，忽略即可。
        }
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char]));
    }
})();
