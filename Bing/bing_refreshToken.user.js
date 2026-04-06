// ==UserScript==
// @name         捕获刷新令牌
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  拦截 oauth20_desktop.srf?code=... 页面，弹出自定义对话框显示完整链接和 code 值（均可一键复制），控制台打印，并停止页面跳转。
// @author       Yaohuo:null_null(ID28876)
// @icon         https://bing.com/th?id=OMR.icon-96.png&amp;pid=Rewards
// @match        *://login.live.com/oauth20_desktop.srf?*
// @grant        GM_addStyle
// @run-at       document-start
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    if (window.__codeCapturedDone) return;
    window.__codeCapturedDone = true;

    const originalUrl = window.location.href;
    const codeMatch = originalUrl.match(/[?&]code=([^&]+)/);
    if (!codeMatch) return;

    const codeValue = decodeURIComponent(codeMatch[1]);
    console.log('[CodeCapture] 原始链接:', originalUrl);
    console.log('[CodeCapture] code 值:', codeValue);

    // 立即停止页面加载
    if (typeof window.stop === 'function') {
        window.stop();
        console.log('[CodeCapture] 已调用 window.stop()');
    }

    // 清除所有可能触发跳转的内容
    const cleanDocument = () => {
        if (document.head) document.head.innerHTML = '';
        if (document.body) {
            const dialogContainer = document.getElementById('capture-dialog-container');
            document.body.innerHTML = '';
            if (dialogContainer) document.body.appendChild(dialogContainer);
        }
        // 移除所有 meta refresh
        const metas = document.getElementsByTagName('meta');
        for (let i = metas.length - 1; i >= 0; i--) {
            const meta = metas[i];
            if (meta.httpEquiv && meta.httpEquiv.toLowerCase() === 'refresh') {
                meta.remove();
            }
        }
        // 清除所有定时器
        const highest = setTimeout(() => {}, 0);
        for (let i = 0; i <= highest; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
    };

    // 创建自定义对话框
    const showDialog = () => {
        GM_addStyle(`
            #dialog-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #capture-dialog {
                background: #fff;
                width: 500px;
                max-width: 90%;
                border-radius: 12px;
                padding: 24px;
                font-family: system-ui, sans-serif;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            }
            .capture-field {
                margin-bottom: 20px;
            }
            .capture-field label {
                font-weight: 600;
                display: block;
                margin-bottom: 6px;
            }
            .input-group {
                display: flex;
                gap: 8px;
            }
            .input-group input {
                flex: 1;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 6px;
                background: #f5f5f5;
                font-family: monospace;
                font-size: 12px;
            }
            .input-group button {
                padding: 6px 12px;
                background: #1976d2;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            .close-btn {
                text-align: right;
                margin-top: 16px;
            }
            .close-btn button {
                padding: 6px 16px;
                background: #666;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
        `);

        const overlay = document.createElement('div');
        overlay.id = 'dialog-overlay';
        const dialog = document.createElement('div');
        dialog.id = 'capture-dialog';
        dialog.innerHTML = `
            <h3>🔒 已拦截 OAuth code 页面</h3>
            <div class="capture-field">
                <label>完整链接：</label>
                <div class="input-group">
                    <input type="text" id="full-url" readonly value="${escapeHtml(originalUrl)}">
                    <button id="copy-full">复制</button>
                </div>
            </div>
            <div class="capture-field">
                <label>code 值：</label>
                <div class="input-group">
                    <input type="text" id="code-value" readonly value="${escapeHtml(codeValue)}">
                    <button id="copy-code">复制</button>
                </div>
            </div>
            <div class="close-btn">
                <button id="close-dialog">关闭</button>
            </div>
        `;
        overlay.appendChild(dialog);
        document.documentElement.appendChild(overlay);

        document.getElementById('copy-full')?.addEventListener('click', () => {
            const inp = document.getElementById('full-url');
            inp.select();
            document.execCommand('copy');
            alert('完整链接已复制');
        });
        document.getElementById('copy-code')?.addEventListener('click', () => {
            const inp = document.getElementById('code-value');
            inp.select();
            document.execCommand('copy');
            alert('code 值已复制');
        });
        document.getElementById('close-dialog')?.addEventListener('click', () => {
            overlay.remove();
        });
    };

    // URL 守卫：每 100ms 检查一次，如果 URL 变化则立即改回
    let guardInterval = null;
    const startUrlGuard = () => {
        guardInterval = setInterval(() => {
            if (window.location.href !== originalUrl) {
                console.log('[CodeCapture] 检测到 URL 变化，立即恢复:', window.location.href);
                history.replaceState(null, '', originalUrl);
                cleanDocument();
                if (!document.getElementById('dialog-overlay')) {
                    showDialog();
                }
            }
        }, 100);
    };

    // 初始化
    const init = () => {
        cleanDocument();
        showDialog();
        startUrlGuard();
        // 可选：阻止用户意外离开
        window.addEventListener('beforeunload', (e) => {
            if (window.location.href !== originalUrl) {
                e.preventDefault();
                e.returnValue = '脚本已阻止跳转，确定要离开吗？';
            }
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function escapeHtml(str) {
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
})();
