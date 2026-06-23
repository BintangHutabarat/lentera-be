-- CreateTable
CREATE TABLE `MateriItem` (
    `id` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'PDF', 'TEXT') NOT NULL,
    `content` TEXT NOT NULL,
    `fileName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MateriItem_subjectId_createdAt_idx`(`subjectId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MateriItem` ADD CONSTRAINT `MateriItem_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
