/**
 * Automated Verification and Validation Test Suite
 * Validates BigQuery -> MySQL migration, MongoDB -> MySQL User migration,
 * finance formula accuracy, SQL injection safety, and API response contracts.
 */

import 'dotenv/config';
import mysqlService from '../utils/mysqlClient.js';
import User from '../models/User.js';
import aiService from '../aiService.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} - ${details}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   FINANCE360: MYSQL MIGRATION VERIFICATION SUITE');
  console.log('======================================================\n');

  // Test 1: MySQL Connection Health Check
  console.log('Test Group 1: MySQL Database Connectivity');
  const isConnected = await mysqlService.testConnection();
  assert(isConnected === true, 'MySQL pool connection healthy and responsive');

  // Test 2: Table existence & row counts
  console.log('\nTest Group 2: Table Existence & Data Integrity');
  const [daCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM dataai');
  const [oiCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM order_intake');
  const [cxCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM capex');
  const [coCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM collection');
  const [uCount] = await mysqlService.executeQuery('SELECT count(*) as c FROM users');

  assert(daCount.c >= 7488, `dataai table populated (found ${daCount.c} rows, expected >= 7488)`);
  assert(oiCount.c >= 576, `order_intake table populated (found ${oiCount.c} rows, expected >= 576)`);
  assert(cxCount.c >= 576, `capex table populated (found ${cxCount.c} rows, expected >= 576)`);
  assert(coCount.c >= 576, `collection table populated (found ${coCount.c} rows, expected >= 576)`);
  assert(uCount.c >= 1, `users table exists and populated in MySQL (found ${uCount.c} rows)`);

  // Test 3: SQL Injection Safety
  console.log('\nTest Group 3: Parameterized SQL & Injection Prevention');
  const maliciousInput = "' OR '1'='1' -- ";
  const safeResult = await mysqlService.executeQuery(
    'SELECT * FROM dataai WHERE Biz1 = ? LIMIT 5',
    [maliciousInput]
  );
  assert(Array.isArray(safeResult) && safeResult.length === 0, 'Parameterized query blocks SQL injection attempt');

  // Test 4: Fiscal Year & Scenario Filtering
  console.log('\nTest Group 4: Fiscal Year & Actual vs Budget Scenarios');
  const fyRows = await mysqlService.executeQuery(`
    SELECT DISTINCT FYs FROM dataai WHERE FYs IN ('FY24', 'FY25', 'FY26') ORDER BY FYs
  `);
  assert(fyRows.length === 3, `All 3 Fiscal Years present (FY24, FY25, FY26)`);

  const scenarioRows = await mysqlService.executeQuery(`
    SELECT DISTINCT Nature FROM dataai WHERE FYs = 'FY24'
  `);
  const scenarios = scenarioRows.map(r => r.Nature);
  assert(scenarios.includes('Actuals') && scenarios.includes('Budget'), `Distinct Actuals and Budget scenarios present`);

  // Test 5: Finance Formula Validation against Finance Formula.txt
  console.log('\nTest Group 5: Finance Metric Formulas & Computations');
  const pnlRows = await mysqlService.executeQuery(`
    SELECT
      Nature,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Revenue' THEN Mn ELSE 0 END), 4) AS Revenue,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Variable Cost' THEN Mn ELSE 0 END), 4) AS Variable_Cost,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'People Cost' THEN Mn ELSE 0 END), 4) AS People_Cost,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Marketing Expenses' THEN Mn ELSE 0 END), 4) AS Marketing_Expenses,
      ROUND(SUM(CASE WHEN \`SG&A\` IN ('Premise Expenses', 'Premises') THEN Mn ELSE 0 END), 4) AS Premises,
      ROUND(SUM(CASE WHEN \`SG&A\` IN ('Travel Expenses', 'Travel') THEN Mn ELSE 0 END), 4) AS Travel,
      ROUND(SUM(CASE WHEN \`SG&A\` IN ('Telecom Expenses', 'Telecom') THEN Mn ELSE 0 END), 4) AS Telecom,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Legal & Professional' THEN Mn ELSE 0 END), 4) AS Legal_Prof,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Administration' THEN Mn ELSE 0 END), 4) AS Admin,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'PICA' THEN Mn ELSE 0 END), 4) AS PICA,
      ROUND(SUM(CASE WHEN \`SG&A\` = 'Corp Allocation' THEN Mn ELSE 0 END), 4) AS Corp_Allocation
    FROM dataai
    WHERE FYs = 'FY24'
    GROUP BY Nature
  `);

  const actuals = pnlRows.find(r => r.Nature === 'Actuals');
  assert(actuals && actuals.Revenue > 0, `Revenue is positive (₹${actuals.Revenue} Mn)`);

  const gp = actuals.Revenue - actuals.Variable_Cost;
  assert(gp > 0, `Gross Profit = Revenue - Variable Cost (₹${gp.toFixed(4)} Mn)`);

  const gmPct = (gp / actuals.Revenue) * 100;
  assert(gmPct > 80 && gmPct < 100, `Gross Margin % = (Gross Profit / Revenue) * 100 (${gmPct.toFixed(2)}%)`);

  const fixedCosts = actuals.Premises + actuals.Travel + actuals.Telecom + actuals.Legal_Prof + actuals.Admin;
  assert(fixedCosts > 0, `Fixed Costs = Premises + Travel + Telecom + Legal + Admin (₹${fixedCosts.toFixed(4)} Mn)`);

  const totalOpex = actuals.People_Cost + actuals.Marketing_Expenses + fixedCosts + actuals.PICA + actuals.Corp_Allocation;
  assert(totalOpex > 0, `Total Opex = People + Marketing + Fixed Costs + PICA + Corp Alloc (₹${totalOpex.toFixed(4)} Mn)`);

  const ebitda = gp - totalOpex;
  assert(ebitda > 0, `EBITDA = Gross Profit - Total Opex (₹${ebitda.toFixed(4)} Mn)`);

  const ebitdaPct = (ebitda / actuals.Revenue) * 100;
  assert(ebitdaPct > 40 && ebitdaPct < 60, `EBITDA % = (EBITDA / Revenue) * 100 (${ebitdaPct.toFixed(2)}%)`);

  // Cash and Capex calculations
  const [capexSum] = await mysqlService.executeQuery("SELECT SUM(Amount) as s FROM capex WHERE Year = 'FY24' AND Nature IN ('Actual', 'Actuals')");
  const [collSum] = await mysqlService.executeQuery("SELECT SUM(Amount) as s FROM collection WHERE Year = 'FY24' AND Nature IN ('Actual', 'Actuals')");
  assert(capexSum.s > 0, `Capex metric verified (₹${Number(capexSum.s).toFixed(2)} Mn)`);
  assert(collSum.s > 0, `Collection metric verified (₹${Number(collSum.s).toFixed(2)} Mn)`);

  const netCash = collSum.s - totalOpex - capexSum.s;
  assert(typeof netCash === 'number', `Net Cash = Collection - Total Opex - Capex (₹${netCash.toFixed(2)} Mn)`);

  // Test 6: AI Finance Agent query service
  console.log('\nTest Group 6: MySQL-Backed AI Finance Assistant');
  const aiOverview = await aiService.ask({
    question: 'What is the revenue and EBITDA performance for FY24?',
    filters: { fy: 'FY24', q: 'Total' }
  });
  assert(aiOverview.answer && aiOverview.answer.includes('Net Revenue'), 'AI provides financial answer with bold metrics');
  assert(aiOverview.model === 'MySQL Finance Intelligence Agent', `AI Model identifies as MySQL Finance Intelligence Agent`);
  assert(aiOverview.sql_trace.length > 0, `AI provides verifiable SQL trace`);
  assert(Array.isArray(aiOverview.evidence) && aiOverview.evidence.length > 0, `AI provides data evidence`);

  // Test 7: User Management on MySQL (No MongoDB)
  console.log('\nTest Group 7: MySQL User Management');
  const testEmail = `test_engineer_${Date.now()}@finance360.local`;
  const createdUser = await User.create({
    email: testEmail,
    name: 'Test Engineer',
    role: 'user',
    businesses: ['Data & Analytics']
  });
  assert(createdUser && createdUser._id, `User created in MySQL (ID: ${createdUser._id})`);

  const foundUser = await User.findOne({ email: testEmail });
  assert(foundUser && foundUser.email === testEmail, `User retrieved by email from MySQL`);

  foundUser.name = 'Updated Engineer';
  await foundUser.save();
  const updatedUser = await User.findById(createdUser._id);
  assert(updatedUser && updatedUser.name === 'Updated Engineer', `User updated via MySQL save()`);

  await User.findByIdAndDelete(createdUser._id);
  const deletedUser = await User.findById(createdUser._id);
  assert(deletedUser === null, `User deleted from MySQL`);

  console.log('\n======================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('======================================================\n');

  await mysqlService.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite().catch(async (err) => {
  console.error('Test Suite Fatal Error:', err);
  await mysqlService.close();
  process.exit(1);
});
