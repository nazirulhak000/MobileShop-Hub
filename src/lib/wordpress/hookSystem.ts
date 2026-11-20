/**
 * WordPress-style Event Bus: Hooks & Filters API (Round 26)
 *
 * Implements the core WordPress plugin architecture:
 * - `addFilter` / `applyFilters`: Pass-by-transformation pipeline ordered by priority
 * - `addAction` / `doAction`: Event-driven side-effect triggers ordered by priority
 * - `removeFilter` / `removeAction`: Dynamic listener cleanup
 * - `hasFilter` / `hasAction`: Inspection utilities
 * - Lifecycle hooks for Storefront rendering
 */

export type HookCallback = (...args: any[]) => any;

export interface HookListener {
  id: string;
  callback: HookCallback;
  priority: number;
  acceptedArgs: number;
}

export class WordPressHookBus {
  private filters: Map<string, HookListener[]> = new Map();
  private actions: Map<string, HookListener[]> = new Map();
  private nextId = 1;

  /**
   * Adds a filter callback to a specific hook.
   * Filters take a value and optional context args, transforming the value in priority order.
   *
   * @param hookName Name of the filter hook (e.g. 'storefront_render_block')
   * @param callback Function to transform the value
   * @param priority Order of execution (lower numbers run earlier; default 10)
   * @param acceptedArgs Maximum number of arguments to pass to the callback
   * @returns Listener ID string for removal
   */
  addFilter(
    hookName: string,
    callback: HookCallback,
    priority = 10,
    acceptedArgs = 1
  ): string {
    if (!hookName || typeof callback !== "function") return "";

    const id = `filter_${this.nextId++}`;
    const listener: HookListener = { id, callback, priority, acceptedArgs };

    const current = this.filters.get(hookName) || [];
    current.push(listener);
    // Sort ascending by priority; stable sort maintains insertion order for same priority
    current.sort((a, b) => a.priority - b.priority);
    this.filters.set(hookName, current);

    return id;
  }

  /**
   * Applies all filter callbacks to a value, chaining the output of each through the next.
   *
   * @param hookName Name of the filter hook
   * @param value Initial value to filter
   * @param args Additional context arguments passed to filters
   * @returns The filtered value
   */
  applyFilters<T = any>(hookName: string, value: T, ...args: any[]): T {
    const listeners = this.filters.get(hookName);
    if (!listeners || listeners.length === 0) {
      return value;
    }

    let filteredValue = value;
    for (const listener of listeners) {
      try {
        const passArgs = [filteredValue, ...args].slice(0, listener.acceptedArgs);
        filteredValue = listener.callback(...passArgs);
      } catch (err) {
        console.error(`[applyFilters] Error in hook "${hookName}":`, err);
      }
    }

    return filteredValue;
  }

  /**
   * Adds an action callback to a specific hook.
   * Actions execute side effects at lifecycle points without modifying a return value.
   *
   * @param hookName Name of the action hook (e.g. 'storefront_after_header')
   * @param callback Function to execute
   * @param priority Order of execution (lower numbers run earlier; default 10)
   * @param acceptedArgs Maximum number of arguments to pass to the callback
   * @returns Listener ID string for removal
   */
  addAction(
    hookName: string,
    callback: HookCallback,
    priority = 10,
    acceptedArgs = 1
  ): string {
    if (!hookName || typeof callback !== "function") return "";

    const id = `action_${this.nextId++}`;
    const listener: HookListener = { id, callback, priority, acceptedArgs };

    const current = this.actions.get(hookName) || [];
    current.push(listener);
    current.sort((a, b) => a.priority - b.priority);
    this.actions.set(hookName, current);

    return id;
  }

  /**
   * Executes all action callbacks registered for the hook in priority order.
   *
   * @param hookName Name of the action hook
   * @param args Context arguments passed to listeners
   */
  doAction(hookName: string, ...args: any[]): void {
    const listeners = this.actions.get(hookName);
    if (!listeners || listeners.length === 0) return;

    for (const listener of listeners) {
      try {
        const passArgs = args.slice(0, listener.acceptedArgs);
        listener.callback(...passArgs);
      } catch (err) {
        console.error(`[doAction] Error in action hook "${hookName}":`, err);
      }
    }
  }

