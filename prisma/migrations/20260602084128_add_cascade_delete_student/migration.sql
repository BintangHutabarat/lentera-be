-- DropForeignKey
ALTER TABLE `assignmentsubmission` DROP FOREIGN KEY `AssignmentSubmission_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `chapterprogress` DROP FOREIGN KEY `ChapterProgress_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `quizsession` DROP FOREIGN KEY `QuizSession_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `studentbadge` DROP FOREIGN KEY `StudentBadge_studentId_fkey`;

-- DropIndex
DROP INDEX `AssignmentSubmission_studentId_fkey` ON `assignmentsubmission`;

-- AddForeignKey
ALTER TABLE `ChapterProgress` ADD CONSTRAINT `ChapterProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignmentSubmission` ADD CONSTRAINT `AssignmentSubmission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizSession` ADD CONSTRAINT `QuizSession_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentBadge` ADD CONSTRAINT `StudentBadge_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;
