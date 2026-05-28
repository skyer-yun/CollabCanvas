/**
 * CollabCanvas — Background Service Worker (Manifest V3)
 * 图标点击注入 + 下载代理
 */

console.log('[CollabCanvas BG] Service Worker loaded');

// 图标点击 → 注入 content.js
chrome.action.onClicked.addListener(function(tab) {
  console.log('[CollabCanvas BG] Icon clicked, tab:', tab.url);
  if (!tab.id) return;

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['content.js']
  }).then(function() {
    console.log('[CollabCanvas BG] content.js injected successfully');
  }).catch(function(err) {
    console.error('[CollabCanvas BG] Injection failed:', err);
  });
});

// 下载代理：content script 通过 sendMessage 请求下载
chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
  if (msg.type === 'download') {
    chrome.downloads.download({
      url: msg.url,
      filename: msg.filename || 'collabcanvas-export.html',
      saveAs: msg.saveAs || false
    }, function(downloadId) {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, downloadId: downloadId });
      }
    });
    return true; // async response
  }

  // 代理 fetch（用于跨域请求）
  if (msg.type === 'proxy-fetch') {
    fetch(msg.url, msg.options || {})
      .then(function(r) { return r.text(); })
      .then(function(text) { sendResponse({ success: true, data: text }); })
      .catch(function(err) { sendResponse({ success: false, error: err.message }); });
    return true;
  }

  // html2canvas URL resolver
  if (msg.type === 'get-url') {
    sendResponse({ url: chrome.runtime.getURL(msg.path) });
    return false;
  }
});
