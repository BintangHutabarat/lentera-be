-- DropForeignKey
ALTER TABLE `forumlike` DROP FOREIGN KEY `ForumLike_userId_fkey`;

-- DropForeignKey
ALTER TABLE `forumpost` DROP FOREIGN KEY `ForumPost_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `forumreply` DROP FOREIGN KEY `ForumReply_authorId_fkey`;

-- DropForeignKey
ALTER TABLE `forumsave` DROP FOREIGN KEY `ForumSave_userId_fkey`;

-- DropForeignKey
ALTER TABLE `notification` DROP FOREIGN KEY `Notification_userId_fkey`;

-- DropIndex
DROP INDEX `ForumLike_userId_fkey` ON `forumlike`;

-- DropIndex
DROP INDEX `ForumPost_authorId_fkey` ON `forumpost`;

-- DropIndex
DROP INDEX `ForumReply_authorId_fkey` ON `forumreply`;

-- DropIndex
DROP INDEX `ForumSave_userId_fkey` ON `forumsave`;

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
