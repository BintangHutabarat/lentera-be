-- DropForeignKey
ALTER TABLE `ForumLike` DROP FOREIGN KEY `ForumLike_userId_fkey`;

-- DropForeignKey
ALTER TABLE `ForumPost` DROP FOREIGN KEY `ForumPost_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `ForumReply` DROP FOREIGN KEY `ForumReply_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `ForumSave` DROP FOREIGN KEY `ForumSave_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropIndex
DROP INDEX `ForumLike_userId_fkey` ON `ForumLike`;

-- DropIndex
DROP INDEX `ForumPost_authorId_fkey` ON `ForumPost`;

-- DropIndex
DROP INDEX `ForumReply_authorId_fkey` ON `ForumReply`;

-- DropIndex
DROP INDEX `ForumSave_userId_fkey` ON `ForumSave`;

-- AddForeignKey
ALTER TABLE `ForumPost` ADD CONSTRAINT `ForumPost_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumReply` ADD CONSTRAINT `ForumReply_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumLike` ADD CONSTRAINT `ForumLike_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ForumSave` ADD CONSTRAINT `ForumSave_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
