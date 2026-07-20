const storageKey = "quisqueyatech-assessment-visitor";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VisitorStorage = Pick<Storage, "getItem" | "setItem">;

export function getAssessmentVisitorId(
  storage: VisitorStorage,
  createId: () => string = () => crypto.randomUUID(),
) {
  try {
    const existing = storage.getItem(storageKey);
    if (existing && uuidPattern.test(existing)) return existing;
    const created = createId();
    if (!uuidPattern.test(created)) throw new Error("Invalid visitor id");
    storage.setItem(storageKey, created);
    return created;
  } catch {
    return createId();
  }
}
