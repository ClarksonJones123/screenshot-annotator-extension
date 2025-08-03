class ScreenshotAnnotator {
  constructor() {
    this.screenshots = [];
    this.selectedScreenshot = null;
    this.memoryUsage = 0;
    
    this.init();
  }
  
  async init() {
    console.log('Initializing Screenshot Annotator...');
    await this.loadScreenshots();
    this.setupEventListeners();
    this.updateUI();
  }
  
  setupEventListeners() {
    document.getElementById('captureBtn').addEventListener('click', () => {
      this.captureScreenshot();
    });
    
    document.getElementById('annotateBtn').addEventListener('click', () => {
      this.startAnnotation();
    });
    
    document.getElementById('clearBtn').addEventListener('click', () => {
      this.clearAllScreenshots();
    });
  }
  
  async loadScreenshots() {
    try {
      const result = await chrome.storage.local.get('screenshots');
      this.screenshots = result.screenshots || [];
      console.log('Loaded screenshots:', this.screenshots.length);
      this.calculateMemoryUsage();
    } catch (error) {
      console.error('Error loading screenshots:', error);
      this.showStatus('Error loading screenshots', 'error');
    }
  }
  
  async saveScreenshots() {
    try {
      await chrome.storage.local.set({ screenshots: this.screenshots });
      console.log('Saved screenshots:', this.screenshots.length);
      this.calculateMemoryUsage();
      this.updateUI();
    } catch (error) {
      console.error('Error saving screenshots:', error);
      this.showStatus('Error saving screenshots', 'error');
    }
  }
  
  calculateMemoryUsage() {
    this.memoryUsage = 0;
    this.screenshots.forEach(screenshot => {
      if (screenshot.imageData) {
        this.memoryUsage += screenshot.imageData.length * 0.75;
      }
      screenshot.annotations?.forEach(annotation => {
        this.memoryUsage += JSON.stringify(annotation).length;
      });
    });
    console.log('Memory usage calculated:', this.formatMemorySize(this.memoryUsage));
  }
  
  formatMemorySize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  }
  
  async captureScreenshot() {
    try {
      this.showStatus('Capturing screenshot...', 'info');
      console.log('Starting screenshot capture...');
      
      // Get current tab info
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('Current tab:', tab.title, tab.url);
      
      // Capture screenshot via background script
      const response = await chrome.runtime.sendMessage({ 
        action: 'captureVisibleTab' 
      });
      
      console.log('Capture response:', response ? 'Success' : 'Failed');
      
      if (response && response.imageData) {
        // Create screenshot object
        const screenshot = {
          id: Date.now().toString(),
          imageData: response.imageData,
          originalWidth: 1920,
          originalHeight: 1080,
          displayWidth: Math.round(1920 * 0.9), // 90% sizing
          displayHeight: Math.round(1080 * 0.9),
          url: tab.url,
          title: tab.title,
          timestamp: new Date().toISOString(),
          annotations: []
        };
        
        console.log('Created screenshot object:', screenshot.id);
        
        this.screenshots.push(screenshot);
        await this.saveScreenshots();
        
        this.showStatus('Screenshot captured successfully!', 'success');
        this.selectedScreenshot = screenshot;
        
        // Enable annotation button
        document.getElementById('annotateBtn').disabled = false;
        
        console.log('Screenshot capture completed successfully');
        
      } else {
        throw new Error(response?.error || 'Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Capture error:', error);
      this.showStatus(`Failed to capture: ${error.message}`, 'error');
    }
  }
  
  async startAnnotation() {
    if (!this.selectedScreenshot) {
      this.showStatus('Please select a screenshot first', 'error');
      return;
    }
    
    try {
      console.log('Starting annotation mode for screenshot:', this.selectedScreenshot.id);
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.tabs.sendMessage(tab.id, {
        action: 'startAnnotation',
        screenshot: this.selectedScreenshot
      });
      
      this.showStatus('Annotation mode activated!', 'success');
      window.close();
      
    } catch (error) {
      console.error('Annotation error:', error);
      this.showStatus('Failed to start annotation mode', 'error');
    }
  }
  
  async clearAllScreenshots() {
    if (this.screenshots.length === 0) {
      this.showStatus('No screenshots to clear', 'info');
      return;
    }
    
    if (confirm(`Delete all ${this.screenshots.length} screenshots? This will free ${this.formatMemorySize(this.memoryUsage)} of memory.`)) {
      try {
        console.log('Clearing all screenshots...');
        this.screenshots = [];
        await this.saveScreenshots();
        this.selectedScreenshot = null;
        
        document.getElementById('annotateBtn').disabled = true;
        
        this.showStatus('All screenshots cleared!', 'success');
        console.log('Screenshots cleared successfully');
        
      } catch (error) {
        console.error('Clear error:', error);
        this.showStatus('Failed to clear screenshots', 'error');
      }
    }
  }
  
  updateUI() {
    console.log('Updating UI - Screenshots:', this.screenshots.length);
    
    // Update memory info
    document.getElementById('memoryUsage').textContent = this.formatMemorySize(this.memoryUsage);
    document.getElementById('screenshotCount').textContent = this.screenshots.length;
    
    // Update screenshots list
    const listElement = document.getElementById('screenshotsList');
    
    if (this.screenshots.length === 0) {
      listElement.innerHTML = `
        <div class="empty-state">
          No screenshots yet.<br>Click "Capture Current Page" to get started.
        </div>`;
    } else {
      let html = '';
      this.screenshots.forEach(screenshot => {
        const isSelected = this.selectedScreenshot && this.selectedScreenshot.id === screenshot.id;
        const date = new Date(screenshot.timestamp).toLocaleString();
        
        html += `
          <div class="screenshot-item ${isSelected ? 'selected' : ''}" data-id="${screenshot.id}">
            <div class="screenshot-title">${screenshot.title}</div>
            <div class="screenshot-details">
              <span>${date}</span>
              <span>${screenshot.displayWidth}×${screenshot.displayHeight}</span>
            </div>
          </div>`;
      });
      listElement.innerHTML = html;
      
      // Add click handlers
      listElement.querySelectorAll('.screenshot-item').forEach(item => {
        item.addEventListener('click', () => {
          const screenshotId = item.dataset.id;
          this.selectedScreenshot = this.screenshots.find(s => s.id === screenshotId);
          console.log('Selected screenshot:', this.selectedScreenshot?.id);
          
          // Enable annotation button
          document.getElementById('annotateBtn').disabled = false;
          
          this.updateUI(); // Refresh to show selection
        });
      });
    }
    
    console.log('UI updated successfully');
  }
  
  showStatus(message, type) {
    console.log('Status:', type, message);
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    statusEl.classList.remove('hidden');
    
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 3000);
  }
}

// Initialize when popup loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing app...');
  new ScreenshotAnnotator();
});