
-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: tanker_game
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `t_user_ai`
--

DROP TABLE IF EXISTS `t_user_ai`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_user_ai` (
  `employee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `script_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_user_ai`
--

LOCK TABLES `t_user_ai` WRITE;
/*!40000 ALTER TABLE `t_user_ai` DISABLE KEYS */;
INSERT INTO `t_user_ai` VALUES ('W32213','survival-tank.js','/tank-game-api/ai/file/W32213-1788834770690-survival-tank.js','2026-09-08 10:32:50','2026-09-08 10:32:50');
/*!40000 ALTER TABLE `t_user_ai` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_user_score`
--

DROP TABLE IF EXISTS `t_user_score`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_user_score` (
  `employee_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `high_skills` int NOT NULL DEFAULT '0',
  `last_kills` int NOT NULL DEFAULT '0',
  `last_boss_kills` int NOT NULL DEFAULT '0',
  `high_boss_kills` int NOT NULL DEFAULT '0',
  `deaths` int NOT NULL DEFAULT '0',
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`employee_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_user_score`
--

LOCK TABLES `t_user_score` WRITE;
/*!40000 ALTER TABLE `t_user_score` DISABLE KEYS */;
INSERT INTO `t_user_score` VALUES ('W32078',9,9,0,0,2,'2026-09-08 17:47:08','2026-09-08 17:48:23'),('W32213',12,12,0,0,2,'2026-09-08 16:32:33','2026-09-08 16:41:19'),('W32301',4,4,0,0,1,'2026-09-08 17:33:18','2026-09-08 17:33:18');
/*!40000 ALTER TABLE `t_user_score` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `t_user_sync`
--

DROP TABLE IF EXISTS `t_user_sync`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `t_user_sync` (
  `id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `username` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employee_id` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `post_name` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `create_time` datetime DEFAULT NULL,
  `update_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `t_user_sync`
--

LOCK TABLES `t_user_sync` WRITE;
/*!40000 ALTER TABLE `t_user_sync` DISABLE KEYS */;
INSERT INTO `t_user_sync` VALUES ('0fcd617500b84b48b793130307540d2f','超级管理员','17311023005','W00000',NULL,'2026-09-08 17:26:11','2026-09-09 09:33:42'),('5860610eae36dfc3f4f4181c45eb01f5','左仁军','13648112212','W32301','后端','2026-09-08 17:31:37','2026-09-08 17:31:37'),('8dbb7d5d9ed74bc1b91fc4f78e33cba7','刘鹏','17763642410','W32078','前端','2026-09-08 17:31:46','2026-09-08 17:38:52'),('bef9768f6bac4b02b3961e36d76fe890','王清山','17713595587','W32213','前端','2026-09-08 16:24:20','2026-09-08 16:41:28');
/*!40000 ALTER TABLE `t_user_sync` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-09-09  9:51:12
