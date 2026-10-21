/** Bound SQL placeholder count and statement size during large saves. */
export const WORKSPACE_MUTATION_BATCH_SIZE = 250;

/** Read children only from parents still present in the desired snapshot.
 * Build a key set once rather than scanning all desired parents per child.
 */
export function retainedChildren<Current, Desired, Child>(
  current: readonly Current[],
  desired: readonly Desired[],
  currentKey: (row: Current) => string,
  desiredKey: (row: Desired) => string,
  children: (row: Current) => readonly Child[],
): Child[] {
  const retainedKeys = new Set(desired.map(desiredKey));
  return current.flatMap((parent) =>
    retainedKeys.has(currentKey(parent)) ? [...children(parent)] : [],
  );
}

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

/** Write in predictable, bounded batches, retaining transaction ownership in
 * the caller so a failed batch rolls back the entire workspace save.
 */
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
  for (let i = 0; i < changes.remove.length; i += WORKSPACE_MUTATION_BATCH_SIZE)
    await actions.remove(changes.remove.slice(i, i + WORKSPACE_MUTATION_BATCH_SIZE));
  for (let i = 0; i < changes.insert.length; i += WORKSPACE_MUTATION_BATCH_SIZE)
    await actions.insert(changes.insert.slice(i, i + WORKSPACE_MUTATION_BATCH_SIZE));
  for (const row of changes.update) await actions.update(row);
  return changes;
}
