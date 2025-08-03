// Content script for annotation overlay
console.log('Screenshot Annotator content script loaded');

class AnnotationOverlay {
  constructor() {
    this.isActive = false;
    this.screenshot = null;
    this.annotations = [];
    this.overlay = null;
    this.isAddingAnnotation = false;
    this.pendingAnnotation = null;
    
    this.setupMessageListener();
  }
  
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('Content script received message:', message.action);
      
      if (message.action === 'startAnnotation') {
        this.startAnnotationMode(message.screenshot);
        sendResponse({ success: true });
      }
      return true;
    });
  }
  
  startAnnotationMode(screenshot) {
    console.log('Starting annotation mode for screenshot:', screenshot.id);
    this.screenshot = screenshot;
    this.annotations = screenshot.annotations || [];
    this.isActive = true;
    
    this.createOverlay();
  }
  
  createOverlay() {
    // Remove existing overlay
    if (this.overlay) {
      this.overlay.remove();
    }
    
    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.8);
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Create controls
    const controls = document.createElement('div');
    controls.style.cssText = `
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      align-items: center;
      background: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    `;
    
    // Text input
    const textInput = document.createElement('input');
    textInput.type = 'text';
    textInput.placeholder = 'Enter annotation text or use speech...';
    textInput.style.cssText = `
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      min-width: 250px;
    `;
    
    // Speech-to-text button
    const speechBtn = document.createElement('button');
    speechBtn.textContent = '🎤';
    speechBtn.title = 'Speech to Text';
    speechBtn.style.cssText = `
      padding: 8px 12px;
      background: #ff5722;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      min-width: 40px;
    `;
    
    // Add button
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add Annotation';
    addBtn.style.cssText = `
      padding: 8px 16px;
      background: #1976d2;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = `
      padding: 8px 16px;
      background: #666;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    `;
    
    // Status
    const status = document.createElement('div');
    status.style.cssText = `
      font-size: 12px;
      color: #666;
      margin-left: 12px;
    `;
    status.textContent = 'Enter text and click "Add Annotation", then click on the image below';
    
    controls.appendChild(textInput);
    controls.appendChild(speechBtn);
    controls.appendChild(addBtn);
    controls.appendChild(closeBtn);
    controls.appendChild(status);
    
    // Create image container
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = `
      position: relative;
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      max-width: 90vw;
      max-height: 70vh;
      overflow: auto;
    `;
    
    // Create image
    const img = document.createElement('img');
    img.src = this.screenshot.imageData;
    img.style.cssText = `
      max-width: 100%;
      height: auto;
      display: block;
      cursor: crosshair;
      border: 1px solid #ddd;
    `;
    
    imageContainer.appendChild(img);
    this.overlay.appendChild(controls);
    this.overlay.appendChild(imageContainer);
    document.body.appendChild(this.overlay);
    
    // Event handlers
    addBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      if (!text) {
        alert('Please enter annotation text');
        return;
      }
      
      this.isAddingAnnotation = true;
      status.textContent = 'Click on the image where you want to place the annotation';
      img.style.cursor = 'crosshair';
    });
    
    closeBtn.addEventListener('click', () => {
      this.cleanup();
    });
    
    img.addEventListener('click', (e) => {
      if (!this.isAddingAnnotation) return;
      
      const rect = img.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Create annotation
      const annotation = {
        id: Date.now().toString(),
        text: textInput.value.trim(),
        x: x,
        y: y,
        pointer_x: x,
        pointer_y: y,
        timestamp: new Date().toISOString()
      };
      
      this.addAnnotation(annotation);
      this.isAddingAnnotation = false;
      textInput.value = '';
      img.style.cursor = 'default';
      status.textContent = 'Annotation added! Add more or click Close to finish.';
    });
    
    console.log('Annotation overlay created');
  }
  
  async addAnnotation(annotation) {
    try {
      this.annotations.push(annotation);
      
      // Update storage
      const result = await chrome.storage.local.get('screenshots');
      const screenshots = result.screenshots || [];
      const index = screenshots.findIndex(s => s.id === this.screenshot.id);
      
      if (index !== -1) {
        screenshots[index].annotations = this.annotations;
        await chrome.storage.local.set({ screenshots: screenshots });
        console.log('Annotation saved:', annotation.text);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
    }
  }
  
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    this.isActive = false;
    this.isAddingAnnotation = false;
    console.log('Annotation mode closed');
  }
}

// Initialize content script
if (!window.screenshotAnnotator) {
  window.screenshotAnnotator = new AnnotationOverlay();
}