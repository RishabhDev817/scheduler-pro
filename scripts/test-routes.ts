const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

const routes = [
  '/',
  '/dashboard',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/api/professors'
];

async function runTests() {
  console.log(`Starting Integration Test on Local Dev Server (${BASE_URL})...\n`);
  let passed = 0;
  let failed = 0;

  for (const route of routes) {
    const url = `${BASE_URL}${route}`;
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`\x1b[32m[PASS]\x1b[0m ${route} -> Status: ${response.status} OK`);
        passed++;
      } else {
        console.error(`\x1b[31m[FAIL]\x1b[0m ${route} -> Status: ${response.status}`);
        failed++;
      }
    } catch (err: any) {
      console.error(`\x1b[31m[FAIL]\x1b[0m ${route} -> Connection Error: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n-----------------------------------------`);
  console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
  console.log(`-----------------------------------------`);
  
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ All routes are live, returning 200 OK, and fully healthy!\x1b[0m');
  }
}

runTests();
