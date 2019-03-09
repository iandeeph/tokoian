CREATE DATABASE  IF NOT EXISTS `bengkelb_bandotcom` /*!40100 DEFAULT CHARACTER SET latin1 */;
USE `bengkelb_bandotcom`;
-- MySQL dump 10.13  Distrib 5.5.58, for debian-linux-gnu (i686)
--
-- Host: 127.0.0.1    Database: bengkelb_bandotcom
-- ------------------------------------------------------
-- Server version	5.5.58-0ubuntu0.14.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `tb_admin`
--

DROP TABLE IF EXISTS `tb_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_admin` (
  `idadmin` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(45) DEFAULT NULL,
  `password` varchar(45) DEFAULT NULL,
  `nama` varchar(45) DEFAULT NULL,
  `priv` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`idadmin`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_admin`
--

LOCK TABLES `tb_admin` WRITE;
/*!40000 ALTER TABLE `tb_admin` DISABLE KEYS */;
INSERT INTO `tb_admin` VALUES (1,'iandeeph','7b0e109ff877b569c497a09002492441','ian','1');
/*!40000 ALTER TABLE `tb_admin` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_item`
--

DROP TABLE IF EXISTS `tb_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_item` (
  `iditem` int(11) NOT NULL AUTO_INCREMENT,
  `idkode` int(11) NOT NULL,
  `hargabeli` decimal(65,0) DEFAULT NULL,
  `hargajual` decimal(65,0) DEFAULT NULL,
  `jumlah` int(11) NOT NULL,
  PRIMARY KEY (`iditem`,`idkode`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_item`
--

LOCK TABLES `tb_item` WRITE;
/*!40000 ALTER TABLE `tb_item` DISABLE KEYS */;
INSERT INTO `tb_item` VALUES (29,26,115000,150000,2),(30,27,185000,235000,6),(37,28,135000,195000,8),(39,29,125000,225000,9),(40,30,175000,225000,9),(45,42,175000,250000,8),(46,43,250000,300000,10),(47,44,250000,350000,10),(48,45,175000,225000,5),(49,47,95000,150000,8),(50,48,125000,185000,12),(51,50,135000,175000,5),(52,52,75000,150000,10);
/*!40000 ALTER TABLE `tb_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_kode`
--

DROP TABLE IF EXISTS `tb_kode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_kode` (
  `idkode` int(11) NOT NULL AUTO_INCREMENT,
  `kode` varchar(45) NOT NULL,
  `nama` varchar(45) NOT NULL,
  `merek` varchar(45) DEFAULT NULL,
  `jenis` varchar(45) NOT NULL,
  `deskripsi` text,
  `catatan` text,
  PRIMARY KEY (`idkode`,`kode`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_kode`
--

LOCK TABLES `tb_kode` WRITE;
/*!40000 ALTER TABLE `tb_kode` DISABLE KEYS */;
INSERT INTO `tb_kode` VALUES (26,'BD-SW-TH-70/70','Ban Depan Swallow','Swalow','Tubeles','Ban depan tubles bla bla bla','Kecil tapi tubles'),(27,'BB-SW-KT-120/120','Ban Belakang Swalow Wallow','Swalow','Tubeles','Ban Belakang Tubeles','Kembang Tahu'),(28,'BD-PRL-KA-70/70','Ban Depan Pireli','Pireli','Tubeles','Ban depan pireli tubles uk 70/70','Kembang Alus'),(29,'BD-CRS-KT-70/80','Ban Depan Corsa','Corsa','Tubeles','Ban depan bla bla ','Kembang Tahu'),(30,'BB-PRL-KK-80/90','Ban Belakang Pireli','Pireli','Tubeles','Ban Belakang Bla Bla','Kembang Kasar'),(42,'BD-CRS-KK-70/80','Ban Depan Corsa','Corsa','Tubeles','Ban depan bla bla bla','Kembang Kasar'),(43,'BB-CRS-KTB-120/120','Ban Belakang Corsa Hitam','Corsa','Tubeless','Ban belakang bla bla bla','Kembang Tahu Bulat'),(44,'BB-PRL-KB-110/100','Ban Belakang Pireli','Pireli','Tubeles','Ban belakang bla bla','Kembang Batu'),(45,'BD-PRL-GK-70/60','Ban Depan Pireli','Pireli','Tubeles','Ban depan bla bla bla','Garis Kasar'),(47,'BD-IRC-KB-70/80','Ban depan IRC','IRC','Tubeles','Ban depan IRC','Kembang Biasa'),(48,'BB-IRC-KTD-90/80','Ban Belakang IRC','IRC','Tubeles','Ban Belakang bla bla bla','Kembang Tidak biasa'),(50,'BD-CRS-KTD-90/90','Ban Depan Corsa','Corsa','Tubeles','Ban depan bla bla bla','Ban tidak dikenal'),(52,'BT-CRS-BT-70/70','Ban Tiga Roda 70/70','Corsa','Ban Bukan Tubeles','Ban depan tiga roda','nothing');
/*!40000 ALTER TABLE `tb_kode` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_log`
--

DROP TABLE IF EXISTS `tb_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_log` (
  `idlog` int(11) NOT NULL AUTO_INCREMENT,
  `user` varchar(45) DEFAULT NULL,
  `aksi` varchar(45) DEFAULT NULL,
  `detail` text,
  `tanggal` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`idlog`)
) ENGINE=InnoDB AUTO_INCREMENT=78 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_log`
--

LOCK TABLES `tb_log` WRITE;
/*!40000 ALTER TABLE `tb_log` DISABLE KEYS */;
INSERT INTO `tb_log` VALUES (26,'','Tambah Jenis Barang','ID Kode : 28\nKode Barang : BK-PRL-BT-120/120\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang pireli tuble uk 120/120\nCatatan Barang : Ban Tinggi\n','2018-01-07 09:38:41'),(27,'','Tambah Jenis Barang','ID Kode : 29\nKode Barang : BD-CRS-KT-70/80\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla \nCatatan Barang : Kembang Tahu\n','2018-01-07 09:44:51'),(28,'','Tambah Jenis Barang','ID Kode : 30\nKode Barang : BB-PRL-KK-80/90\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Bla Bla\nCatatan Barang : Kembang Kasar\n','2018-01-07 09:44:51'),(29,'undefined','Tambah Stock','Kode Barang : 30\nHarga Beli : 175000\nHarga Jual : 225000\nJumlah : 11\n','2018-01-07 09:49:39'),(30,'undefined','Tambah Stock','Kode Barang : 27\nHarga Beli : 185000\nHarga Jual : 235000\nJumlah : 12\n','2018-01-07 09:49:39'),(31,'undefined','Tambah Stock','Kode Barang : 29\nHarga Beli : 125000\nHarga Jual : 225000\nJumlah : 9\n','2018-01-07 09:49:39'),(32,'undefined','Tambah Stock','Kode Barang : 28\nHarga Beli : 135000\nHarga Jual : 195000\nJumlah : 10\n','2018-01-07 09:49:39'),(33,'undefined','Tambah Stock','Kode Barang : 26\nHarga Beli : 115000\nHarga Jual : 150000\nJumlah : 20\n','2018-01-07 09:49:39'),(34,'undefined','Tambah Stock Jenis Baru','Kode Barang : BB-MC-KD-120/90\nNama Barang : Ban Belakang Michelin\nJenis Barang : Tubeles\nDeskripsi Barang : Uk 120/90\nCatatan Barang : Kembang Desa Tinggi Langsing\nHarga Beli : 225000\nHarga Jual : 275000\nJumlah : 10\n','2018-01-07 09:49:39'),(35,'undefined','Tambah Stock Jenis Baru','Kode Barang : BD-MC-BP-60/80\nNama Barang : Ban Depan Michelin\nJenis Barang : Tubeles\nDeskripsi Barang : Uk 60/80\nCatatan Barang : Bunga Pasir\nHarga Beli : 175000\nHarga Jual : 225000\nJumlah : 10\n','2018-01-07 09:49:39'),(36,'undefined','Tambah Stock Jenis Baru','Kode Barang : BD-CRS-KK-70/80\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Kembang Kasar\nHarga Beli : 175000\nHarga Jual : 250000\nJumlah : 10\n','2018-01-07 10:04:12'),(37,'undefined','Tambah Stock Jenis Baru','Kode Barang : BB-CRS-KTB-120/120\nNama Barang : Ban Belakang Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah : 12\n','2018-01-07 10:04:12'),(38,'undefined','Tambah Stock Jenis Baru','Kode Barang : BB-PRL-KB-110/100\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla\nCatatan Barang : Kembang Batu\nHarga Beli : 250000\nHarga Jual : 350000\nJumlah : 12\n','2018-01-07 10:09:10'),(39,'undefined','Tambah Stock Jenis Baru','Kode Barang : BD-PRL-GK-70/60\nNama Barang : Ban Depan Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Garis Kasar\nHarga Beli : 175000\nHarga Jual : 225000\nJumlah : 12\n','2018-01-07 10:09:10'),(40,'undefined','Tambah Stock Jenis Baru','Kode Barang : BD-IRC-KB-70/80\nNama Barang : Ban depan IRC\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan IRC\nCatatan Barang : Kembang Biasa\nHarga Beli : 95000\nHarga Jual : 150000\nJumlah : 11\n','2018-01-07 10:14:00'),(41,'undefined','Tambah Stock Jenis Baru','Kode Barang : BB-IRC-KTD-90/80\nNama Barang : Ban Belakang IRC\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang bla bla bla\nCatatan Barang : Kembang Tidak biasa\nHarga Beli : 125000\nHarga Jual : 185000\nJumlah : 12\n','2018-01-07 10:14:00'),(42,'undefined','Tambah Stock Jenis Baru','Kode Barang : BD-CRS-KTD-90/90\nMerek Barang : Corsa\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Ban tidak dikenal\nHarga Beli : 135000\nHarga Jual : 175000\nJumlah : 9\n','2018-01-07 10:49:25'),(43,'','Transaksi Kasir','Order ID : GOQHeZAfSA\nID Kode : 48\nKode Barang : BB-IRC-KTD-90/80\nMerek Barang : IRC\nNama Barang : Ban Belakang IRC\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang bla bla bla\nCatatan Barang : Kembang Tidak biasa\nHarga Jual : undefined\nJumlah : 1\nOngkos : undefined\nBiaya Lain : undefined','2018-01-12 18:11:45'),(44,'','Transaksi Kasir','Order ID : utVasd5S3v\nID Kode : 48\nKode Barang : BB-IRC-KTD-90/80\nMerek Barang : IRC\nNama Barang : Ban Belakang IRC\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang bla bla bla\nCatatan Barang : Kembang Tidak biasa\nHarga Jual : undefined\nJumlah : 1\nOngkos : undefined\nBiaya Lain : undefined','2018-01-12 18:13:29'),(45,'','Transaksi Kasir','Order ID : 6RZFt9Rz3l\nID Kode : 44\nKode Barang : BB-PRL-KB-110/100\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla\nCatatan Barang : Kembang Batu\nHarga Jual : undefined\nJumlah : 1\nOngkos : undefined\nBiaya Lain : undefined','2018-01-12 18:28:17'),(46,'','Transaksi Kasir','Order ID : EnmQeBfFBE\nID Kode : 30\nKode Barang : BB-PRL-KK-80/90\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Bla Bla\nCatatan Barang : Kembang Kasar\nHarga Jual : undefined\nJumlah : 1\nOngkos : 30000\nBiaya Lain : 5000','2018-01-12 18:44:50'),(47,'','Transaksi Kasir','Order ID : QIkzyzizb7\nID Kode : 27\nKode Barang : BB-SW-KT-120/120\nMerek Barang : Swalow\nNama Barang : Ban Belakang Swalow\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Tubeles\nCatatan Barang : Kembang Tahu\nHarga Jual : 235000\nJumlah : 5\nOngkos : 50000\nBiaya Lain : 10000','2018-01-12 18:47:34'),(48,'','Transaksi Kasir','Order ID : QIkzyzizb7\nID Kode : 29\nKode Barang : BD-CRS-KT-70/80\nMerek Barang : Corsa\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla \nCatatan Barang : Kembang Tahu\nHarga Jual : 225000\nJumlah : 3\nOngkos : 50000\nBiaya Lain : 10000','2018-01-12 18:47:34'),(49,'','Transaksi Kasir','Order ID : QIkzyzizb7\nID Kode : 28\nKode Barang : BD-PRL-KA-70/70\nMerek Barang : Pireli\nNama Barang : Ban Depan Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan pireli tubles uk 70/70\nCatatan Barang : Kembang Alus\nHarga Jual : 195000\nJumlah : 4\nOngkos : 50000\nBiaya Lain : 10000','2018-01-12 18:47:34'),(50,'','Transaksi Kasir','Order ID : iuGPMbdnnZ\nID Kode : 27\nKode Barang : BB-SW-KT-120/120\nMerek Barang : Swalow\nNama Barang : Ban Belakang Swalow\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Tubeles\nCatatan Barang : Kembang Tahu\nHarga Jual : 235000\nJumlah : 1\nOngkos : 35000\nBiaya Lain : 15000','2018-01-14 02:40:11'),(51,'','Transaksi Kasir','Order ID : iuGPMbdnnZ\nID Kode : 42\nKode Barang : BD-CRS-KK-70/80\nMerek Barang : Corsa\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Kembang Kasar\nHarga Jual : 250000\nJumlah : 2\nOngkos : 35000\nBiaya Lain : 15000','2018-01-14 02:40:11'),(52,'','Transaksi Kasir','Order ID : iuGPMbdnnZ\nID Kode : 47\nKode Barang : BD-IRC-KB-70/80\nMerek Barang : IRC\nNama Barang : Ban depan IRC\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan IRC\nCatatan Barang : Kembang Biasa\nHarga Jual : 150000\nJumlah : 3\nOngkos : 35000\nBiaya Lain : 15000','2018-01-14 02:40:11'),(53,'','Transaksi Kasir','Order ID : iuGPMbdnnZ\nID Kode : 50\nKode Barang : BD-CRS-KTD-90/90\nMerek Barang : Corsa\nNama Barang : Ban Depan Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Ban tidak dikenal\nHarga Jual : 175000\nJumlah : 4\nOngkos : 35000\nBiaya Lain : 15000','2018-01-14 02:40:11'),(54,'undefined','Tambah Stock Jenis Baru','Kode Barang : BT-CRS-BT-70/70\nMerek Barang : Corsa\nNama Barang : Ban Tiga Roda 70/70\nJenis Barang : Ban Bukan Tubeles\nDeskripsi Barang : Ban depan tiga roda\nCatatan Barang : nothing\nHarga Beli : 75000\nHarga Jual : 150000\nJumlah : 10','2018-01-14 04:05:41'),(55,'','Tambah Stock','Kode Barang : 44\nHarga Beli : 250000\nHarga Jual : 350000\nJumlah : 3','2018-01-14 07:04:48'),(56,'','Tambah Stock','Kode Barang : 43\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah : 3','2018-01-14 07:35:57'),(57,'','Tambah Stock','Kode Barang : 43\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah : 15','2018-01-14 07:38:27'),(58,'','Tambah Stock','Kode Barang : 43\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah : 2','2018-01-14 07:38:52'),(59,'','Tambah Stock','Kode Barang : 44\nHarga Beli : 250000\nHarga Jual : 350000\nJumlah : 12','2018-01-14 07:39:10'),(60,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah Baru : 15','2018-01-14 14:26:54'),(61,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250000\nHarga Jual : 300000\nJumlah Baru : 10','2018-01-14 14:32:34'),(62,'undefined','Edit Jumlah Stock','Kode Barang : BD-PRL-GK-70/60\nMerek Barang : Pireli\nNama Barang : Ban Depan Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Garis Kasar\nHarga Beli : 175000\nHarga Jual : 225000\nJumlah Baru : 10','2018-01-14 15:06:42'),(63,'undefined','Edit Jumlah Stock','Kode Barang : BD-PRL-GK-70/60\nMerek Barang : Pireli\nNama Barang : Ban Depan Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan bla bla bla\nCatatan Barang : Garis Kasar\nHarga Beli : 175000\nHarga Jual : 225000\nJumlah Baru : 5','2018-01-14 15:07:57'),(64,'undefined','Edit Jumlah Stock','Kode Barang : BD-SW-TH-70/70\nMerek Barang : Swalow\nNama Barang : Ban Depan Swallow\nJenis Barang : Tubeles\nDeskripsi Barang : Ban depan tubles bla bla bla\nCatatan Barang : Kecil tapi tubles\nHarga Beli : 115000\nHarga Jual : 150000\nJumlah Baru : 2','2018-01-14 15:08:55'),(65,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa Hitam\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250,000\nHarga Jual : 300,000','2018-01-14 16:51:49'),(66,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa Hitam\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250,000\nHarga Jual : 300,000','2018-01-14 16:57:31'),(67,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa Hitam\nJenis Barang : Tubeless\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 120.000\nHarga Jual : 300,000','2018-01-14 16:57:46'),(68,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa Hitam\nJenis Barang : Tubeless\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 120.000\nHarga Jual : 300,000','2018-01-14 16:59:05'),(69,'undefined','Edit Jumlah Stock','Kode Barang : BB-CRS-KTB-120/120\nMerek Barang : Corsa\nNama Barang : Ban Belakang Corsa Hitam\nJenis Barang : Tubeless\nDeskripsi Barang : Ban belakang bla bla bla\nCatatan Barang : Kembang Tahu Bulat\nHarga Beli : 250.000\nHarga Jual : 300,000','2018-01-14 16:59:12'),(70,'undefined','Edit Jumlah Stock','Kode Barang : BB-SW-KT-120/120\nMerek Barang : Swalow\nNama Barang : Ban Belakang Swalow Wallow\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Tubeles\nCatatan Barang : Kembang Tahu\nHarga Beli : 185,000\nHarga Jual : 235,000','2018-01-14 16:59:44'),(71,'','Transaksi Kasir','Order ID : 7e2I09MfXw\nID Kode : 44\nKode Barang : BB-PRL-KB-110/100\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla\nCatatan Barang : Kembang Batu\nHarga Jual : 350000\nJumlah : 1\nOngkos : 25000\nBiaya Lain : 15000','2018-01-14 18:05:12'),(72,'','Transaksi Kasir','Order ID : cMSgqfWSSP\nID Kode : 44\nKode Barang : BB-PRL-KB-110/100\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban belakang bla bla\nCatatan Barang : Kembang Batu\nHarga Jual : 350000\nJumlah : 1\nOngkos : 25000\nBiaya Lain : 10000','2018-01-14 18:10:25'),(73,'','Transaksi Kasir','Order ID : JgdnuHmUZx\nID Kode : 30\nKode Barang : BB-PRL-KK-80/90\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Bla Bla\nCatatan Barang : Kembang Kasar\nHarga Jual : 225000\nJumlah : 1\nOngkos : 50000\nBiaya Lain : 10000','2018-01-14 18:23:41'),(74,'','Transaksi Kasir','Order ID : ph7Zc5odXA\nID Kode : 30\nKode Barang : BB-PRL-KK-80/90\nMerek Barang : Pireli\nNama Barang : Ban Belakang Pireli\nJenis Barang : Tubeles\nDeskripsi Barang : Ban Belakang Bla Bla\nCatatan Barang : Kembang Kasar\nHarga Jual : 225000\nJumlah : 1\nOngkos : 50000\nBiaya Lain : 15000','2018-01-14 18:25:19'),(75,'ian','User Login','Username : iandeeph\nNama : ian','2018-01-17 16:35:02'),(76,'ian','User Login','Username : iandeeph\nNama : ian','2018-01-17 16:51:51'),(77,'ian','User Login','Username : iandeeph\nNama : ian','2018-01-17 16:52:29');
/*!40000 ALTER TABLE `tb_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tb_trx`
--

DROP TABLE IF EXISTS `tb_trx`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tb_trx` (
  `idtrx` int(11) NOT NULL AUTO_INCREMENT,
  `orderid` varchar(45) DEFAULT NULL,
  `idkode` int(11) NOT NULL,
  `hargabeli` varchar(45) DEFAULT NULL,
  `hargajual` decimal(65,0) DEFAULT NULL,
  `tanggal` datetime NOT NULL,
  `jenistrx` int(11) NOT NULL,
  `jumlah` int(11) DEFAULT NULL,
  `ongkos` decimal(65,0) DEFAULT NULL,
  `lain` decimal(65,0) DEFAULT NULL,
  PRIMARY KEY (`idtrx`)
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tb_trx`
--

LOCK TABLES `tb_trx` WRITE;
/*!40000 ALTER TABLE `tb_trx` DISABLE KEYS */;
INSERT INTO `tb_trx` VALUES (11,NULL,30,'175000',225000,'2018-01-07 16:49:39',1,12,NULL,NULL),(12,NULL,27,'185000',235000,'2018-01-07 16:49:39',1,12,NULL,NULL),(13,NULL,29,'125000',225000,'2018-01-07 16:49:39',1,12,NULL,NULL),(14,NULL,28,'135000',195000,'2018-01-07 16:49:39',1,12,NULL,NULL),(15,NULL,26,'115000',150000,'2018-01-07 16:49:39',1,12,NULL,NULL),(18,NULL,42,'175000',250000,'2018-01-07 17:04:12',1,10,NULL,NULL),(19,NULL,43,'250000',300000,'2018-01-07 17:04:12',1,12,NULL,NULL),(20,NULL,44,'250000',350000,'2018-01-07 17:09:10',1,12,NULL,NULL),(21,NULL,45,'175000',225000,'2018-01-07 17:09:10',1,12,NULL,NULL),(22,NULL,47,'95000',150000,'2018-01-07 17:14:00',1,11,NULL,NULL),(23,NULL,48,'125000',185000,'2018-01-07 17:14:00',1,12,NULL,NULL),(24,NULL,50,'135000',175000,'2018-01-07 17:49:25',1,9,NULL,NULL),(25,'GOQHeZAfSA',48,'125000',185000,'2018-01-13 01:11:45',2,1,50,10),(26,'utVasd5S3v',48,'125000',185000,'2018-01-13 01:13:29',2,1,50,10),(27,'6RZFt9Rz3l',44,'250000',350000,'2018-01-13 01:28:17',2,1,50,10),(28,'EnmQeBfFBE',30,'175000',225000,'2018-01-13 01:44:50',2,1,30000,5000),(29,'QIkzyzizb7',27,'185000',235000,'2018-01-13 01:47:34',2,5,50000,10000),(30,'QIkzyzizb7',29,'125000',225000,'2018-01-13 01:47:34',2,3,50000,10000),(31,'QIkzyzizb7',28,'135000',195000,'2018-01-13 01:47:34',2,4,50000,10000),(32,'iuGPMbdnnZ',27,'185000',235000,'2018-01-14 09:40:11',2,1,35000,15000),(33,'iuGPMbdnnZ',42,'175000',250000,'2018-01-14 09:40:11',2,2,35000,15000),(34,'iuGPMbdnnZ',47,'95000',150000,'2018-01-14 09:40:11',2,3,35000,15000),(35,'iuGPMbdnnZ',50,'135000',175000,'2018-01-14 09:40:11',2,4,35000,15000),(36,NULL,52,'75000',150000,'2018-01-14 11:05:41',1,10,NULL,NULL),(37,NULL,44,'250000',350000,'2018-01-14 14:04:48',1,3,NULL,NULL),(38,NULL,43,'250000',300000,'2018-01-14 14:35:57',1,3,NULL,NULL),(39,NULL,43,'250000',300000,'2018-01-14 14:38:27',1,15,NULL,NULL),(40,NULL,43,'250000',300000,'2018-01-14 14:38:52',1,2,NULL,NULL),(41,NULL,44,'250000',350000,'2018-01-14 14:39:10',1,12,NULL,NULL),(42,NULL,0,'250000',300000,'2018-01-14 21:26:54',3,-2,NULL,NULL),(43,NULL,0,'250000',300000,'2018-01-14 21:32:34',3,-7,NULL,NULL),(44,NULL,45,'175000',225000,'2018-01-14 22:06:42',3,-2,NULL,NULL),(45,NULL,45,'175000',225000,'2018-01-14 22:07:57',3,-5,NULL,NULL),(46,NULL,26,'115000',150000,'2018-01-14 22:08:55',3,-10,NULL,NULL),(47,'7e2I09MfXw',44,'250000',350000,'2018-01-15 01:05:12',2,1,25000,15000),(48,'cMSgqfWSSP',44,'250000',350000,'2018-01-15 01:10:25',2,1,25000,10000),(49,'JgdnuHmUZx',30,'175000',225000,'2018-01-15 01:23:41',2,1,50000,10000),(50,'ph7Zc5odXA',30,'175000',225000,'2018-01-15 01:25:19',2,1,50000,15000);
/*!40000 ALTER TABLE `tb_trx` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-01-18 17:03:41
