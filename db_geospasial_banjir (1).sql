-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Nov 03, 2026 at 05:58 PM
-- Server version: 8.4.3
-- PHP Version: 8.3.33

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_geospasial_banjir`
--

-- --------------------------------------------------------

--
-- Table structure for table `kejadian_banjir`
--

CREATE TABLE `kejadian_banjir` (
  `id_kejadian` int NOT NULL,
  `id_lokasi` int NOT NULL,
  `tanggal_kejadian` date NOT NULL,
  `kedalaman_cm` decimal(6,2) DEFAULT NULL,
  `durasi_jam` decimal(6,2) DEFAULT NULL,
  `kondisi_jalan` varchar(100) DEFAULT NULL,
  `keterangan` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `kejadian_banjir`
--

INSERT INTO `kejadian_banjir` (`id_kejadian`, `id_lokasi`, `tanggal_kejadian`, `kedalaman_cm`, `durasi_jam`, `kondisi_jalan`, `keterangan`) VALUES
(1, 1, '2026-01-10', 20.00, 2.00, 'Tergenang', 'Data simulasi'),
(2, 2, '2026-01-15', 35.00, 3.00, 'Sulit dilalui', 'Data simulasi');

-- --------------------------------------------------------

--
-- Table structure for table `laporan`
--

CREATE TABLE `laporan` (
  `id_laporan` int NOT NULL,
  `id_kejadian` int NOT NULL,
  `tanggal_laporan` date NOT NULL,
  `sumber_laporan` varchar(100) DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL,
  `keterangan` text
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `laporan`
--

INSERT INTO `laporan` (`id_laporan`, `id_kejadian`, `tanggal_laporan`, `sumber_laporan`, `foto`, `keterangan`) VALUES
(1, 1, '2026-01-10', 'Observasi simulasi', NULL, 'Laporan contoh'),
(2, 2, '2026-01-15', 'Observasi simulasi', NULL, 'Laporan contoh');

-- --------------------------------------------------------

--
-- Table structure for table `lokasi`
--

CREATE TABLE `lokasi` (
  `id_lokasi` int NOT NULL,
  `nama_lokasi` varchar(100) NOT NULL,
  `alamat` varchar(255) DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `titik_lokasi` point NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `lokasi`
--

INSERT INTO `lokasi` (`id_lokasi`, `nama_lokasi`, `alamat`, `latitude`, `longitude`, `titik_lokasi`) VALUES
(1, 'Titik Genangan 1', 'Balunijuk - data simulasi', -2.0500000, 106.0500000, 0x0000000001010000003333333333835a4066666666666600c0),
(2, 'Titik Genangan 2', 'Kampak - data simulasi', -2.1000000, 106.1000000, 0x0000000001010000006666666666865a40cdcccccccccc00c0);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `kejadian_banjir`
--
ALTER TABLE `kejadian_banjir`
  ADD PRIMARY KEY (`id_kejadian`),
  ADD KEY `id_lokasi` (`id_lokasi`);

--
-- Indexes for table `laporan`
--
ALTER TABLE `laporan`
  ADD PRIMARY KEY (`id_laporan`),
  ADD KEY `id_kejadian` (`id_kejadian`);

--
-- Indexes for table `lokasi`
--
ALTER TABLE `lokasi`
  ADD PRIMARY KEY (`id_lokasi`),
  ADD SPATIAL KEY `idx_titik_lokasi` (`titik_lokasi`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `kejadian_banjir`
--
ALTER TABLE `kejadian_banjir`
  MODIFY `id_kejadian` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `laporan`
--
ALTER TABLE `laporan`
  MODIFY `id_laporan` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `lokasi`
--
ALTER TABLE `lokasi`
  MODIFY `id_lokasi` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `kejadian_banjir`
--
ALTER TABLE `kejadian_banjir`
  ADD CONSTRAINT `kejadian_banjir_ibfk_1` FOREIGN KEY (`id_lokasi`) REFERENCES `lokasi` (`id_lokasi`);

--
-- Constraints for table `laporan`
--
ALTER TABLE `laporan`
  ADD CONSTRAINT `laporan_ibfk_1` FOREIGN KEY (`id_kejadian`) REFERENCES `kejadian_banjir` (`id_kejadian`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
