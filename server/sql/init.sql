CREATE DATABASE IF NOT EXISTS tanker_game
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE tanker_game;

-- 坦克死亡日志表
CREATE TABLE IF NOT EXISTS death_log (
  id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  -- 基本信息
  log_type      ENUM('ai', 'player') NOT NULL DEFAULT 'player' COMMENT '日志类型: ai-机器人, player-玩家',
  ai_name       VARCHAR(64)  DEFAULT NULL COMMENT 'AI名称',
  score         INT          NOT NULL DEFAULT 0 COMMENT '死亡时得分',
  death_reason  VARCHAR(128) NOT NULL DEFAULT '' COMMENT '死亡原因',
  -- 玩家状态
  player_hp     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '玩家血量',
  player_max_hp TINYINT UNSIGNED NOT NULL DEFAULT 5 COMMENT '玩家最大血量',
  player_x      FLOAT        NOT NULL DEFAULT 0 COMMENT '玩家X坐标',
  player_y      FLOAT        NOT NULL DEFAULT 0 COMMENT '玩家Y坐标',
  player_dir_x  TINYINT      NOT NULL DEFAULT 0 COMMENT '玩家朝向X',
  player_dir_y  TINYINT      NOT NULL DEFAULT 0 COMMENT '玩家朝向Y',
  has_shield    TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否有护盾 0-无 1-有',
  -- AI 状态 (玩家死亡时为空)
  survival_weight FLOAT   DEFAULT NULL COMMENT 'AI生存权重',
  kill_weight     FLOAT   DEFAULT NULL COMMENT 'AI击杀权重',
  item_weight     FLOAT   DEFAULT NULL COMMENT 'AI物品权重',
  selected_action VARCHAR(32) DEFAULT NULL COMMENT 'AI选择的动作',
  move_dir        VARCHAR(16) DEFAULT NULL COMMENT 'AI移动方向',
  was_dodging     TINYINT(1)  DEFAULT NULL COMMENT '是否在躲避 0-否 1-是',
  -- 环境信息
  enemy_count     INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '敌人数',
  nearby_enemies  JSON         DEFAULT NULL COMMENT '附近敌人详情',
  bullet_count    INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '子弹数',
  threat_bullets  JSON         DEFAULT NULL COMMENT '威胁子弹详情',
  -- 决策日志 & 上下文
  decision_log    JSON         DEFAULT NULL COMMENT 'AI决策历史',
  context         JSON         DEFAULT NULL COMMENT '额外上下文',
  -- 时间
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录时间',

  INDEX idx_log_type (log_type),
  INDEX idx_score (score DESC),
  INDEX idx_created_at (created_at DESC),
  INDEX idx_death_reason (death_reason)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='坦克死亡日志';
