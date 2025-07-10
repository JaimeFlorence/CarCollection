// Activity tracking for session management
export class ActivityTracker {
  private lastActivityTime: number = Date.now();
  private activityListeners: Set<() => void> = new Set();

  updateActivity() {
    this.lastActivityTime = Date.now();
    // Notify all listeners
    this.activityListeners.forEach(listener => listener());
  }

  getLastActivityTime(): number {
    return this.lastActivityTime;
  }

  addActivityListener(listener: () => void) {
    this.activityListeners.add(listener);
  }

  removeActivityListener(listener: () => void) {
    this.activityListeners.delete(listener);
  }
}

export const activityTracker = new ActivityTracker();