-- CreateTable
CREATE TABLE "WeighIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "measuredAt" DATETIME NOT NULL,
    "weightKg" REAL NOT NULL,
    "bodyFatPct" REAL,
    "muscleMassKg" REAL,
    "sourceFile" TEXT,
    "rawText" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "WeighIn_measuredAt_idx" ON "WeighIn"("measuredAt");
