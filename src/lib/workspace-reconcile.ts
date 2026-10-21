/**
 * Derive the minimal persisted-row changes from a validated workspace.
 * Extra fields on stored Prisma rows (such as relations and timestamps)
 * do not affect equality; incoming scalar fields are authoritative.
 */
export function planRecordChanges<Current extends object, Desired extends object>(
  current: readonly Current[],
  desired: readonly Desired[],
  currentKey: (row: Current) => string,
  desiredKey: (row: Desired) => string,
) {
  const previous = new Map(current.map((row) => [currentKey(row), row]));
  const nextKeys = new Set<string>();
  const insert: Desired[] = [];
  const update: Desired[] = [];
  for (const row of desired) {
    const key = desiredKey(row);
    if (nextKeys.has(key)) throw new Error("Duplicate record key in workspace reconciliation");
    nextKeys.add(key);
    const before = previous.get(key);
    if (!before) insert.push(row);
    else if (!Object.entries(row as Record<string, unknown>).every(
      ([field, value]) => Object.is((before as Record<string, unknown>)[field], value),
    )) update.push(row);
  }
  return {
    remove: current.map(currentKey).filter((key) => !nextKeys.has(key)),
    insert,
    update,
  };
}

export async function reconcileRecords<Current extends object, Desired extends object>(
  current: readonly Current[],
  desired: readonly Desired[],
  currentKey: (row: Current) => string,
  desiredKey: (row: Desired) => string,
  actions: {
    remove: (keys: string[]) => Promise<unknown>;
    insert: (rows: Desired[]) => Promise<unknown>;
    update: (row: Desired) => Promise<unknown>;
  },
) {
  const changes = planRecordChanges(current, desired, currentKey, desiredKey);
  if (changes.remove.length) await actions.remove(changes.remove);
  if (changes.insert.length) await actions.insert(changes.insert);
  for (const row of changes.update) await actions.update(row);
  return changes;
}
