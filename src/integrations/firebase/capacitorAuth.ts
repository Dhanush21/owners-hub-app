/*
 * Adapter for Capacitor Firebase Authentication plugin.
 * Centralizes dynamic import, provides typed wrapper methods and clear errors.
 */

type CapacitorAuthPlugin = any;

let cachedPlugin: CapacitorAuthPlugin | null | undefined;

async function loadPlugin(): Promise<CapacitorAuthPlugin | null> {
  if (cachedPlugin !== undefined) return cachedPlugin || null;

  try {
    const mod = await import('@capacitor-firebase/authentication');
    // Common shapes: exported default or FirebaseAuthentication property
    const plugin = (mod && ((mod as any).FirebaseAuthentication || (mod as any).default || mod)) || null;
    cachedPlugin = plugin;
    return plugin;
  } catch (e) {
    cachedPlugin = null;
    return null;
  }
}

export async function isPluginAvailable(): Promise<boolean> {
  const p = await loadPlugin();
  return !!p;
}

export async function signInWithPhoneNumberNative(opts: { phoneNumber: string }) {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error('Capacitor Firebase Authentication plugin not installed');

  // Try common method names and surface consistent errors
  const fn = plugin.signInWithPhoneNumber || plugin.startPhoneNumberVerification || plugin.signInWithVerificationCode || null;
  if (!fn) {
    throw new Error('Native auth plugin found but does not expose a known signIn method');
  }

  try {
    return await fn.call(plugin, opts);
  } catch (err: any) {
    const message = err?.message || String(err);
    const out = new Error(`Native signInWithPhoneNumber failed: ${message}`);
    (out as any).original = err;
    throw out;
  }
}

export async function verifyPhoneNumberNative(opts: { verificationId: string; verificationCode: string }) {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error('Capacitor Firebase Authentication plugin not installed');

  const fn = plugin.verifyPhoneNumber || plugin.signInWithVerificationCode || null;
  if (!fn) throw new Error('Native auth plugin found but does not expose a verify method');

  try {
    return await fn.call(plugin, opts);
  } catch (err: any) {
    const message = err?.message || String(err);
    const out = new Error(`Native verifyPhoneNumber failed: ${message}`);
    (out as any).original = err;
    throw out;
  }
}

export async function signInWithVerificationCodeNative(opts: { verificationId: string; verificationCode: string }) {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error('Capacitor Firebase Authentication plugin not installed');

  // Prefer explicit API if plugin provides it, otherwise delegate to verifyPhoneNumber implementation
  const fn = plugin.signInWithVerificationCode || plugin.verifyPhoneNumber || null;
  if (!fn) throw new Error('Native auth plugin found but does not expose signInWithVerificationCode/verifyPhoneNumber');

  try {
    return await fn.call(plugin, opts);
  } catch (err: any) {
    const message = err?.message || String(err);
    const out = new Error(`Native signInWithVerificationCode failed: ${message}`);
    (out as any).original = err;
    throw out;
  }
}

export async function startPhoneNumberVerificationNative(opts: { phoneNumber: string }) {
  const plugin = await loadPlugin();
  if (!plugin) throw new Error('Capacitor Firebase Authentication plugin not installed');

  const fn = plugin.startPhoneNumberVerification || plugin.signInWithPhoneNumber || null;
  if (!fn) throw new Error('Native auth plugin found but does not expose a startPhoneNumberVerification method');

  try {
    return await fn.call(plugin, opts);
  } catch (err: any) {
    const message = err?.message || String(err);
    const out = new Error(`Native startPhoneNumberVerification failed: ${message}`);
    (out as any).original = err;
    throw out;
  }
}

export default {
  isPluginAvailable,
  loadPlugin,
  signInWithPhoneNumberNative,
  verifyPhoneNumberNative,
  startPhoneNumberVerificationNative,
};
