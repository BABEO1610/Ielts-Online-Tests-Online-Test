const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.DATABASE_URL || '';

console.log('=== DATABASE_URL debug ===');
if (!url) {
  console.log('❌ DATABASE_URL is EMPTY or NOT SET');
  process.exit(1);
}

try {
  const u = new URL(url);
  console.log('HOST    :', u.hostname);
  console.log('PORT    :', u.port || '5432');
  console.log('DB      :', u.pathname);
  console.log('USER    :', u.username);
  console.log('SSL     :', u.searchParams.get('sslmode') || '(none in URL)');
} catch(e) {
  console.log('❌ DATABASE_URL parse error:', e.message);
  console.log('Raw (first 80 chars):', url.substring(0, 80));
}

console.log('\n=== DNS Lookup for extracted host ===');
const dns = require('dns');
const { URL } = require('url');
try {
  const u2 = new URL(url);
  dns.lookup(u2.hostname, (err, address) => {
    if (err) {
      console.log('❌ DNS lookup FAILED for', u2.hostname, ':', err.message);
    } else {
      console.log('✅ DNS resolved', u2.hostname, '->', address);
    }
    process.exit(0);
  });
} catch(e) {
  console.log('Cannot parse URL for DNS check:', e.message);
  process.exit(1);
}
