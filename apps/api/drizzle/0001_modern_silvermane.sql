ALTER TABLE "users" ADD COLUMN "phone" text NOT NULL DEFAULT '000-0000-0000';
UPDATE "users" SET phone = '010-1234-5678' WHERE email = 'test@example.com';
ALTER TABLE "users" ALTER COLUMN "phone" DROP DEFAULT;
