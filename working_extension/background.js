// Background script for Screenshot Annotator
console.log('Screenshot Annotator background script loaded');

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.action);
  
  if (message.action === 'ping') {
    console.log('Ping received');
    sendResponse({ success: true, message: 'Extension is working!' });
    return true;
  }
  
  if (message.action === 'captureVisibleTab') {
    console.log('Capturing visible tab...');
    
    chrome.tabs.captureVisibleTab(
      null,
      { format: 'png', quality: 90 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          console.error('Capture error:', chrome.runtime.lastError);
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          });
        } else {
          console.log('Screenshot captured successfully, size:', dataUrl.length);
          sendResponse({ 
            success: true, 
            imageData: dataUrl 
          });
        }
      }
    );
    return true; // Keep message channel open for async response
  }
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.screenshots) {
    const newScreenshots = changes.screenshots.newValue || [];
    console.log(`Storage updated: ${newScreenshots.length} screenshots`);
    
    // Calculate memory usage
    let totalSize = 0;
    newScreenshots.forEach(screenshot => {
      if (screenshot.imageData) {
        totalSize += screenshot.imageData.length;
      }
    });
    
    console.log(`Total memory usage: ${Math.round(totalSize / 1024)} KB`);
    
    // Warn if memory usage is high
    if (totalSize > 50 * 1024 * 1024) { // 50MB
      console.warn('High memory usage detected');
    }
  }
});

// Installation handler
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Screenshot Annotator installed:', details.reason);
});