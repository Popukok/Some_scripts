// ==UserScript==
// @name         捕获刷新令牌
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  拦截 oauth20_desktop.srf?code=... 页面，弹出自定义对话框显示完整链接和 code 值（均可一键复制），控制台打印，并停止页面跳转。
// @author       Yaohuo:null_null(ID28876), updated by Codex
// @icon         https://bing.com/th?id=OMR.icon-96.png&pid=Rewards
// @match        *://login.live.com/oauth20_desktop.srf*
// @include      /^https?:\/\/login\.live\.com\/oauth20_desktop\.srf[?#].*/
// @grant        GM_setClipboard
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    const capturedUrl = location.href;
    const url = new URL(capturedUrl);
    const codeValue = url.searchParams.get('code');

    if (!codeValue || window.__oauthCodeCapturedDone) {
        return;
    }
    window.__oauthCodeCapturedDone = true;

    console.log('[CodeCapture] Captured URL:', capturedUrl);
    console.log('[CodeCapture] Captured code:', codeValue);

    const autoCopyCode = () => {
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(codeValue, 'text');
                console.log('[CodeCapture] Code copied to clipboard automatically.');
                return true;
            }
        } catch (err) {
            console.error('[CodeCapture] Auto copy failed:', err);
        }
        return false;
    };

    const stopPage = () => {
        try {
            window.stop();
        } catch (_) {
            // Ignore browser-specific stop failures.
        }
    };

    const keepCurrentUrl = () => {
        try {
            history.replaceState(null, '', capturedUrl);
        } catch (_) {
            // Some OAuth pages may lock history changes.
        }
    };

    const copyText = async (text, button) => {
        try {
            if (typeof GM_setClipboard === 'function') {
                GM_setClipboard(text, 'text');
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const input = document.createElement('textarea');
                input.value = text;
                input.style.position = 'fixed';
                input.style.left = '-9999px';
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                input.remove();
            }
            button.textContent = '已复制';
            setTimeout(() => {
                button.textContent = button.dataset.label;
            }, 1200);
        } catch (err) {
            console.error('[CodeCapture] Copy failed:', err);
            alert('复制失败，请手动复制。');
        }
    };

    const autoCopyOk = autoCopyCode();

    const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OAuth Code Captured</title>
<style>
    * {
        box-sizing: border-box;
    }
    html,
    body {
        min-height: 100%;
        margin: 0;
    }
    body {
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f3f6fb;
        color: #172033;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
        width: min(760px, 100%);
        padding: 24px;
        border: 1px solid #d8e0ef;
        border-radius: 8px;
        background: #fff;
        box-shadow: 0 18px 48px rgba(23, 32, 51, 0.14);
    }
    h1 {
        margin: 0 0 18px;
        font-size: 22px;
        line-height: 1.25;
    }
    .field {
        margin-top: 16px;
    }
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
    input {
        width: 100%;
        min-height: 40px;
        padding: 8px 10px;
        border: 1px solid #b9c3d5;
        border-radius: 6px;
        background: #f8fafc;
        color: #182235;
        font: 13px ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
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
    button:hover {
        background: #0c5ca3;
    }
    p {
        margin: 18px 0 0;
        color: #536174;
        font-size: 13px;
    }
    @media (max-width: 560px) {
        main {
            padding: 18px;
        }
        .row {
            grid-template-columns: 1fr;
        }
    }
</style>
</head>
<body>
<main>
    <h1>已捕获 Microsoft OAuth code</h1>
    <div class="field">
        <label for="full-url">完整链接</label>
        <div class="row">
            <input id="full-url" readonly value="${escapeHtml(capturedUrl)}">
            <button id="copy-full" data-label="复制链接">复制链接</button>
        </div>
    </div>
    <div class="field">
        <label for="code-value">code</label>
        <div class="row">
            <input id="code-value" readonly value="${escapeHtml(codeValue)}">
            <button id="copy-code" data-label="复制 code">复制 code</button>
        </div>
    </div>
    <p>原 OAuth 页面已被替换，页面脚本和 3 秒跳转不会继续执行。</p>
    <p>${autoCopyOk ? 'code 已自动复制到剪贴板。' : '自动复制失败，请点击按钮手动复制 code。'}</p>
</main>
</body>
</html>`;

    stopPage();
    keepCurrentUrl();

    document.open();
    document.write(html);
    document.close();

    stopPage();
    keepCurrentUrl();

    document.getElementById('copy-full')?.addEventListener('click', (event) => {
        copyText(capturedUrl, event.currentTarget);
    });
    document.getElementById('copy-code')?.addEventListener('click', (event) => {
        copyText(codeValue, event.currentTarget);
    });

    setInterval(() => {
        stopPage();
        if (location.href !== capturedUrl) {
            keepCurrentUrl();
        }
    }, 250);

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (char) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[char]));
    }
})();
