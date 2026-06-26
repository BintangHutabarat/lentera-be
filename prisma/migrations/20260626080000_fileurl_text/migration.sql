-- Assignment.attachmentUrl: allow base64 data URLs
ALTER TABLE `Assignment` MODIFY COLUMN `attachmentUrl` TEXT NULL;

-- AssignmentSubmission.fileUrl: allow base64 data URLs
ALTER TABLE `AssignmentSubmission` MODIFY COLUMN `fileUrl` TEXT NULL;
