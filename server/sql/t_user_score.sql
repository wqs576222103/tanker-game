CREATE TABLE IF NOT EXISTS `t_user_score` (
  `employee_id` VARCHAR(64) NOT NULL PRIMARY KEY,
  `high_score` INT NOT NULL DEFAULT 0,
  `last_kills` INT NOT NULL DEFAULT 0,
  `last_boss_kills` INT NOT NULL DEFAULT 0,
  `create_time` DATETIME DEFAULT NULL,
  `update_time` DATETIME DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

