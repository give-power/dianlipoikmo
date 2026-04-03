import { prisma } from "@/lib/prisma";

type AuditAction = "update" | "delete" | "create";

interface AuditEntry {
  tableName: string;
  recordId: number;
  field: string;
  oldValue?: string | null;
  newValue?: string | null;
  operatorId?: string;
  action?: AuditAction;
}

export async function writeAudit(entries: AuditEntry | AuditEntry[]) {
  const rows = Array.isArray(entries) ? entries : [entries];
  await prisma.auditLog.createMany({
    data: rows.map((e) => ({
      tableName: e.tableName,
      recordId: e.recordId,
      field: e.field,
      oldValue: e.oldValue ?? null,
      newValue: e.newValue ?? null,
      operatorId: e.operatorId ?? "admin",
      action: e.action ?? "update",
    })),
  });
}

/** 比较对象新旧值，自动生成 AuditEntry 列表（只记录有变化的字段） */
export function diffToAudit(
  tableName: string,
  recordId: number,
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>,
  operatorId = "admin"
): AuditEntry[] {
  return Object.keys(newObj)
    .filter((k) => String(oldObj[k]) !== String(newObj[k]))
    .map((k) => ({
      tableName,
      recordId,
      field: k,
      oldValue: oldObj[k] != null ? String(oldObj[k]) : null,
      newValue: newObj[k] != null ? String(newObj[k]) : null,
      operatorId,
      action: "update",
    }));
}
