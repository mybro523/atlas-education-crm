-- Course-type names must be unique PER ACADEMY, not across the whole platform.
-- With the global constraint a second client could not create its own
-- "Стандарт" dictionary entry (found by the 20-academy load-test seeding).
DROP INDEX IF EXISTS "course_types_name_key";
CREATE UNIQUE INDEX "course_types_academyId_name_key"
    ON "course_types" ("academyId", "name");
