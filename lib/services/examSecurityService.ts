// Exam Security Service - Anti-cheating measures and full-screen functionality
// Adapted from AI-Interviewer repository for Next.js

export interface SecurityViolation {
  type: 'key_press' | 'tab_switch' | 'window_resize' | 'context_menu' | 'dev_tools';
  timestamp: string;
  details: string;
  severity: 'low' | 'medium' | 'high';
}

export interface SecurityConfig {
  disableKeys: string[];
  preventTabSwitch: boolean;
  preventWindowResize: boolean;
  preventContextMenu: boolean;
  preventDevTools: boolean;
  logViolations: boolean;
  maxViolations: number;
}

export class ExamSecurityService {
  private violations: SecurityViolation[] = [];
  private isFullscreen = false;
  private isMonitoring = false;
  private config: SecurityConfig;
  private eventListeners: Array<{ event: string; handler: EventListener }> = [];
  private violationCallback?: (violation: SecurityViolation) => void;
  private autoStopTimer?: NodeJS.Timeout;
  private examDuration?: number; // in minutes

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      disableKeys: [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
        'Tab', 'Alt', 'Ctrl', 'Meta', 'Shift',
        'PrintScreen', 'ScrollLock', 'Pause',
        'Insert', 'Delete', 'Home', 'End', 'PageUp', 'PageDown',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
      ],
      preventTabSwitch: true,
      preventWindowResize: true,
      preventContextMenu: true,
      preventDevTools: true,
      logViolations: true,
      maxViolations: 10,
      ...config
    };
  }

  /**
   * Start monitoring for security violations with optional auto-stop
   */
  startMonitoring(callback?: (violation: SecurityViolation) => void, examDurationMinutes?: number): void {
    if (this.isMonitoring) {
      console.warn('Security monitoring is already active');
      return;
    }

    // Check if we're in browser environment
    if (typeof window === 'undefined') {
      console.warn('Security monitoring can only be started in browser environment');
      return;
    }

    this.violationCallback = callback;
    this.isMonitoring = true;
    this.violations = [];
    this.examDuration = examDurationMinutes;

    console.log('🔒 Starting exam security monitoring...');
    
    // Set up auto-stop timer if exam duration is provided
    if (examDurationMinutes && examDurationMinutes > 0) {
      this.setupAutoStopTimer(examDurationMinutes);
    }

    // Disable keyboard shortcuts
    this.disableKeyboardShortcuts();
    
    // Add specific ESC key handler to prevent fullscreen exit
    this.preventEscKey();

    // Prevent context menu
    if (this.config.preventContextMenu) {
      this.preventContextMenu();
    }

    // Prevent tab switching
    if (this.config.preventTabSwitch) {
      this.preventTabSwitching();
    }

    // Prevent window resize
    if (this.config.preventWindowResize) {
      this.preventWindowResize();
    }

    // Monitor for dev tools
    if (this.config.preventDevTools) {
      this.monitorDevTools();
    }

    // Monitor visibility changes (tab switching)
    this.monitorVisibilityChange();

    console.log('✅ Security monitoring started successfully');
  }

  /**
   * Stop monitoring for security violations
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      console.warn('Security monitoring is not active');
      return;
    }

    console.log('🔒 Stopping exam security monitoring...');

    // Clear auto-stop timer
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = undefined;
    }

    // Remove all event listeners
    this.eventListeners.forEach(({ event, handler }) => {
      document.removeEventListener(event, handler);
      window.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    // Re-enable context menu
    document.oncontextmenu = null;

    this.isMonitoring = false;
    this.violationCallback = undefined;
    this.examDuration = undefined;

    console.log('✅ Security monitoring stopped successfully');
  }

  /**
   * Enter fullscreen mode
   */
  async enterFullscreen(): Promise<boolean> {
    try {
      const element = document.documentElement;
      
      // Standard API (Chrome, Edge, Opera)
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } 
      // Firefox-specific API
      else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      }
      // Webkit API (Safari, older Chrome)
      else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      }
      // MS API (IE/Edge legacy)
      else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
      else {
        console.warn('⚠️ Fullscreen API not supported in this browser');
        return false;
      }

      this.isFullscreen = true;
      console.log('✅ Entered fullscreen mode');
      return true;
    } catch (error) {
      console.error('❌ Failed to enter fullscreen:', error);
      return false;
    }
  }

  /**
   * Exit fullscreen mode
   */
  async exitFullscreen(): Promise<boolean> {
    try {
      // Standard API
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      // Firefox-specific API
      else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      }
      // Webkit API
      else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
      // MS API
      else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }

      this.isFullscreen = false;
      console.log('✅ Exited fullscreen mode');
      return true;
    } catch (error) {
      console.error('❌ Failed to exit fullscreen:', error);
      return false;
    }
  }

  /**
   * Check if currently in fullscreen
   */
  isInFullscreen(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(
      document.fullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );
  }

  /**
   * Get current violations
   */
  getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  /**
   * Get violation count
   */
  getViolationCount(): number {
    return this.violations.length;
  }

  /**
   * Check if max violations exceeded
   */
  hasExceededMaxViolations(): boolean {
    return this.violations.length >= this.config.maxViolations;
  }

  /**
   * Clear violations
   */
  clearViolations(): void {
    this.violations = [];
  }

  /**
   * Set up auto-stop timer for exam duration
   */
  private setupAutoStopTimer(durationMinutes: number): void {
    const durationMs = durationMinutes * 60 * 1000;
    
    this.autoStopTimer = setTimeout(() => {
      console.log('⏰ Exam duration completed - stopping security monitoring automatically');
      this.stopMonitoring();
      
      // Log as informational, not a violation
      this.logViolation({
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        details: 'Exam duration completed - security monitoring stopped automatically',
        severity: 'low'
      }, true); // Informational flag
    }, durationMs);
    
    console.log(`⏰ Auto-stop timer set for ${durationMinutes} minutes`);
  }

  /**
   * Manually stop security monitoring (for exam completion)
   */
  stopSecurityForExamCompletion(): void {
    console.log('🏁 Exam completed - stopping security monitoring');
    
    if (this.autoStopTimer) {
      clearTimeout(this.autoStopTimer);
      this.autoStopTimer = undefined;
    }
    
    // Log as informational, not a violation
    this.logViolation({
      type: 'tab_switch',
      timestamp: new Date().toISOString(),
      details: 'Exam completed by candidate - security monitoring stopped',
      severity: 'low'
    }, true); // Informational flag
    
    this.stopMonitoring();
  }

  /**
   * Check if security monitoring is active
   */
  isSecurityActive(): boolean {
    return this.isMonitoring;
  }

  /**
   * Prevent ESC key from exiting fullscreen mode
   */
  private preventEscKey(): void {
    const keydownHandler = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape' || keyboardEvent.code === 'Escape') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        keyboardEvent.stopImmediatePropagation();
        console.warn('🚫 ESC key blocked to prevent fullscreen exit');
        return false;
      }
    };

    const keyupHandler = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      if (keyboardEvent.key === 'Escape' || keyboardEvent.code === 'Escape') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        keyboardEvent.stopImmediatePropagation();
        return false;
      }
    };

    document.addEventListener('keydown', keydownHandler, true);
    document.addEventListener('keyup', keyupHandler, true);
    window.addEventListener('keydown', keydownHandler, true);
    window.addEventListener('keyup', keyupHandler, true);
    
    this.eventListeners.push(
      { event: 'keydown', handler: keydownHandler },
      { event: 'keyup', handler: keyupHandler }
    );
  }

  /**
   * Disable keyboard shortcuts and functional keys
   */
  private disableKeyboardShortcuts(): void {
    const handler = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      const key = keyboardEvent.key;
      const code = keyboardEvent.code;
      
      if (this.config.disableKeys.includes(key) || 
          this.config.disableKeys.includes(code)) {
        
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        keyboardEvent.stopImmediatePropagation();
        
        this.logViolation({
          type: 'key_press',
          timestamp: new Date().toISOString(),
          details: `Disabled key pressed: ${key} (${code})`,
          severity: 'high'
        });
        
        console.warn(`🚫 Disabled key pressed: ${key}`);
        return false;
      }

      // Disable Ctrl/Cmd + key combinations
      if (keyboardEvent.ctrlKey || keyboardEvent.metaKey) {
        if (['c', 'v', 'x', 'a', 'z', 'y', 's', 'p', 'f', 'g', 'h', 'r', 't', 'w', 'n', 'o'].includes(key.toLowerCase())) {
          keyboardEvent.preventDefault();
          keyboardEvent.stopPropagation();
          keyboardEvent.stopImmediatePropagation();
          
          this.logViolation({
            type: 'key_press',
            timestamp: new Date().toISOString(),
            details: `Disabled shortcut: ${keyboardEvent.ctrlKey ? 'Ctrl' : 'Cmd'}+${key}`,
            severity: 'high'
          });
          
          console.warn(`🚫 Disabled shortcut: ${keyboardEvent.ctrlKey ? 'Ctrl' : 'Cmd'}+${key}`);
          return false;
        }
      }

      // Disable Alt + Tab
      if (keyboardEvent.altKey && key === 'Tab') {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        keyboardEvent.stopImmediatePropagation();
        
        this.logViolation({
          type: 'key_press',
          timestamp: new Date().toISOString(),
          details: 'Alt+Tab combination blocked',
          severity: 'high'
        });
        
        console.warn('🚫 Alt+Tab blocked');
        return false;
      }
    };

    document.addEventListener('keydown', handler, true);
    window.addEventListener('keydown', handler, true);
    document.addEventListener('keyup', handler, true);
    window.addEventListener('keyup', handler, true);
    
    this.eventListeners.push(
      { event: 'keydown', handler },
      { event: 'keyup', handler }
    );
  }

  /**
   * Prevent context menu
   */
  private preventContextMenu(): void {
    const handler = (event: Event) => {
      const mouseEvent = event as MouseEvent;
      mouseEvent.preventDefault();
      mouseEvent.stopPropagation();
      
      this.logViolation({
        type: 'context_menu',
        timestamp: new Date().toISOString(),
        details: 'Right-click context menu attempted',
        severity: 'medium'
      });
      
      console.warn('🚫 Right-click context menu blocked');
      return false;
    };

    document.addEventListener('contextmenu', handler, true);
    this.eventListeners.push({ event: 'contextmenu', handler });
  }

  /**
   * Prevent tab switching
   */
  private preventTabSwitching(): void {
    const handler = (event: BeforeUnloadEvent) => {
      const message = 'You are not allowed to leave the exam page. This action will be recorded.';
      event.preventDefault();
      event.returnValue = message;
      
      this.logViolation({
        type: 'tab_switch',
        timestamp: new Date().toISOString(),
        details: 'Attempt to leave exam page',
        severity: 'high'
      });
      
      console.warn('🚫 Attempt to leave exam page blocked');
      return message;
    };

    window.addEventListener('beforeunload', handler);
    this.eventListeners.push({ event: 'beforeunload', handler });
  }

  /**
   * Prevent window resize
   */
  private preventWindowResize(): void {
    const handler = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      
      this.logViolation({
        type: 'window_resize',
        timestamp: new Date().toISOString(),
        details: 'Window resize attempted',
        severity: 'medium'
      });
      
      console.warn('🚫 Window resize blocked');
      return false;
    };

    window.addEventListener('resize', handler);
    this.eventListeners.push({ event: 'resize', handler });
  }

  /**
   * Monitor for developer tools
   */
  private monitorDevTools(): void {
    let devtools = false;
    const threshold = 160;

    const handler = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true;
          
          this.logViolation({
            type: 'dev_tools',
            timestamp: new Date().toISOString(),
            details: 'Developer tools detected',
            severity: 'high'
          });
          
          console.warn('🚫 Developer tools detected');
        }
      } else {
        devtools = false;
      }
    };

    setInterval(handler, 500);
  }

  /**
   * Monitor visibility changes (tab switching)
   */
  private monitorVisibilityChange(): void {
    const handler = () => {
      if (document.hidden) {
        this.logViolation({
          type: 'tab_switch',
          timestamp: new Date().toISOString(),
          details: 'Tab switched or minimized',
          severity: 'high'
        });
        
        console.warn('🚫 Tab switch/minimize detected');
      }
    };

    document.addEventListener('visibilitychange', handler);
    this.eventListeners.push({ event: 'visibilitychange', handler });
  }

  /**
   * Log a security violation
   * @param violation The security violation to log
   * @param isInformational If true, this is an informational event (not a real violation)
   */
  private logViolation(violation: SecurityViolation, isInformational: boolean = false): void {
    if (!this.config.logViolations) return;

    // Only add to violations array if it's a real violation
    if (!isInformational) {
      this.violations.push(violation);
    }
    
    if (this.violationCallback) {
      this.violationCallback(violation);
    }

    // Use appropriate log level
    if (isInformational) {
      console.log('ℹ️ Security Event:', violation);
    } else {
      console.warn('🚨 Security Violation:', violation);
    }

    // Only check max violations for real violations
    if (!isInformational && this.hasExceededMaxViolations()) {
      console.warn('⚠️ Maximum violations exceeded! Exam may be terminated.');
    }
  }
}

// Export singleton instance
export const examSecurityService = new ExamSecurityService();
