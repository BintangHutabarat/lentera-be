-- DropForeignKey
ALTER TABLE `AssignmentSubmission` DROP FOREIGN KEY `AssignmentSubmission_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `ChapterProgress` DROP FOREIGN KEY `ChapterProgress_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `QuizSession` DROP FOREIGN KEY `QuizSession_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentBadge` DROP FOREIGN KEY `StudentBadge_studentId_fkey`;

-- DropIndex
DROP INDEX `AssignmentSubmission_studentId_fkey` ON `AssignmentSubmission`;

-- AddForeignKey
ALTER TABLE `ChapterProgress` ADD CONSTRAINT `ChapterProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AssignmentSubmission` ADD CONSTRAINT `AssignmentSubmission_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizSession` ADD CONSTRAINT `QuizSession_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentBadge` ADD CONSTRAINT `StudentBadge_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`userId`) ON DELETE CASCADE ON UPDATE CASCADE;
