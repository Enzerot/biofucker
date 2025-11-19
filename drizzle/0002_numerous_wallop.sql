ALTER TABLE "supplements" ADD COLUMN "type" text DEFAULT 'regular' NOT NULL;

-- Обновляем существующие данные
UPDATE "supplements" SET "type" = 'sleep_start' WHERE "name" LIKE 'Время засыпания%';
UPDATE "supplements" SET "type" = 'sleep_end' WHERE "name" LIKE 'Время пробуждения%';
