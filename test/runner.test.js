import test from "node:test";
import assert from "node:assert/strict";
import {
  TASKS,
  CONDITIONS,
  assignConditions,
  seededShuffle,
  taskOrderFor,
  generateParticipantId,
  toCSV,
} from "../harness/runner.js";

test("assignConditions balances over 2 participants", () => {
  const a = assignConditions(0);
  const b = assignConditions(1);
  for (const task of TASKS) {
    assert.notEqual(a[task], b[task], `task "${task}" should differ between participants 0 and 1`);
    assert.ok([CONDITIONS.TODAY, CONDITIONS.REDESIGN].includes(a[task]));
    assert.ok([CONDITIONS.TODAY, CONDITIONS.REDESIGN].includes(b[task]));
  }
});

test("assignConditions balances over 4 participants", () => {
  const counts = {};
  for (const task of TASKS) counts[task] = { today: 0, redesign: 0 };
  for (let p = 0; p < 4; p++) {
    const assignment = assignConditions(p);
    for (const task of TASKS) {
      counts[task][assignment[task]]++;
    }
  }
  for (const task of TASKS) {
    assert.equal(counts[task].today, 2, `task "${task}" today count`);
    assert.equal(counts[task].redesign, 2, `task "${task}" redesign count`);
  }
});

test("seeded shuffle is deterministic per id", () => {
  const order1 = seededShuffle(TASKS, "P-ABCDEF");
  const order2 = seededShuffle(TASKS, "P-ABCDEF");
  assert.deepEqual(order1, order2);
});

test("seeded shuffle differs across different seeds (in general)", () => {
  const order1 = seededShuffle(TASKS, "P-AAAAAA");
  const order2 = seededShuffle(TASKS, "P-ZZZZZZ");
  // Not a strict requirement of the spec, but a sanity check that the seed
  // actually influences the outcome.
  assert.notDeepEqual(order1, order2);
});

test("seeded shuffle is a permutation of the input", () => {
  const order = seededShuffle(TASKS, "P-QQQQQQ");
  assert.equal(order.length, TASKS.length);
  assert.deepEqual([...order].sort(), [...TASKS].sort());
});

test("taskOrderFor is deterministic per participant id", () => {
  const id = "P-K3F9QZ";
  assert.deepEqual(taskOrderFor(id), taskOrderFor(id));
});

test("generateParticipantId matches P- + 6 base32 chars", () => {
  for (let i = 0; i < 20; i++) {
    const id = generateParticipantId();
    assert.match(id, /^P-[A-Z2-7]{6}$/);
  }
});

test("toCSV quotes commas, quotes and newlines per RFC 4180", () => {
  const rows = [
    { a: "plain", b: "has,comma", c: 'has"quote', d: "has\nnewline" },
  ];
  const csv = toCSV(rows);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "a,b,c,d");
  assert.equal(lines[1], 'plain,"has,comma","has""quote","has\nnewline"');
});

test("toCSV handles multiple rows and empty/null values", () => {
  const rows = [
    { x: 1, y: "one" },
    { x: 2, y: null },
    { x: 3, y: undefined },
  ];
  const csv = toCSV(rows);
  const lines = csv.split("\r\n");
  assert.equal(lines[0], "x,y");
  assert.equal(lines[1], "1,one");
  assert.equal(lines[2], "2,");
  assert.equal(lines[3], "3,");
});

test("toCSV returns empty string for no rows", () => {
  assert.equal(toCSV([]), "");
});
