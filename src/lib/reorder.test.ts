import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  byPosition,
  moveToIndex,
  planMove,
  planReorder,
  shiftById,
  type Ordered,
} from "./reorder.ts";

/** Apply a plan and read back the resulting order, the way the UI would. */
function apply(rows: Ordered[], id: string, dir: "up" | "down") {
  const plan = planMove(rows, id, dir);
  const next = new Map(rows.map((r) => [r.id, { ...r }]));

  if (plan.kind === "swap") {
    next.get(plan.a.id)!.position = plan.a.position;
    next.get(plan.b.id)!.position = plan.b.position;
  } else if (plan.kind === "renumber") {
    for (const r of plan.rows) next.get(r.id)!.position = r.position;
  }

  return [...next.values()].sort(byPosition).map((r) => r.id).join(",");
}

const rows = (...pairs: [string, number][]): Ordered[] =>
  pairs.map(([id, position]) => ({ id, position }));

describe("shiftById", () => {
  const list = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves an item up one slot", () => {
    assert.deepEqual(shiftById(list, "c", "up")?.map((x) => x.id), ["a", "c", "b"]);
  });

  it("moves an item down one slot", () => {
    assert.deepEqual(shiftById(list, "a", "down")?.map((x) => x.id), ["b", "a", "c"]);
  });

  it("returns null at the edges and for unknown ids", () => {
    assert.equal(shiftById(list, "a", "up"), null);
    assert.equal(shiftById(list, "c", "down"), null);
    assert.equal(shiftById(list, "nope", "up"), null);
  });
});

describe("planMove", () => {
  const normal = rows(["a", 1], ["b", 2], ["c", 3], ["d", 4]);

  it("swaps neighbours", () => {
    assert.equal(apply(normal, "c", "up"), "a,c,b,d");
    assert.equal(apply(normal, "c", "down"), "a,b,d,c");
  });

  it("does nothing at either edge", () => {
    assert.equal(apply(normal, "a", "up"), "a,b,c,d");
    assert.equal(apply(normal, "d", "down"), "a,b,c,d");
    assert.equal(planMove(normal, "a", "up").kind, "none");
  });

  it("ignores unknown ids", () => {
    assert.equal(apply(normal, "missing", "up"), "a,b,c,d");
  });

  it("moves exactly one slot even when positions have gaps", () => {
    const gapped = rows(["a", 10], ["b", 40], ["c", 90], ["d", 91]);
    assert.equal(apply(gapped, "c", "up"), "a,c,b,d");
    assert.equal(apply(gapped, "a", "down"), "b,a,c,d");
  });

  // A plain position swap is a no-op when the two rows tie, which used to make
  // the arrow silently do nothing. Ties are repaired by renumbering instead.
  it("repairs tied positions instead of stalling", () => {
    const tied = rows(["a", 1], ["b", 2], ["c", 2], ["d", 3]);
    assert.equal(planMove(tied, "c", "up").kind, "renumber");
    assert.equal(apply(tied, "c", "up"), "a,c,b,d");
    assert.equal(apply(tied, "b", "down"), "a,c,b,d");
  });

  it("handles an entirely unordered list", () => {
    const flat = rows(["a", 0], ["b", 0], ["c", 0]);
    assert.equal(apply(flat, "c", "up"), "a,c,b");
  });

  it("round trips: down then up restores the order", () => {
    const plan = planMove(normal, "b", "down");
    assert.equal(plan.kind, "swap");
    const moved = normal.map((r) => ({ ...r }));
    if (plan.kind === "swap") {
      moved.find((r) => r.id === plan.a.id)!.position = plan.a.position;
      moved.find((r) => r.id === plan.b.id)!.position = plan.b.position;
    }
    assert.equal(apply(moved, "b", "up"), "a,b,c,d");
  });

  it("walks an item to the front with repeated ups", () => {
    let list = normal.map((r) => ({ ...r }));
    for (let i = 0; i < 5; i++) {
      const plan = planMove(list, "d", "up");
      if (plan.kind === "none") break;
      const next = new Map(list.map((r) => [r.id, { ...r }]));
      if (plan.kind === "swap") {
        next.get(plan.a.id)!.position = plan.a.position;
        next.get(plan.b.id)!.position = plan.b.position;
      } else {
        for (const r of plan.rows) next.get(r.id)!.position = r.position;
      }
      list = [...next.values()];
    }
    assert.equal([...list].sort(byPosition).map((r) => r.id).join(","), "d,a,b,c");
  });
});

describe("drag and drop", () => {
  it("moveToIndex drags a row down the list", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    assert.deepEqual(moveToIndex(list, "a", 2), [
      { id: "b" },
      { id: "c" },
      { id: "a" },
      { id: "d" },
    ]);
  });

  it("moveToIndex drags a row up the list", () => {
    const list = [{ id: "a" }, { id: "b" }, { id: "c" }];
    assert.deepEqual(moveToIndex(list, "c", 0), [
      { id: "c" },
      { id: "a" },
      { id: "b" },
    ]);
  });

  it("moveToIndex clamps a drop past the end", () => {
    const list = [{ id: "a" }, { id: "b" }];
    assert.deepEqual(moveToIndex(list, "a", 99), [{ id: "b" }, { id: "a" }]);
  });

  it("moveToIndex returns null when nothing moves", () => {
    const list = [{ id: "a" }, { id: "b" }];
    assert.equal(moveToIndex(list, "a", 0), null);
    assert.equal(moveToIndex(list, "missing", 1), null);
  });

  it("planReorder writes only the rows that actually shift", () => {
    const rows = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
      { id: "c", position: 3 },
      { id: "d", position: 4 },
    ];
    const plan = planReorder(rows, "a", 2);
    assert.equal(plan.kind, "renumber");
    if (plan.kind !== "renumber") return;
    // d never moves, so it is never written.
    assert.deepEqual(plan.rows, [
      { id: "b", position: 1 },
      { id: "c", position: 2 },
      { id: "a", position: 3 },
    ]);
  });

  it("planReorder repairs tied positions on the way past", () => {
    const rows = [
      { id: "a", position: 1 },
      { id: "b", position: 1 },
      { id: "c", position: 1 },
    ];
    const plan = planReorder(rows, "c", 0);
    assert.equal(plan.kind, "renumber");
    if (plan.kind !== "renumber") return;
    // c lands on position 1, which it already held: moving a and b out from
    // under it is enough to put c first, so c needs no write of its own.
    assert.deepEqual(plan.rows, [
      { id: "a", position: 2 },
      { id: "b", position: 3 },
    ]);
  });

  it("planReorder does nothing when the drop changes no order", () => {
    const rows = [
      { id: "a", position: 1 },
      { id: "b", position: 2 },
    ];
    assert.equal(planReorder(rows, "a", 0).kind, "none");
  });
});
