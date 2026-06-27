/**
 * Verification helper for admin session tokens
 */
export function verifySessionToken(token) {
  if (!token) return false;
  
  try {
    const adminUser = process.env.ADMIN_USERNAME;
    const adminPass = process.env.ADMIN_PASSWORD;
    
    if (!adminUser || !adminPass) return false;

    // Decode base64 token supporting both Node and Edge environments
    let decoded;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(token, 'base64').toString('utf-8');
    } else {
      decoded = atob(token);
    }
    
    const parts = decoded.split(':');
    const user = parts[0];
    const timestampStr = parts[1];
    const password = parts.slice(2).join(':');
    
    if (user !== adminUser || password !== adminPass) {
      return false;
    }

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    // Expiry check: 7 days
    const maxAge = 1000 * 60 * 60 * 24 * 7;
    if (Date.now() - timestamp > maxAge) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
