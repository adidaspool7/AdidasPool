-- Update existing self-registered profiles to PLATFORM
UPDATE "Candidate" SET "sourceType" = 'PLATFORM' WHERE "email" = 'demo.candidate@example.com';
