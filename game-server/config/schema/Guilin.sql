create database guilin;

USE guilin;

# 玩家的全局信息
CREATE TABLE IF NOT EXISTS `user` (
  `userID` bigint(20) unsigned NOT NULL AUTO_INCREMENT,   # 玩家的唯一标识，注册的时候自动生成，不能修改
  `openid` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  用户标识   
  `nickname` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 微信昵称
  `sex` smallint(6) unsigned DEFAULT '0',          # 性别 值为1时是男性，值为2时是女性，值为0时是未知
  `province` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 微信昵称
  `city` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 普通用户个人资料填写的城市
  `country` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 国家，如中国为CN
  `headimgurl` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 用户头像,用户没有头像时该项为空
  `privilege` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 用户特权信息，json数组，如微信沃卡用户为（chinaunicom）
  `unionid` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 用户统一标识。针对一个微信开放平台帐号下的应用，同一用户的unionid是唯一的。
  `shareTimes` smallint(10) unsigned DEFAULT '0',          # 玩家分享次数
  `shareStatus` smallint(6) unsigned DEFAULT '0',          # 0：分享按钮 1：领取按钮

  `gold` bigint(20) unsigned NOT NULL DEFAULT '0',  # 金币数量 
  `fightCardCount` bigint(20) unsigned NOT NULL DEFAULT '0',  # 对战卡数量 
  `registerDate` timestamp NULL DEFAULT CURRENT_TIMESTAMP, # 玩家的注册日期
  `lastLoginDate` timestamp NULL DEFAULT '0000-00-00 00:00:00', # 玩家最后登陆的日期
  `registerIP` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 玩家帐户的注册所在的 IP 地址
  `lastLoginIP` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 玩家最后使用此帐户登陆的 IP 地址
  `phoneNo` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 电话号码
  `wechatID` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 微信号

  `isCanJoin` smallint(6) unsigned DEFAULT '0',          # 是否其他好友直接加入我的房间  0：是  1：否
  `isInvite` smallint(6) unsigned DEFAULT '0',          # 是否接收好友邀请提醒   0：是  1：否    
  `isAddFriend` smallint(6) unsigned DEFAULT '0',          # 是否可以被添加为好友  0：是  1：否
  PRIMARY KEY (`userID`),
  UNIQUE KEY `INDEX_OPENID` (`openid`),
  KEY `INDEX_UNIONID` (`unionid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


CREATE TABLE IF NOT EXISTS `friend` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,   # 玩家的唯一标识，注册的时候自动生成，不能修改
  `user1` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId 发起好友申请的人 friendID
  `user2` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId 被邀请的人
  `status` smallint(6) unsigned DEFAULT '0',         # 0 : 非好友,user1正在请求user2 1 : 是好友
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_USER_ID1` (`user1`),
  KEY `INDEX_PALYER_USER_ID2` (`user2`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


# 每10局战绩
CREATE TABLE IF NOT EXISTS `totalresult` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,   # 玩家的唯一标识，注册的时候自动生成，不能修改
  `time` timestamp NULL DEFAULT '0000-00-00 00:00:00', # 对战时间
  `fightNumber` smallint(6) unsigned DEFAULT '0',     # 打了多少局
  `roomID` smallint(6) unsigned DEFAULT '0',          # 房间ID
  `user1` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId  庄
  `user2` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId  右
  `user3` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId  左
  `user1Result` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # JSON user1 10局战绩
  `user2Result` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # JSON user2 10局战绩
  `user3Result` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # JSON user3 10局战绩
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_USER_ID1` (`user1`),
  KEY `INDEX_PALYER_USER_ID2` (`user2`),
  KEY `INDEX_PALYER_USER_ID3` (`user3`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

# 每一局战绩
CREATE TABLE IF NOT EXISTS `resultlog` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,   # 玩家的唯一标识，注册的时候自动生成，不能修改
  `time` timestamp NULL DEFAULT '0000-00-00 00:00:00', # 对战时间
  `userID` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId  左
  `totalID` bigint(20) unsigned NOT NULL DEFAULT '0',  # resultID  对应10局的ID
  `type` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  哪一种方式赢 
  `fx` bigint(20) unsigned NOT NULL DEFAULT '0',  # 翻醒
  `zs` bigint(20) unsigned NOT NULL DEFAULT '0',  # 子数
  PRIMARY KEY (`id`),
  KEY `INDEX_PALYER_RESULT_ID` (`totalID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

# 微信支付结算
CREATE TABLE IF NOT EXISTS `wxpay` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,   # 自增ID
  `userID` bigint(20) unsigned NOT NULL DEFAULT '0',  # userId   userID为0 该订单还未验证 为1 该订单已经验证
  `appid` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  应用APPID 
  `mch_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  商户号 
  `nonce_str` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  随机字符串   
  `sign` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  签名   
  `openid` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  用户标识   
  `trade_type` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  交易类型   
  `bank_type` varchar(16) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  付款银行     
  `total_fee` bigint(20) unsigned NOT NULL DEFAULT '0',  # 总金额
  `cash_fee` bigint(20) unsigned NOT NULL DEFAULT '0',  # 现金支付金额
  `transaction_id` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  微信支付订单号     
  `out_trade_no` varchar(32) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', #  商户订单号     
  `time_end` timestamp NULL DEFAULT '0000-00-00 00:00:00', # 支付完成时间

  PRIMARY KEY (`id`),
  KEY `INDEX_TRANSACTION_ID` (`transaction_id`),
  KEY `INDEX_PALYER_USER_ID` (`userID`),
  KEY `INDEX_OUT_TRADE_NO` (`out_trade_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;


DROP TABLE IF EXISTS `redeem`;
CREATE TABLE `redeem` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `redeemKey` varchar(10) COLLATE utf8_unicode_ci NOT NULL DEFAULT '', # 兑换码
  `times` smallint(6) unsigned DEFAULT '0',                            # 兑换码兑换次数
  `fightCard` smallint(10) unsigned DEFAULT '0',                       # 兑换码可置换房卡数量
  `IDs` varchar(1024) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',     # 兑换过的人的userID
  `batch` varchar(128) COLLATE utf8_unicode_ci NOT NULL DEFAULT '',    # 批次，运营人员的说明性文字
  PRIMARY KEY (`id`),
  UNIQUE KEY `REDEEM_KEY` (`redeemKey`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

alter table user AUTO_INCREMENT=10000;
set global auto_increment_increment=10;
