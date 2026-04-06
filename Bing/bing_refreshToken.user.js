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

    const currentUrl = window.location.href;
    const codeMatch = currentUrl.match(/[?&]code=([^&]+)/);

    if (codeMatch) {
        const codeValue = decodeURIComponent(codeMatch[1]);

        // 控制台打印
        console.log('[CodeCapture] 完整链接:', currentUrl);
        console.log('[CodeCapture] code 值:', codeValue);

        // 停止页面加载（阻止跳转到 ?removed=true）
        if (typeof window.stop === 'function') {
            window.stop();
            console.log('[CodeCapture] 已停止页面加载');
        }

        // 等待 DOM 就绪后创建自定义对话框（避免因 stop() 导致的空白）
        const appendDialog = () => {
            // 如果已存在则不再添加
            if (document.getElementById('capture-dialog')) return;

            // 添加样式
            GM_addStyle(`
                #capture-dialog {
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 500px;
                    max-width: 90%;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    z-index: 10001;
                    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
                    padding: 20px;
                    border: 1px solid #ddd;
                }
                #capture-dialog h3 {
                    margin-top: 0;
                    color: #d32f2f;
                }
                .capture-field {
                    margin-bottom: 20px;
                }
                .capture-field label {
                    display: block;
                    font-weight: 600;
                    margin-bottom: 6px;
                    color: #333;
                }
                .capture-input-group {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .capture-input-group input {
                    flex: 1;
                    padding: 8px 12px;
                    border: 1px solid #ccc;
                    border-radius: 6px;
                    font-family: monospace;
                    font-size: 12px;
                    background: #f5f5f5;
                }
                .capture-input-group button {
                    padding: 6px 12px;
                    background: #1976d2;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                }
                .capture-input-group button:hover {
                    background: #1565c0;
                }
                .close-btn {
                    margin-top: 15px;
                    text-align: right;
                }
                .close-btn button {
                    padding: 6px 16px;
                    background: #666;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                }
                .close-btn button:hover {
                    background: #555;
                }
                #dialog-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.5);
                    z-index: 10000;
                }
            `);

            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.id = 'dialog-overlay';
            document.documentElement.appendChild(overlay);

            // 创建对话框
            const dialog = document.createElement('div');
            dialog.id = 'capture-dialog';
            dialog.innerHTML = `
                <h3>🔒 已拦截包含 code 的页面</h3>
                <div class="capture-field">
                    <label>完整链接：</label>
                    <div class="capture-input-group">
                        <input type="text" id="full-url-input" readonly value="${escapeHtml(currentUrl)}">
                        <button id="copy-full-url">复制</button>
                    </div>
                </div>
                <div class="capture-field">
                    <label>code 值：</label>
                    <div class="capture-input-group">
                        <input type="text" id="code-value-input" readonly value="${escapeHtml(codeValue)}">
                        <button id="copy-code">复制</button>
                    </div>
                </div>
                <div class="close-btn">
                    <button id="close-dialog">关闭</button>
                </div>
            `;
            document.documentElement.appendChild(dialog);

            // 复制功能
            document.getElementById('copy-full-url')?.addEventListener('click', () => {
                const input = document.getElementById('full-url-input');
                input.select();
                document.execCommand('copy');
                alert('完整链接已复制');
            });
            document.getElementById('copy-code')?.addEventListener('click', () => {
                const input = document.getElementById('code-value-input');
                input.select();
                document.execCommand('copy');
                alert('code 值已复制');
            });
            document.getElementById('close-dialog')?.addEventListener('click', () => {
                dialog.remove();
                overlay.remove();
            });
        };

        // 如果 DOM 已存在则立即添加，否则等待 DOMContentLoaded
        if (document.documentElement && document.body) {
            appendDialog();
        } else {
            document.addEventListener('DOMContentLoaded', appendDialog);
            // 如果 DOMContentLoaded 太晚，尝试直接添加到 documentElement
            if (document.documentElement && !document.body) {
                // 对于极早期情况，手动创建 body 元素
                const body = document.createElement('body');
                document.documentElement.appendChild(body);
                appendDialog();
            }
        }
    }

    // 简单的防 XSS 辅助函数
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
})();
