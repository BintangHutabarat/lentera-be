-- Drop old MateriItem columns (type, content, fileName)
ALTER TABLE `MateriItem` DROP COLUMN `type`;
ALTER TABLE `MateriItem` DROP COLUMN `content`;
ALTER TABLE `MateriItem` DROP COLUMN `fileName`;

-- Add new MateriItem columns (title nullable first, body nullable first)
ALTER TABLE `MateriItem` ADD COLUMN `title` VARCHAR(191) NULL;
ALTER TABLE `MateriItem` ADD COLUMN `body` MEDIUMTEXT NULL;

-- Fill existing rows (if any)
UPDATE `MateriItem` SET `title` = '', `body` = '' WHERE `title` IS NULL;

-- Make NOT NULL
ALTER TABLE `MateriItem` MODIFY COLUMN `title` VARCHAR(191) NOT NULL;
ALTER TABLE `MateriItem` MODIFY COLUMN `body` MEDIUMTEXT NOT NULL;

-- Create MateriAttachment table
CREATE TABLE `MateriAttachment` (
    `id` VARCHAR(191) NOT NULL,
    `materiId` VARCHAR(191) NOT NULL,
    `type` ENUM('IMAGE', 'PDF') NOT NULL,
    `content` LONGTEXT NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `order` INT NOT NULL,

    INDEX `MateriAttachment_materiId_order_idx`(`materiId`, `order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `MateriAttachment` ADD CONSTRAINT `MateriAttachment_materiId_fkey`
    FOREIGN KEY (`materiId`) REFERENCES `MateriItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
