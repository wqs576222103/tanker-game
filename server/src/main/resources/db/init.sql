CREATE DATABASE IF NOT EXISTS tanker_game DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE tanker_game;

DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
    `id`         BIGINT       NOT NULL AUTO_INCREMENT COMMENT '主键ID',
    `username`   VARCHAR(64)  NOT NULL COMMENT '用户名',
    `password`   VARCHAR(128) NOT NULL COMMENT '密码(加密存储)',
    `nickname`   VARCHAR(64)  DEFAULT NULL COMMENT '昵称',
    `email`      VARCHAR(128) DEFAULT NULL COMMENT '邮箱',
    `avatar`     VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    `status`     TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 1-正常 0-禁用',
    `create_time` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `update_time` DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COMMENT ='用户表';