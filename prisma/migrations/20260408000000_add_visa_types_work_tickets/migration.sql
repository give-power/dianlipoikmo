-- Migration: add_visa_types_work_tickets
-- Adds VisaTypeConfig, WorkTicketTypeConfig, WorkTicket tables
-- and extraData column to Visa

-- ─── VisaTypeConfig ──────────────────────────────────────────────────────────
CREATE TABLE "VisaTypeConfig" (
  "id"          SERIAL PRIMARY KEY,
  "code"        TEXT NOT NULL,
  "name"        TEXT NOT NULL,
  "color"       TEXT NOT NULL DEFAULT '#60a5fa',
  "bgColor"     TEXT NOT NULL DEFAULT 'rgba(59,130,246,0.12)',
  "fieldSchema" JSONB,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "VisaTypeConfig_code_key" ON "VisaTypeConfig"("code");

-- Seed built-in types
INSERT INTO "VisaTypeConfig" ("code","name","color","bgColor","sortOrder") VALUES
  ('quantity', '工程量签证单', '#60a5fa', 'rgba(59,130,246,0.12)', 0),
  ('period',   '工期签证单',   '#a78bfa', 'rgba(167,139,250,0.12)', 1);

-- ─── Visa.extraData ───────────────────────────────────────────────────────────
ALTER TABLE "Visa" ADD COLUMN IF NOT EXISTS "extraData" JSONB;

-- ─── WorkTicketTypeConfig ─────────────────────────────────────────────────────
CREATE TABLE "WorkTicketTypeConfig" (
  "id"           SERIAL PRIMARY KEY,
  "code"         TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "color"        TEXT NOT NULL DEFAULT '#34d399',
  "bgColor"      TEXT NOT NULL DEFAULT 'rgba(52,211,153,0.12)',
  "defaultRisks" TEXT,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "WorkTicketTypeConfig_code_key" ON "WorkTicketTypeConfig"("code");

-- Seed built-in types
INSERT INTO "WorkTicketTypeConfig" ("code","name","color","bgColor","defaultRisks","sortOrder") VALUES
  (
    'electrical',
    '电气施工作业票',
    '#34d399',
    'rgba(52,211,153,0.12)',
    E'1.触电伤害\n2.高处坠落\n3.机械伤害\n4.物体打击\n5.电弧灼伤\n6.电缆损伤\n7.设备损坏\n8.火灾\n9.窒息\n10.中暑\n11.交通事故\n12.坍塌\n13.其他',
    0
  ),
  (
    'civil',
    '土建施工作业票',
    '#fb923c',
    'rgba(251,146,60,0.12)',
    E'1.高处坠落\n2.物体打击\n3.机械伤害\n4.坍塌\n5.触电伤害\n6.火灾\n7.窒息\n8.中暑\n9.交通事故\n10.起重伤害\n11.淹溺\n12.爆炸\n13.灼烫\n14.压埋\n15.其他伤害\n16.临时用电',
    1
  );

-- ─── WorkTicket ───────────────────────────────────────────────────────────────
CREATE TABLE "WorkTicket" (
  "id"              SERIAL PRIMARY KEY,
  "ticketNo"        TEXT,
  "type"            TEXT NOT NULL,
  "projectName"     TEXT NOT NULL,
  "projectCode"     TEXT,
  "workTeam"        TEXT NOT NULL,
  "riskLevel"       TEXT NOT NULL DEFAULT '四级',
  "workContent"     TEXT NOT NULL,
  "workLocation"    TEXT NOT NULL,
  "workerCount"     INTEGER NOT NULL DEFAULT 1,
  "plannedStart"    TIMESTAMP(3),
  "plannedEnd"      TIMESTAMP(3),
  "actualStart"     TIMESTAMP(3),
  "actualEnd"       TIMESTAMP(3),
  "foreman"         TEXT NOT NULL,
  "supervisor"      TEXT,
  "assignments"     TEXT,
  "memberChanges"   TEXT,
  "risks"           TEXT,
  "preconditions"   JSONB,
  "preControls"     JSONB,
  "fieldChanges"    TEXT,
  "signerForeman"   TEXT,
  "signerApprover"  TEXT,
  "signerPermitter" TEXT,
  "permitTime"      TIMESTAMP(3),
  "permitMethod"    TEXT,
  "endTime"         TIMESTAMP(3),
  "note"            TEXT,
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
