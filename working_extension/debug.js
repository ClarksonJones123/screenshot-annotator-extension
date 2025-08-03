// Debug script for popup.js issues
// This script helps identify why screenshots aren't showing in the popup list

class PopupDebugger {
  constructor() {
    this.console = console;
    this.startDebugging();
  }
  
  startDebugging() {
    this.log('🔍 Starting popup debug session...');
    this.checkEnvironment();
    this.checkDOM();
    this.checkStorage();
  }
  
  log(message, data = null) {
    console.log(`[POPUP DEBUG] ${message}`, data || '');
  }
  
  error(message, error = null) {
    console.error(`[POPUP DEBUG] ${message}`, error || '');
  }
  
  checkEnvironment() {
    this.log('Checking environment...');
    
    // Check Chrome APIs
    if (typeof chrome !== 'undefined') {
      this.log('✅ Chrome APIs available');
      
      if (chrome.storage) {
        this.log('✅ Chrome storage API available');
      } else {
        this.error('❌ Chrome storage API not available');
      }
      
      if (chrome.runtime) {
        this.log('✅ Chrome runtime API available');
      } else {
        this.error('❌ Chrome runtime API not available');
      }
      
    } else {
      this.error('❌ Chrome APIs not available - extension may not be loaded');
    }
  }
  
  checkDOM() {
    this.log('Checking DOM elements...');
    
    const requiredElements = [
      'captureBtn',
      'annotateBtn', 
      'clearBtn',
      'screenshotsList',
      'memoryUsage',
      'screenshotCount',
      'status'
    ];
    
    let missingElements = [];
    
    requiredElements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.log(`✅ Found element: ${id}`);
      } else {
        this.error(`❌ Missing element: ${id}`);
        missingElements.push(id);
      }
    });
    
    if (missingElements.length > 0) {
      this.error('Missing DOM elements could cause UI issues:', missingElements);
    } else {
      this.log('✅ All required DOM elements found');
    }
  }
  
  async checkStorage() {
    this.log('Checking storage...');
    
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get('screenshots');
        const screenshots = result.screenshots || [];
        
        this.log(`📊 Found ${screenshots.length} screenshots in storage`);
        
        if (screenshots.length > 0) {
          this.log('Screenshots data:', screenshots.map(s => ({
            id: s.id,
            title: s.title,
            timestamp: s.timestamp,
            hasImageData: !!s.imageData,
            imageDataSize: s.imageData ? Math.round(s.imageData.length / 1024) + ' KB' : 'N/A'
          })));
          
          // Check if screenshots have required properties
          screenshots.forEach((screenshot, index) => {
            const required = ['id', 'imageData', 'title', 'timestamp'];
            const missing = required.filter(prop => !screenshot[prop]);
            
            if (missing.length > 0) {
              this.error(`Screenshot ${index} missing properties:`, missing);
            } else {
              this.log(`✅ Screenshot ${index} has all required properties`);
            }
          });
          
        } else {
          this.log('ℹ️ No screenshots found in storage');
        }
        
      } else {
        this.error('❌ Chrome storage not available for testing');
      }
      
    } catch (error) {
      this.error('Storage check failed:', error);
    }
  }
  
  async simulateScreenshotCapture() {
    this.log('🧪 Simulating screenshot capture...');
    
    try {
      // Create a test screenshot object
      const testScreenshot = {
        id: Date.now().toString(),
        imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', // 1x1 transparent PNG
        originalWidth: 1920,
        originalHeight: 1080,
        displayWidth: 1728,
        displayHeight: 972,
        url: 'test://example.com',
        title: 'Test Screenshot',
        timestamp: new Date().toISOString(),
        annotations: []
      };
      
      // Save to storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const existing = await chrome.storage.local.get('screenshots');
        const screenshots = existing.screenshots || [];
        screenshots.push(testScreenshot);
        await chrome.storage.local.set({ screenshots: screenshots });
        
        this.log('✅ Test screenshot saved to storage');
        
        // Try to trigger UI update if ScreenshotAnnotator exists
        if (window.screenshotAnnotator && typeof window.screenshotAnnotator.updateUI === 'function') {
          window.screenshotAnnotator.screenshots = screenshots;
          window.screenshotAnnotator.updateUI();
          this.log('✅ Triggered UI update');
        } else {
          this.error('❌ ScreenshotAnnotator instance not found or updateUI method missing');
        }
        
      } else {
        this.error('❌ Cannot simulate - Chrome storage not available');
      }
      
    } catch (error) {
      this.error('Simulation failed:', error);
    }
  }
  
  diagnoseUIUpdate() {
    this.log('🔍 Diagnosing UI update issues...');
    
    // Check if screenshotsList element exists and inspect its content
    const listElement = document.getElementById('screenshotsList');
    if (listElement) {
      this.log('screenshotsList element found');
      this.log('Current innerHTML length:', listElement.innerHTML.length);
      this.log('Current innerHTML preview:', listElement.innerHTML.substring(0, 200) + '...');
      
      // Check for empty state
      if (listElement.innerHTML.includes('empty-state')) {
        this.log('ℹ️ UI showing empty state - no screenshots rendered');
      }
      
      // Check for screenshot items
      const screenshotItems = listElement.querySelectorAll('.screenshot-item');
      this.log(`Found ${screenshotItems.length} screenshot items in DOM`);
      
    } else {
      this.error('❌ screenshotsList element not found');
    }
    
    // Check memory usage display
    const memoryElement = document.getElementById('memoryUsage');
    const countElement = document.getElementById('screenshotCount');
    
    if (memoryElement) {
      this.log('Memory usage display:', memoryElement.textContent);
    }
    
    if (countElement) {
      this.log('Screenshot count display:', countElement.textContent);
    }
  }
}

// Auto-start debugging when script loads
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    window.popupDebugger = new PopupDebugger();
    
    // Add debugging methods to window for manual testing
    window.debugExtension = {
      checkStorage: () => window.popupDebugger.checkStorage(),
      simulateCapture: () => window.popupDebugger.simulateScreenshotCapture(),
      diagnoseUI: () => window.popupDebugger.diagnoseUIUpdate(),
      clearStorage: async () => {
        if (typeof chrome !== 'undefined' && chrome.storage) {
          await chrome.storage.local.clear();
          console.log('Storage cleared');
        }
      }
    };
    
    console.log('🧪 Debug methods available: window.debugExtension');
  });
} else {
  console.log('🔍 Popup debugger loaded (DOM not ready)');
}