CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`language` enum('en','uk','ru') NOT NULL DEFAULT 'en',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `libraryContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('email','phone','address','telegram','viber','facebook','instagram','other') NOT NULL,
	`value` varchar(255) NOT NULL,
	`labelEn` varchar(255),
	`labelUk` varchar(255),
	`labelRu` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `libraryContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `libraryInfo` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(100) NOT NULL,
	`valueEn` text,
	`valueUk` text,
	`valueRu` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `libraryInfo_id` PRIMARY KEY(`id`),
	CONSTRAINT `libraryInfo_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `libraryResources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(255) NOT NULL,
	`nameUk` varchar(255) NOT NULL,
	`nameRu` varchar(255) NOT NULL,
	`descriptionEn` text,
	`descriptionUk` text,
	`descriptionRu` text,
	`type` enum('electronic_library','repository','catalog','database','other') NOT NULL,
	`url` varchar(500),
	`keywords` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `libraryResources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userQueries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`conversationId` int,
	`query` text NOT NULL,
	`language` enum('en','uk','ru') NOT NULL,
	`resourcesReturned` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userQueries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `language` enum('en','uk','ru') DEFAULT 'en' NOT NULL;