CREATE DATABASE IF NOT EXISTS `tanker_game` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tanker_game`;

CREATE TABLE IF NOT EXISTS `t_user_ai` (
  `employee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `file_name` VARCHAR(255) DEFAULT NULL,
  `script_path` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME DEFAULT NULL,
  `update_time` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
