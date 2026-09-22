-- 在线对战房间记录
CREATE TABLE IF NOT EXISTS `t_online_battle_room` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_id` VARCHAR(32) NOT NULL COMMENT '房间ID',
  `player_count` INT UNSIGNED DEFAULT 0 COMMENT '玩家数量',
  `game_duration_ms` INT UNSIGNED DEFAULT 0 COMMENT '游戏时长(ms)',
  `is_draw` TINYINT(1) DEFAULT 0 COMMENT '是否平局',
  `winner_employee_id` VARCHAR(64) DEFAULT '' COMMENT '胜者员工ID',
  `winner_name` VARCHAR(128) DEFAULT '' COMMENT '胜者名称',
  `status` TINYINT DEFAULT 0 COMMENT '0=等待中 1=游戏中 2=已结束',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_room_id` (`room_id`),
  KEY `idx_status` (`status`),
  KEY `idx_create_time` (`create_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 在线对战玩家记录
CREATE TABLE IF NOT EXISTS `t_online_battle_player` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `room_id` VARCHAR(32) NOT NULL COMMENT '房间ID',
  `employee_id` VARCHAR(64) DEFAULT '' COMMENT '员工ID',
  `username` VARCHAR(128) DEFAULT '' COMMENT '用户名',
  `tank_name` VARCHAR(128) DEFAULT '' COMMENT '坦克名称',
  `team_id` INT DEFAULT 0 COMMENT '队伍ID',
  `score` INT DEFAULT 0 COMMENT '得分',
  `kills` INT DEFAULT 0 COMMENT '击杀数',
  `deaths` INT DEFAULT 0 COMMENT '死亡数',
  `death_reason` VARCHAR(256) DEFAULT '' COMMENT '死亡原因',
  `is_winner` TINYINT(1) DEFAULT 0 COMMENT '是否胜利',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_room_id` (`room_id`),
  KEY `idx_employee_id` (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
