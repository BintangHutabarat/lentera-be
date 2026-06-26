-- Add academicYearId column to Class
ALTER TABLE `Class` ADD COLUMN `academicYearId` VARCHAR(191) NOT NULL;

-- Add new unique FIRST (covers schoolId prefix, so existing FK can use it)
ALTER TABLE `Class` ADD UNIQUE INDEX `Class_schoolId_name_academicYearId_key`(`schoolId`, `name`, `academicYearId`);

-- Now safe to drop old unique
ALTER TABLE `Class` DROP INDEX `Class_schoolId_name_key`;

-- Add FK: Class -> AcademicYear
ALTER TABLE `Class` ADD CONSTRAINT `Class_academicYearId_fkey` FOREIGN KEY (`academicYearId`) REFERENCES `AcademicYear`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add new FinalGrade unique FIRST (covers classSubjectId prefix, so existing FK can use it)
ALTER TABLE `FinalGrade` ADD UNIQUE INDEX `FinalGrade_classSubjectId_studentId_academicYearId_key`(`classSubjectId`, `studentId`, `academicYearId`);

-- Now safe to drop old unique
ALTER TABLE `FinalGrade` DROP INDEX `FinalGrade_classSubjectId_studentId_academicYearId_semester_key`;

-- Drop semester column
ALTER TABLE `FinalGrade` DROP COLUMN `semester`;
