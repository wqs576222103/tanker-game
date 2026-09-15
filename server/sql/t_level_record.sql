CREATE DATABASE IF NOT EXISTS `tanker_game` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tanker_game`;

CREATE TABLE IF NOT EXISTS `t_level_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '员工工号',
  `username` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '用户名',
  `level_id` INT NOT NULL DEFAULT 0 COMMENT '关卡号',
  `kills` INT NOT NULL DEFAULT 0 COMMENT '击杀数',
  `duration_ms` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '用时(毫秒)',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_level_id` (`level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;