// gm-auth.js — Password barrier for GM edit mode (B84)
// TEST mode: hardcoded password, plain equality check.
// Replace with hashed/configurable mechanism later if needed.
//
// Note: client-side check is a deterrent against curious players, NOT
// cryptographic security. Anyone with DevTools can read this source.

const GM_PASSWORD = 'LeMJaToujoursRaison+1000';

// Always available (no first-use setup needed)
export function hasGmPassword() {
  return true;
}

// Async signature kept for compatibility with the wizard's await usage.
export async function verifyGmPassword(plain) {
  return plain === GM_PASSWORD;
}

// Stubs kept so the import in wizard.js does not break if referenced.
// They are no-ops in test mode.
export async function setGmPassword(_plain) {
  return;
}

export function clearGmPassword() {
  return;
}