  /**
   * Removes a registered filter by hookName and callback or listener ID.
   */
  removeFilter(hookName: string, callbackOrId: HookCallback | string): boolean {
    const listeners = this.filters.get(hookName);
    if (!listeners) return false;

    const initialLen = listeners.length;
    const remaining = listeners.filter(
      (l) => l.id !== callbackOrId && l.callback !== callbackOrId
    );

    if (remaining.length === 0) {
      this.filters.delete(hookName);
    } else {
      this.filters.set(hookName, remaining);
    }

    return remaining.length < initialLen;
  }

  /**
   * Removes a registered action by hookName and callback or listener ID.
   */
  removeAction(hookName: string, callbackOrId: HookCallback | string): boolean {
    const listeners = this.actions.get(hookName);
    if (!listeners) return false;

    const initialLen = listeners.length;
    const remaining = listeners.filter(
      (l) => l.id !== callbackOrId && l.callback !== callbackOrId
    );

    if (remaining.length === 0) {
      this.actions.delete(hookName);
    } else {
      this.actions.set(hookName, remaining);
    }

    return remaining.length < initialLen;
  }

  /**
   * Checks if a filter has any listeners, or if a specific callback/ID is registered.
   */
  hasFilter(hookName: string, callbackOrId?: HookCallback | string): boolean {
    const listeners = this.filters.get(hookName);
    if (!listeners || listeners.length === 0) return false;
    if (!callbackOrId) return true;
    return listeners.some(
      (l) => l.id === callbackOrId || l.callback === callbackOrId
    );
  }

  /**
   * Checks if an action has any listeners, or if a specific callback/ID is registered.
   */
  hasAction(hookName: string, callbackOrId?: HookCallback | string): boolean {
    const listeners = this.actions.get(hookName);
    if (!listeners || listeners.length === 0) return false;
    if (!callbackOrId) return true;
    return listeners.some(
      (l) => l.id === callbackOrId || l.callback === callbackOrId
    );
  }

  /**
   * Removes all listeners for a hook, or resets the entire bus if no hookName is provided.
   */
  removeAllFilters(hookName?: string): void {
    if (hookName) {
      this.filters.delete(hookName);
    } else {
      this.filters.clear();
    }
  }

  /**
   * Removes all actions for a hook, or resets the entire bus if no hookName is provided.
   */
  removeAllActions(hookName?: string): void {
    if (hookName) {
      this.actions.delete(hookName);
    } else {
      this.actions.clear();
    }
  }

  /**
   * Completely clears all filters and actions.
   */
  reset(): void {
    this.filters.clear();
    this.actions.clear();
  }
}

// Global default singleton hook bus
export const defaultHooks = new WordPressHookBus();

// Convenience global functions conforming to WordPress Core naming conventions
export const addFilter = (
  hookName: string,
  callback: HookCallback,
  priority = 10,
  acceptedArgs = 1
) => defaultHooks.addFilter(hookName, callback, priority, acceptedArgs);

export const applyFilters = <T = any>(
  hookName: string,
  value: T,
  ...args: any[]
): T => defaultHooks.applyFilters<T>(hookName, value, ...args);

export const addAction = (
  hookName: string,
  callback: HookCallback,
  priority = 10,
  acceptedArgs = 1
) => defaultHooks.addAction(hookName, callback, priority, acceptedArgs);

export const doAction = (hookName: string, ...args: any[]) =>
  defaultHooks.doAction(hookName, ...args);

export const removeFilter = (hookName: string, callbackOrId: HookCallback | string) =>
  defaultHooks.removeFilter(hookName, callbackOrId);

export const removeAction = (hookName: string, callbackOrId: HookCallback | string) =>
  defaultHooks.removeAction(hookName, callbackOrId);

export const hasFilter = (hookName: string, callbackOrId?: HookCallback | string) =>
  defaultHooks.hasFilter(hookName, callbackOrId);

export const hasAction = (hookName: string, callbackOrId?: HookCallback | string) =>
  defaultHooks.hasAction(hookName, callbackOrId);
