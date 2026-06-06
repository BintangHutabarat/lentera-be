-- DropForeignKey
ALTER TABLE `assignmentsubmission` DROP FOREIGN KEY `AssignmentSubmission_assignmentId_fkey`;

-- DropForeignKey
ALTER TABLE `quizquestion` DROP FOREIGN KEY `QuizQuestion_quizId_fkey`;

-- DropForeignKey
ALTER TABLE `quizsession` DROP FOREIGN KEY `QuizSession_quizId_fkey`;

-- DropIndex
DROP INDEX `QuizSession_quizId_fkey` ON `quizsession`;

-- AddForeignKey
ALTER TABLE `AssignmentSubmission` ADD CONSTRAINT `AssignmentSubmission_assignmentId_fkey` FOREIGN KEY (`assignmentId`) REFERENCES `Assignment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizQuestion` ADD CONSTRAINT `QuizQuestion_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QuizSession` ADD CONSTRAINT `QuizSession_quizId_fkey` FOREIGN KEY (`quizId`) REFERENCES `Quiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
