-- DropForeignKey
ALTER TABLE `chapter` DROP FOREIGN KEY `Chapter_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `chapterprogress` DROP FOREIGN KEY `ChapterProgress_chapterId_fkey`;

-- DropForeignKey
ALTER TABLE `scheduleslot` DROP FOREIGN KEY `ScheduleSlot_subjectId_fkey`;

-- DropIndex
DROP INDEX `ChapterProgress_chapterId_fkey` ON `chapterprogress`;

-- DropIndex
DROP INDEX `ScheduleSlot_subjectId_fkey` ON `scheduleslot`;

-- AddForeignKey
ALTER TABLE `Chapter` ADD CONSTRAINT `Chapter_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChapterProgress` ADD CONSTRAINT `ChapterProgress_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
