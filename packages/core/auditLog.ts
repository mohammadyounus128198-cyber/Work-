// 📜 APPEND-ONLY AUDIT LOG

const STORE_KEY = "omega_audit_log";

/**
 * Appends an entry to the append-only audit log persisted in localStorage.
 *
 * @param entry - The audit entry to append; it is added to the stored array and persisted as JSON
 */
export function appendLog(entry: any) {
  const existing = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
  existing.push(entry);
  localStorage.setItem(STORE_KEY, JSON.stringify(existing));
}

/**
 * Retrieve the persisted audit log from localStorage.
 *
 * @returns The audit log as an array of entries; returns an empty array if no log is stored.
 */
export function getLog() {
  return JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
}

/**
 * Creates and triggers download of the current audit log as a JSON file named "omega_audit_log.json".
 *
 * The file contains the log serialized with two-space indentation.
 */
export function exportLog() {
  const data = getLog();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "omega_audit_log.json";
  a.click();
}
