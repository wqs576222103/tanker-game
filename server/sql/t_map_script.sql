CREATE DATABASE IF NOT EXISTS `tanker_game` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tanker_game`;

CREATE TABLE IF NOT EXISTS `t_map_script` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` VARCHAR(64) NOT NULL DEFAULT '',
  `map_name` VARCHAR(255) NOT NULL DEFAULT '',
  `file_name` VARCHAR(255) DEFAULT NULL,
  `script_path` VARCHAR(255) DEFAULT NULL,
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
