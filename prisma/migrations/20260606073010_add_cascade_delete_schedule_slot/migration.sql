-- DropForeignKey
ALTER TABLE `scheduleslot` DROP FOREIGN KEY `ScheduleSlot_classId_fkey`;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
