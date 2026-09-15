CREATE DATABASE IF NOT EXISTS `tanker_game` DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tanker_game`;

CREATE TABLE IF NOT EXISTS `t_battle_record` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `winner_name` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '获胜者坦克名，平局为空',
  `winner_employee_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '获胜者employee_id，平局为空',
  `total_players` INT NOT NULL DEFAULT 0 COMMENT '参与坦克数',
  `game_duration_ms` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '游戏时长(毫秒)',
  `is_draw` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否平局 1=是 0=否',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `t_battle_record_detail` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `record_id` BIGINT UNSIGNED NOT NULL COMMENT '关联 t_battle_record.id',
  `employee_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '员工ID',
  `tank_name` VARCHAR(128) NOT NULL DEFAULT '' COMMENT '坦克名称',
  `score` INT NOT NULL DEFAULT 0 COMMENT '得分',
  `kills` INT NOT NULL DEFAULT 0 COMMENT '击杀数',
  `deaths` INT NOT NULL DEFAULT 0 COMMENT '死亡数',
  `death_reason` VARCHAR(256) NOT NULL DEFAULT '' COMMENT '最后淘汰原因',
  `is_winner` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否获胜者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_record_id` (`record_id`),
  KEY `idx_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
