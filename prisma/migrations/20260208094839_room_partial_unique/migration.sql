CREATE UNIQUE INDEX "Room_schoolId_nameNormalized_active_key"
ON "Room" ("schoolId", "nameNormalized")
WHERE "deletedAt" IS NULL;
