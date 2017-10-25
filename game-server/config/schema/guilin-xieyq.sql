/*
Navicat MySQL Data Transfer

Source Server         : zipai
Source Server Version : 50717
Source Host           : localhost:3306
Source Database       : guilin

Target Server Type    : MYSQL
Target Server Version : 50717
File Encoding         : 65001

Date: 2017-05-15 17:30:09
*/

SET FOREIGN_KEY_CHECKS=0;

-- ----------------------------
-- Table structure for friend
-- ----------------------------
DROP TABLE IF EXISTS `friend`;
CREATE TABLE `friend` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `user1` bigint(20) unsigned NOT NULL DEFAULT '0',
  `user2` bigint(20) unsigned NOT NULL DEFAULT '0',
  `status` smallint(6) unsigned DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_USER_ID1` (`user1`),
  KEY `INDEX_PALYER_USER_ID2` (`user2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Table structure for mail
-- ----------------------------
DROP TABLE IF EXISTS `mail`;
CREATE TABLE `mail` (
  `id` int(8) NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL,
  `content` varchar(1024) NOT NULL,
  `time` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- ----------------------------
-- Table structure for resultlog
-- ----------------------------
DROP TABLE IF EXISTS `resultlog`;
CREATE TABLE `resultlog` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `time` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `userID` bigint(20) unsigned NOT NULL DEFAULT '0',
  `totalID` bigint(20) unsigned NOT NULL DEFAULT '0',
  `type` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `fx` bigint(20) unsigned NOT NULL DEFAULT '0',
  `zs` bigint(20) unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_RESULT_ID` (`totalID`)
) ENGINE=InnoDB AUTO_INCREMENT=110 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Table structure for totalresult
-- ----------------------------
DROP TABLE IF EXISTS `totalresult`;
CREATE TABLE `totalresult` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `time` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `fightNumber` smallint(6) unsigned DEFAULT '0',
  `roomID` char(5) COLLATE utf8_unicode_ci DEFAULT '0',
  `user1` bigint(20) unsigned NOT NULL DEFAULT '0',
  `user2` bigint(20) unsigned NOT NULL DEFAULT '0',
  `user3` bigint(20) unsigned NOT NULL DEFAULT '0',
  `user1Result` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `user2Result` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `user3Result` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_USER_ID1` (`user1`),
  KEY `INDEX_PALYER_USER_ID2` (`user2`),
  KEY `INDEX_PALYER_USER_ID3` (`user3`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS `user`;
CREATE TABLE `user` (
  `userID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `openid` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `nickname` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `sex` smallint(6) unsigned DEFAULT '0',
  `province` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `city` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `country` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `headimgurl` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `privilege` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `unionid` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `gold` bigint(20) unsigned NOT NULL DEFAULT '0',
  `fightCardCount` bigint(20) unsigned NOT NULL DEFAULT '0',
  `faceID` smallint(6) unsigned DEFAULT '0',
  `registerDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `lastLoginDate` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `registerIP` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `lastLoginIP` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `phoneNo` varchar(11) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `isCanJoin` smallint(6) unsigned DEFAULT '0',
  `isInvite` smallint(6) unsigned DEFAULT '0',
  `isAddFriend` smallint(6) unsigned DEFAULT '0',
  `fightNum` int(12) DEFAULT '0',
  `winNum` int(12) DEFAULT '0',
  `dianPaoNum` int(12) DEFAULT '0',
  `zimoNum` int(12) DEFAULT '0',
  `wechatID` varchar(20) COLLATE utf8_unicode_ci DEFAULT '',
  PRIMARY KEY (`userID`),
  UNIQUE KEY `INDEX_GAME_NAME` (`nickname`),
  KEY `INDEX_PALYER_USER_ID` (`userID`)
) ENGINE=InnoDB AUTO_INCREMENT=982 DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

-- ----------------------------
-- Table structure for wxpay
-- ----------------------------
DROP TABLE IF EXISTS `wxpay`;
CREATE TABLE `wxpay` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `userID` bigint(20) unsigned NOT NULL DEFAULT '0',
  `appid` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `mch_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `nonce_str` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `sign` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `openid` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `trade_type` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `bank_type` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `total_fee` bigint(20) unsigned NOT NULL DEFAULT '0',
  `cash_fee` bigint(20) unsigned NOT NULL DEFAULT '0',
  `transaction_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `out_trade_no` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',
  `time_end` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  PRIMARY KEY (`id`),
  KEY `INDEX_TRANSACTION_ID` (`transaction_id`),
  KEY `INDEX_PALYER_USER_ID` (`userID`),
  KEY `INDEX_OUT_TRADE_NO` (`out_trade_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;
