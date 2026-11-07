async function measure(name, url, options = {}) {
  const start = performance.now();
  try {
    const res = await fetch(url, options);
    const duration = Math.round(performance.now() - start);
    const text = await res.text();
    console.log(`${name}: ${duration}ms | HTTP ${res.status} | length: ${text.length}`);
    return { name, duration, status: res.status };
  } catch (err) {
    const duration = Math.round(performance.now() - start);
    console.log(`${name}: ${duration}ms | ERROR: ${err.message}`);
    return { name, duration, error: err.message };
  }
}

async function run() {
  const base = 'https://psbysrj01.vercel.app';
  console.log(`=== Measuring Production Latencies on ${base} ===\n`);

  // First round (potential cold start)
  console.log('--- Pass 1 (Cold / Initial) ---');
  await measure('HTML /', `${base}/`);
  await measure('/api/health', `${base}/api/health`);
  await measure('/api/auth/config', `${base}/api/auth/config`);
  await measure('/api/auth/me', `${base}/api/auth/me`);
  await measure('/api/properties', `${base}/api/properties`);
  await measure('/api/media', `${base}/api/media`);
  await measure('/api/conference', `${base}/api/conference`);
  await measure('/api/community/posts', `${base}/api/community/posts`);

  console.log('\n--- Pass 2 (Warm Cache / Connection) ---');
  await measure('HTML /', `${base}/`);
  await measure('/api/health', `${base}/api/health`);
  await measure('/api/auth/config', `${base}/api/auth/config`);
  await measure('/api/auth/me', `${base}/api/auth/me`);
  await measure('/api/properties', `${base}/api/properties`);
  await measure('/api/media', `${base}/api/media`);
  await measure('/api/conference', `${base}/api/conference`);
  await measure('/api/community/posts', `${base}/api/community/posts`);
}

run();
