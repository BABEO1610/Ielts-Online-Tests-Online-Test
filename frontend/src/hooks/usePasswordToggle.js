import { useState, useCallback } from 'react';

/**
 * usePasswordToggle — toggle show/hide for a single password input.
 * Call once per input field; each call returns an independent state.
 * @returns {[string, boolean, Function]} [inputType, isVisible, toggle]
 */
export function usePasswordToggle() {
  const [visible, setVisible] = useState(false);
  const toggle = useCallback(() => setVisible(v => !v), []);
  return [visible ? 'text' : 'password', visible, toggle];
}
