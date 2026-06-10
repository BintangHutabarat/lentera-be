-- DropForeignKey
ALTER TABLE `Chapter` DROP FOREIGN KEY `Chapter_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `ChapterProgress` DROP FOREIGN KEY `ChapterProgress_chapterId_fkey`;

-- DropForeignKey
ALTER TABLE `ScheduleSlot` DROP FOREIGN KEY `ScheduleSlot_subjectId_fkey`;

-- DropIndex
DROP INDEX `ChapterProgress_chapterId_fkey` ON `ChapterProgress`;

-- DropIndex
DROP INDEX `ScheduleSlot_subjectId_fkey` ON `ScheduleSlot`;

-- AddForeignKey
ALTER TABLE `Chapter` ADD CONSTRAINT `Chapter_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChapterProgress` ADD CONSTRAINT `ChapterProgress_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
