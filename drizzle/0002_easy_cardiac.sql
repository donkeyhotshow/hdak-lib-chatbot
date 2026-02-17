CREATE TABLE `documentChunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(255) NOT NULL,
	`documentTitle` varchar(500) NOT NULL,
	`documentUrl` varchar(1000),
	`chunkIndex` int NOT NULL,
	`content` text NOT NULL,
	`embedding` json,
	`sourceType` enum('catalog','repository','database','other') NOT NULL,
	`language` enum('en','uk','ru') NOT NULL DEFAULT 'uk',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentChunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documentMetadata` (
	`id` int AUTO_INCREMENT NOT NULL,
	`documentId` varchar(255) NOT NULL,
	`title` varchar(500) NOT NULL,
	`url` varchar(1000),
	`author` varchar(255),
	`publishedDate` timestamp,
	`sourceType` enum('catalog','repository','database','other') NOT NULL,
	`language` enum('en','uk','ru') NOT NULL DEFAULT 'uk',
	`totalChunks` int DEFAULT 0,
	`isProcessed` int DEFAULT 0,
	`processingError` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `documentMetadata_id` PRIMARY KEY(`id`),
	CONSTRAINT `documentMetadata_documentId_unique` UNIQUE(`documentId`)
);
