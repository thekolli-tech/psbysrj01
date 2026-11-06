import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getActivityGrowthData } from '../src/server/db.ts';

const root = join(import.meta.dirname, '..');
const read = (relPath: string) => readFileSync(join(root, relPath), 'utf8');

test('Activity & Growth Chart: Database aggregation returns valid telemetry for all 4 periods', async () => {
  // Test 7D
  const res7D = await getActivityGrowthData('7D');
  assert.equal(res7D.period, '7D');
  assert.equal(res7D.buckets.length, 7);
  assert.equal(typeof res7D.totalEvents, 'number');
  assert.equal(typeof res7D.peakValue, 'number');
  assert.equal(typeof res7D.dateRange, 'string');
  assert.ok(res7D.buckets.every(b => typeof b.label === 'string' && typeof b.count === 'number'));

  // Test 30D
  const res30D = await getActivityGrowthData('30D');
  assert.equal(res30D.period, '30D');
  assert.equal(res30D.buckets.length, 6);
  assert.equal(typeof res30D.totalEvents, 'number');
  assert.ok(res30D.dateRange.includes('Last 30 Days'));

  // Test 90D
  const res90D = await getActivityGrowthData('90D');
  assert.equal(res90D.period, '90D');
  assert.equal(res90D.buckets.length, 6);
  assert.equal(typeof res90D.totalEvents, 'number');
  assert.ok(res90D.dateRange.includes('Last 90 Days'));

  // Test 1Y
  const res1Y = await getActivityGrowthData('1Y');
  assert.equal(res1Y.period, '1Y');
  assert.equal(res1Y.buckets.length, 12);
  assert.equal(typeof res1Y.totalEvents, 'number');
  assert.ok(res1Y.dateRange.includes('Last 12 Months'));
});

test('Activity & Growth Chart: SuperAdminDashboard implements controlled selectors, interactive states, and tooltips', () => {
  const code = read('src/components/admin/SuperAdminDashboard.tsx');

  // Controlled state
  assert.match(code, /activityPeriod,\s*setActivityPeriod/);
  assert.match(code, /activityData,\s*setActivityData/);
  assert.match(code, /activityLoading,\s*setActivityLoading/);
  assert.match(code, /activityError,\s*setActivityError/);
  assert.match(code, /hoveredPointIndex,\s*setHoveredPointIndex/);

  // Controlled buttons for 7D, 30D, 90D, 1Y
  assert.match(code, /aria-label="Activity chart time period"/);
  assert.match(code, /aria-pressed=\{isActive\}/);
  assert.match(code, /setActivityPeriod\(p\)/);
  assert.match(code, /fetchActivityGrowth\(p\)/);

  // Dynamic Y-axis scale and tick calculation
  assert.match(code, /getNiceMax/);
  assert.match(code, /yTicks\.map/);

  // Dynamic SVG path generation
  assert.match(code, /linePath/);
  assert.match(code, /areaPath/);

  // Crosshair and Interactive Tooltip
  assert.match(code, /strokeDasharray="4 3"/);
  assert.match(code, /activePt\.bucket\.fullDate/);
  assert.match(code, /activePt\.bucket\.breakdown\.audit/);
  assert.match(code, /activePt\.bucket\.breakdown\.posts/);

  // Loading, Error, and Honest Empty States
  assert.match(code, /Loading \{activityPeriod\} activity telemetry/);
  assert.match(code, /Failed to load \{activityPeriod\} activity/);
  assert.match(code, /No Activity Recorded For \{activityPeriod\}/);
});

test('Activity & Growth Chart: Backend server mounts /api/admin/activity-growth endpoint', () => {
  const server = read('server.ts');
  assert.match(server, /app\.get\('\/api\/admin\/activity-growth', requireAdmin/);
  assert.match(server, /getActivityGrowthData\(period\)/);
});
