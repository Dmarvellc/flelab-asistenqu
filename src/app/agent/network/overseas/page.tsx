"use client"

import { useState, useMemo } from "react"
import {
  Search, MapPin, Building2, Globe2, Shield, ChevronUp, ChevronDown,
  ChevronsUpDown, X, Filter, Download, LayoutGrid, LayoutList,
  ChevronLeft, ChevronRight, Hospital, Star, SlidersHorizontal
} from "lucide-react"

// ─── Data ───────────────────────────────────────────────────────────────────

interface Provider {
  no: number
  type: string
  name: string
  address: string
  country: "MALAYSIA" | "SINGAPORE"
  state: string
  city: string
  network: string
}

function extractState(address: string, country: string): string {
  if (country === "SINGAPORE") return "Singapore"
  const a = address.toUpperCase()
  if (a.includes("KUALA LUMPUR") || a.includes("WILAYAH PERSEKUTUAN")) return "Kuala Lumpur"
  if (a.includes("SELANGOR")) return "Selangor"
  if (a.includes("PENANG") || a.includes("PULAU PINANG") || a.includes("PERAI") || a.includes("BAYAN") || a.includes("GEORGE TOWN")) return "Pulau Pinang"
  if (a.includes("JOHOR") || a.includes("JOHOR BAHRU") || a.includes("ISKANDAR") || a.includes("NUSAJAYA")) return "Johor"
  if (a.includes("SEREMBAN") || a.includes("NEGERI SEMBILAN") || a.includes("PORT DICKSON") || a.includes("NILAI")) return "Negeri Sembilan"
  if (a.includes("MELAKA") || a.includes("MERLIMAU")) return "Melaka"
  if (a.includes("KUCHING") || a.includes("SARAWAK") || a.includes("MIRI") || a.includes("SIBU") || a.includes("BINTULU") || a.includes("SARIKEI") || a.includes("KAPIT") || a.includes("BETONG") || a.includes("SARATOK") || a.includes("MARUDI") || a.includes("SRI AMAN") || a.includes("LIMBANG") || a.includes("LAWAS") || a.includes("LUNDU") || a.includes("DARO") || a.includes("KANOWIT") || a.includes("DALAT") || a.includes("SIMUNJAN") || a.includes("MUKAH")) return "Sarawak"
  if (a.includes("KOTA KINABALU") || a.includes("SABAH") || a.includes("SANDAKAN") || a.includes("TAWAU") || a.includes("KENINGAU") || a.includes("PAPAR") || a.includes("KUDAT") || a.includes("BELURAN") || a.includes("RANAU") || a.includes("SEMPORNA") || a.includes("TAMBUNAN") || a.includes("TENOM") || a.includes("BEAUFORT") || a.includes("KUNAK") || a.includes("SIPITANG") || a.includes("TUARAN") || a.includes("KOTA MARUDU") || a.includes("KINABATANGAN") || a.includes("KUALA PENYU") || a.includes("LABUAN")) return "Sabah"
  if (a.includes("IPOH") || a.includes("PERAK") || a.includes("TAIPING") || a.includes("TELUK INTAN") || a.includes("SLIM RIVER") || a.includes("KAMPAR") || a.includes("GERIK") || a.includes("SUNGAI SIPUT") || a.includes("PARIT BUNTAR") || a.includes("BATU GAJAH") || a.includes("KUALA KANGSAR") || a.includes("SELAMA")) return "Perak"
  if (a.includes("KOTA BHARU") || a.includes("KELANTAN") || a.includes("MACHANG") || a.includes("GUA MUSANG") || a.includes("JELI") || a.includes("TANAH MERAH") || a.includes("PASIR MAS") || a.includes("PASIR PUTEH") || a.includes("TUMPAT") || a.includes("KUALA KRAI")) return "Kelantan"
  if (a.includes("KUANTAN") || a.includes("PAHANG") || a.includes("TEMERLOH") || a.includes("BENTONG") || a.includes("RAUB") || a.includes("JERANTUT") || a.includes("PEKAN") || a.includes("CAMERON") || a.includes("MUADZAM") || a.includes("JENGKA") || a.includes("TANAH RATA")) return "Pahang"
  if (a.includes("TERENGGANU") || a.includes("KUALA TERENGGANU") || a.includes("DUNGUN") || a.includes("KEMAMAN") || a.includes("BESUT") || a.includes("SETIU") || a.includes("HULU TERENGGANU") || a.includes("PERMAISURI")) return "Terengganu"
  if (a.includes("KEDAH") || a.includes("ALOR SETAR") || a.includes("SUNGAI PETANI") || a.includes("KULIM") || a.includes("LANGKAWI") || a.includes("KUALA NERANG") || a.includes("BALING") || a.includes("SIK") || a.includes("JITRA") || a.includes("YAN")) return "Kedah"
  if (a.includes("KAJANG") || a.includes("PUTRAJAYA")) return "Selangor"
  if (a.includes("KANGAR") || a.includes("PERLIS")) return "Perlis"
  if (a.includes("KLANG")) return "Selangor"
  if (a.includes("SHAH ALAM")) return "Selangor"
  if (a.includes("KLUANG") || a.includes("SEGAMAT") || a.includes("MERSING") || a.includes("MUAR") || a.includes("BATU PAHAT") || a.includes("PONTIAN") || a.includes("KOTA TINGGI") || a.includes("PASIR GUDANG") || a.includes("KULAI") || a.includes("TANGKAK")) return "Johor"
  return "Malaysia"
}

function extractNetwork(name: string): string {
  const n = name.toUpperCase()
  if (n.includes("KPJ")) return "KPJ"
  if (n.includes("PANTAI")) return "Pantai"
  if (n.includes("GLENEAGLES")) return "Gleneagles"
  if (n.includes("COLUMBIA ASIA")) return "Columbia Asia"
  if (n.includes("SUNWAY")) return "Sunway"
  if (n.includes("KMI")) return "KMI"
  if (n.includes("PRINCE COURT") || n.includes("PARKCITY") || n.includes("BEACON") || n.includes("ASSUNTA")) return "IHH"
  if (n.includes("HOSPITAL ") && !n.includes("SPECIALIST") && !n.includes("MEDICAL")) return "Kerajaan"
  return "Swasta"
}

const RAW_DATA: Omit<Provider, "state" | "city" | "network">[] = [
  { no: 1, type: "RS", name: "ARA DAMANSARA MEDICAL CENTRE SDN BHD", address: "Lot 2, Jalan Lapangan Terbang Subang, Seksyen U2, 40150 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 2, type: "RS", name: "KPJ JOHOR SPECIALIST HOSPITAL", address: "39B, Jalan Abdul Samad, Kolam Ayer, 80100 Johor Bahru, Johor, Malaysia", country: "MALAYSIA" },
  { no: 3, type: "RS", name: "PRINCE COURT MEDICAL CENTRE", address: "39, Jalan Kia Peng, 50450 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 4, type: "RS", name: "GEORGETOWN SPECIALIST HOSPITAL SDN BHD", address: "12A Jalan Masjid Negeri Penang, Malaysia", country: "MALAYSIA" },
  { no: 5, type: "RS", name: "BAGAN SPECIALIST CENTRE SDN BHD", address: "Jalan Bagan 1, 13400 Butterworth Penang, Malaysia", country: "MALAYSIA" },
  { no: 6, type: "RS", name: "KPJ IPOH SPECIALIST HOSPITAL", address: "26, Jalan Raja Dihilir, 30350 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 7, type: "RS", name: "PUTRA SPECIALIST HOSPITAL - MELAKA", address: "169, Jalan Bendahara, Pengkalan Rama, 75100 Melaka, Malaysia", country: "MALAYSIA" },
  { no: 8, type: "RS", name: "BORNEO MEDICAL CENTRE", address: "Lot 10992 Section 64 KTLD Jalan Tun Jugah, 93350 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 9, type: "RS", name: "PANTAI HOSPITAL KUALA LUMPUR", address: "8 Jalan Bukit Pantai, 59100 Kuala Lumpur, Wilayah Persekutuan", country: "MALAYSIA" },
  { no: 10, type: "RS", name: "THOMSON HOSPITAL KOTA DAMANSARA", address: "11, Jalan Teknologi, Taman Sains Selangor, PJU 5, Kota Damansara, 47810 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 11, type: "RS", name: "PANTAI HOSPITAL PENANG", address: "82, Jalan Tengah, Bayan Baru, 11900 Bayan Lepas, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 12, type: "RS", name: "UKM KESIHATAN SDN BHD", address: "7th Floor, Clinical Block, UKM Medical Centre, Jalan Yaacob Latif, Bandar Tun Razak, Kuala Lumpur", country: "MALAYSIA" },
  { no: 13, type: "RS", name: "LOH GUAN LYE SPECIALIST CENTRE", address: "No. 238, Jalan Macalister, 10400 Penang, Malaysia", country: "MALAYSIA" },
  { no: 14, type: "RS", name: "GLENEAGLES PENANG HOSPITAL", address: "1 Jalan Pangkor, 10050 Penang, Malaysia", country: "MALAYSIA" },
  { no: 15, type: "RS", name: "LAM WAH EE HOSPITAL", address: "No. 141, Jalan Tan Sri Teh Ewe Lim, 11600 Georgetown, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 16, type: "RS", name: "PENANG ADVENTIST HOSPITAL", address: "465, Jalan Burma, 10350 Penang, Malaysia", country: "MALAYSIA" },
  { no: 17, type: "RS", name: "MAHKOTA MEDICAL CENTRE", address: "No. 3, Mahkota Melaka, Jalan Merdeka, 75000 Melaka, Malaysia", country: "MALAYSIA" },
  { no: 18, type: "RS", name: "GLENEAGLES HOSPITAL KUALA LUMPUR", address: "286 Jalan Ampang, 50450 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 19, type: "RS", name: "TUNG SHIN HOSPITAL", address: "102, Jln Pudu, Bukit Bintang, 55100 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 20, type: "RS", name: "ISLAND HOSPITAL", address: "308 Macalister Road, 10450 Penang, Malaysia", country: "MALAYSIA" },
  { no: 21, type: "RS", name: "MOUNT MIRIAM CANCER HOSPITAL", address: "23, Jalan Bulan, Fettes Park, Tanjung Bungah, 11200 Penang, Malaysia", country: "MALAYSIA" },
  { no: 22, type: "RS", name: "KPJ DAMANSARA SPECIALIST HOSPITAL", address: "No 119 Jalan SS 20/10, Damansara Utama, 47400 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 23, type: "RS", name: "GLENEAGLES MEDINI HOSPITAL JOHOR", address: "No. 2 Jalan Medini Utara 4, Medini Iskandar, 79250 Iskandar Puteri, Johor, Malaysia", country: "MALAYSIA" },
  { no: 24, type: "RS", name: "COLUMBIA ASIA HOSPITAL NUSAJAYA - ISKANDAR PUTERI", address: "Persiaran Afiat, Taman Kesihatan Afiat, 79250 Nusajaya, Johor, Malaysia", country: "MALAYSIA" },
  { no: 25, type: "RS", name: "ORIENTAL MELAKA STRAITS MEDICAL CENTRE", address: "Pusat Perubatan, Klebang, 75200 Melaka, Malaysia", country: "MALAYSIA" },
  { no: 26, type: "RS", name: "TIMBERLAND MEDICAL CENTRE", address: "Lot 5164-5165 Block KCLD Jalan Rock Taman Timberland, 93250 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 27, type: "RS", name: "REGEN SPECIALIST CENTRE", address: "51-53, Level 2, Block D, Jaya One, 72A, Jalan Universiti, 46200 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 28, type: "RS", name: "REGENCY SPECIALIST HOSPITAL", address: "No 1 Jalan Suria, Bandar Seri Alam, 81750 Masai, Johor, Malaysia", country: "MALAYSIA" },
  { no: 29, type: "RS", name: "COLUMBIA ASIA PETALING JAYA", address: "Lot 69 Jalan 13/6 Seksyen 13, 46200 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 30, type: "RS", name: "HOSPITAL KUALA LUMPUR", address: "Jalan Pahang, 50586 Wilayah Persekutuan, Malaysia", country: "MALAYSIA" },
  { no: 31, type: "RS", name: "PANTAI HOSPITAL CHERAS", address: "1, Jalan 1/96a, Taman Cheras Makmur, 56100 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 32, type: "RS", name: "IHEAL MEDICAL CENTRE SDN BHD KUALA LUMPUR", address: "Level 7 & 8 Annex Block Menara IGB Mid Valley City, Lingkaran Syed Putra, 59200 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 33, type: "RS", name: "ALPHA SPECIALIST CENTRE", address: "25, Jalan PJU 5/6, Kota Damansara, 47810 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 34, type: "RS", name: "NORTHERN HEART HOSPITAL PENANG", address: "2, Peel Hwy, Pulau Tikus, 10350 George Town, Penang, Malaysia", country: "MALAYSIA" },
  { no: 35, type: "RS", name: "HOSPITAL PICASO", address: "110, Jalan Professor Khoo Kay Kim, Seksyen 19, 46300 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 36, type: "RS", name: "UM SPECIALIST CENTRE", address: "UMSC Building, Lot 28, Jalan Universiti, 50603 Lembah Pantai, Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 37, type: "RS", name: "KPJ PUTERI SPECIALIST HOSPITAL", address: "Jl. Tun Abdul Razak (Susur 5), 80350 Johor Bahru, Malaysia", country: "MALAYSIA" },
  { no: 38, type: "RS", name: "KPJ PENANG SPECIALIST HOSPITAL", address: "570, Jl Perda Utama, Bandar Perda, 14000 Bukit Mertajam, Seberang Perai, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 39, type: "RS", name: "PANTAI HOSPITAL AMPANG", address: "Jalan Perubatan 1, Pandan Indah, 55100 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 40, type: "RS", name: "CENGILD G I MEDICAL CENTRE", address: "Unit 2-3 & 4 Level 2 Nexus @ Bangsar South, No 7 Jalan Kerinchi, 59200 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 41, type: "RS", name: "ALTY ORTHOPAEDIC HOSPITAL", address: "Level 5, Menara ALTY, 187, Jln Ampang, 50450 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 42, type: "RS", name: "KPMC PUCHONG SPECIALIST CENTRE", address: "1 & 3, Jalan Puteri 2/1, Bandar Puteri, 47100 Puchong, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 43, type: "RS", name: "NORMAH MEDICAL SPECIALIST CENTRE", address: "Lot 937, Section 30 KTLD, Jalan Tun Abdul Rahman Yaakub, Petra Jaya, 93050 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 44, type: "RS", name: "APOLLO MEDICAL CENTRE", address: "No. 271, Jalan Taming Sari, Malaysia", country: "MALAYSIA" },
  { no: 45, type: "RS", name: "HOSPITAL PAKAR METRO", address: "K609 Jalan Hospital Pakar Metro, Taman Berangan, 08000 Sungai Petani, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 46, type: "RS", name: "AURELIUS HOSPITAL PAHANG (PAHANG MEDICAL CENTRE)", address: "Lot 1, 3, 5 & 7, Wisma MUIP, Jalan Gambut, Sri Dagangan Business Centre, 25000 Kuantan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 47, type: "RS", name: "HOSPITAL ISLAM AZ ZAHRAH", address: "No. 6, Medan Pusat Bandar 1, Seksyen 9, 43650 Bandar Baru Bangi, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 48, type: "RS", name: "KPJ PAHANG SPECIALIST HOSPITAL", address: "Jalan Tanjung Lumpur, 26060 Kuantan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 49, type: "RS", name: "KPJ PERDANA SPECIALIST HOSPITAL", address: "PT 37 & 600, Seksyen 14, Jalan Bayam, Bandar Kota Bharu, 15200 Kota Bharu, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 50, type: "RS", name: "PANTAI HOSPITAL SUNGAI PETANI", address: "1, Persiaran Cempaka, Bandar Amanjaya, 08000 Sungai Petani, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 51, type: "RS", name: "HOSPITAL MACHANG", address: "D18 Jalan Pasir Puteh, Kampung Bukit Tiu, 18500 Machang, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 52, type: "RS", name: "HOSPITAL GUA MUSANG", address: "Bandar Baru Gua Musang, 18300 Gua Musang, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 53, type: "RS", name: "HOSPITAL JELI", address: "12, Jalan Pekeliling, Bandar Jeli, 17600 Jeli, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 54, type: "RS", name: "HOSPITAL BAU", address: "Batu 1 1/2, Jalan Bau-Lundu, Bau, Kuching, 94000 Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 55, type: "RS", name: "HOSPITAL BETONG", address: "Jln Betong, Betong, 95707 Betong, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 56, type: "RS", name: "HOSPITAL LAHAD DATU", address: "Jln Lahad Datu - Tawau, 91100 Lahad Datu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 57, type: "RS", name: "HOSPITAL MIRI", address: "Q353, 98000 Miri, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 58, type: "RS", name: "HOSPITAL SARIKEI", address: "Jalan Rentap, 96100 Sarikei, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 59, type: "RS", name: "HOSPITAL SERIAN", address: "Bandar Serian, 94700 Serian, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 60, type: "RS", name: "HOSPITAL SIBU", address: "Batu 5 1/2, Jalan Ulu Oya, Pekan Sibu, 96000 Sibu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 61, type: "RS", name: "HOSPITAL UMUM KUCHING", address: "Jalan Hospital, 93586 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 62, type: "RS", name: "HOSPITAL MESRA BUKIT PADANG", address: "Peti Surat 11342, Bukit Padang, 88815 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 63, type: "RS", name: "HOSPITAL PAPAR", address: "Jalan New Hospital Papar, Peti Surat No. 6, 89607 Papar, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 64, type: "RS", name: "HOSPITAL PITAS", address: "Jalan New Hospital Papar, Pitas, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 65, type: "RS", name: "HOSPITAL QUEEN ELIZABETH", address: "Karung Berkunci No. 2029, Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 66, type: "RS", name: "HOSPITAL TAMBUNAN", address: "Peti Surat 10, Tambunan, 89657 Tambunan, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 67, type: "RS", name: "HOSPITAL TAWAU", address: "Peti Surat 67, 91000 Tawau, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 68, type: "RS", name: "HOSPITAL TENOM", address: "Peti Surat 97, 89907 Tenom, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 69, type: "RS", name: "HOSPITAL LIMBANG", address: "Jalan Pandaruan, 98700 Limbang, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 70, type: "RS", name: "HOSPITAL KUALA PENYU", address: "W.D.T. 35, 89740 Kuala Penyu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 71, type: "RS", name: "HOSPITAL KUDAT", address: "Peti Surat 22, Kudat, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 72, type: "RS", name: "HOSPITAL KUNAK", address: "W.D.T 150, Pekan Kunak, 91209 Kunak, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 73, type: "RS", name: "HOSPITAL KAPIT", address: "Jalan Mamora, 96800 Kapit, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 74, type: "RS", name: "HOSPITAL LAWAS", address: "Jalan Hospital, 98850 Lawas, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 75, type: "RS", name: "HOSPITAL LUNDU", address: "KM 2, Jln Sekambal, 94500 Lundu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 76, type: "RS", name: "HOSPITAL MARUDI", address: "Jalan Pungor, Marudi, 98050 Baram, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 77, type: "RS", name: "HOSPITAL DARO", address: "Jalan Itol Daro, 96200 Daro, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 78, type: "RS", name: "HOSPITAL KANOWIT", address: "Jalan Kanowit/Durin, 96700 Kanowit, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 79, type: "RS", name: "HOSPITAL LABUAN", address: "87000 Labuan, Labuan Federal Territory, Malaysia", country: "MALAYSIA" },
  { no: 80, type: "RS", name: "HOSPITAL TANAH MERAH", address: "17500 Tanah Merah, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 81, type: "RS", name: "HOSPITAL TENGKU ANIS PASIR PUTEH", address: "Jalan Pasir Putih - Tok Bali, Kota Bharu, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 82, type: "RS", name: "HOSPITAL MUADZAM SHAH", address: "333R+4H, Jalan Kemajuan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 83, type: "RS", name: "HOSPITAL SETIU", address: "Bandar Permaisuri, 22100 Permaisuri, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 84, type: "RS", name: "HOSPITAL BELURAN", address: "Bag Berkunci 2, Beluran, 90109 Beluran, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 85, type: "RS", name: "HOSPITAL KENINGAU", address: "Peti Surat 11 Jalan Apin-Apin, 89007 Keningau, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 86, type: "RS", name: "HOSPITAL SIMUNJAN", address: "Jalan Gunung Ngeli, Q157, 94800 Simunjan, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 87, type: "RS", name: "HOSPITAL FATIMAH", address: "No. 1, Lebuh Chew Peng Loon, Off Jalan Dato Lau Pak Khuan, Ipoh Garden, Perak, Malaysia", country: "MALAYSIA" },
  { no: 88, type: "RS", name: "SUNWAY TCM CENTRE", address: "B1-02-01, Sunway Geo Avenue, Jalan Lagoon Selatan, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 89, type: "RS", name: "HOSPITAL TUNKU AZIZAH", address: "Lot 25, Jalan Raja Muda Abdul Aziz, Kampung Baru, Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 90, type: "RS", name: "KAJANG PLAZA MEDICAL CENTRE", address: "36, Jalan Dato Seri P. Alagendra 2, Bandar Kajang, 43000 Kajang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 91, type: "RS", name: "HOSPITAL PUSRAWI", address: "Lot 149, Jln Tun Razak, Titiwangsa, 50400 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 92, type: "RS", name: "INSTITUT KANSER NEGARA", address: "4, Jalan P7, Presint 7, 62250 Putrajaya, Wilayah Persekutuan, Malaysia", country: "MALAYSIA" },
  { no: 93, type: "RS", name: "KMI KELANA JAYA MEDICAL CENTRE", address: "No. 1 FAS Business Avenue, Jalan SS7, 47301 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 94, type: "RS", name: "PUSAT PERUBATAN UKM", address: "Jalan Yaacob Latif, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 95, type: "RS", name: "KOTA BHARU MEDICAL CENTRE", address: "PT 179, 184, Jalan Sultan Yahya Petra, Taman Aman, 15150 Kota Bharu, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 96, type: "RS", name: "SALAM SENAWANG SPECIALIST HOSPITAL", address: "Business Square, 234-243, Jalan Lavender Heights 2, Taman Lavender Heights, 70450 Senawang, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 97, type: "RS", name: "SUNGAI LONG SPECIALIST HOSPITAL (FORMERLY PUTRA SPECIALIST KAJANG)", address: "PT 21147, Persiaran SL 1, Bandar Sungai Long, 43000 Kajang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 98, type: "RS", name: "TUN HUSSEIN ONN NATIONAL EYE HOSPITAL", address: "Lot 2, Lorong Utara (B), PJS 52, 46200 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 99, type: "RS", name: "PARKCITY MEDICAL CENTRE", address: "2, Jalan Intisari, Desa Parkcity, 52200 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 100, type: "RS", name: "AURELIUS HOSPITAL NEGERI SEMBILAN", address: "PT 13717, Jalan BBN 2/1, Bandar Baru Nilai, 71800 Nilai, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 101, type: "RS", name: "PANTAI HOSPITAL MANJUNG", address: "Jalan PPMP 1, Pusat Perniagaan Manjung Point, 32040 Seri Manjung, Perak, Malaysia", country: "MALAYSIA" },
  { no: 102, type: "RS", name: "KPJ KLUANG UTAMA SPECIALIST HOSPITAL", address: "No 1, Susur 1, Kampung Yap Tau Sah, 86000 Kluang, Johor, Malaysia", country: "MALAYSIA" },
  { no: 103, type: "RS", name: "SUBANG JAYA MEDICAL CENTRE SDN BHD", address: "Jalan SS 12/1A, 47500 Subang Jaya, Selangor Darul Ehsan, Malaysia", country: "MALAYSIA" },
  { no: 104, type: "RS", name: "SUNWAY MEDICAL CENTRE VELOCITY", address: "Lingkaran SV, Sunway Velocity, 55100 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 105, type: "RS", name: "KPJ TAWAKKAL SPECIALIST HOSPITAL", address: "No. 1, Jalan Pahang Barat, 53000 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 106, type: "RS", name: "INSTITUT JANTUNG NEGARA (NATIONAL HEART INSTITUT)", address: "145 Jalan Tun Razak, 50400 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 107, type: "RS", name: "KEMPAS MEDICAL CENTRE", address: "Lot PTD 7522 Jalan Kempas Baru, 81200 Johor Bahru, Malaysia", country: "MALAYSIA" },
  { no: 108, type: "RS", name: "KPJ KLANG SPECIALIST HOSPITAL", address: "No. 102, Persiaran Rajawali/KU 1, Bandar Baru Klang, 41150 Klang, Selangor Darul Ehsan, Malaysia", country: "MALAYSIA" },
  { no: 109, type: "RS", name: "COLUMBIA ASIA TEBRAU", address: "5, Kota, Persiaran Southkey 1, Southkey, 80150 Johor Bahru, Johor, Malaysia", country: "MALAYSIA" },
  { no: 110, type: "RS", name: "CARDIAC VASCULAR SENTRAL KUALA LUMPUR (CVSKL)", address: "Jl Stesen Sentral 5 Kuala Lumpur Central, 50470 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 111, type: "RS", name: "MSU MEDICAL CENTRE", address: "Jln Boling Padang 13/64, Seksyen 13, 40100 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 112, type: "RS", name: "KPJ AMPANG PUTERI SPECIALIST HOSPITAL", address: "No. 1, Jalan Mamanda 9, Taman Dato Ahmad Rozali, 68000 Ampang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 113, type: "RS", name: "KPJ SELANGOR SPECIALIST HOSPITAL", address: "Lot 1, Jalan 20/1 Section 20, 40300 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 114, type: "RS", name: "SUNWAY MEDICAL CENTRE", address: "5, Jalan Lagoon Selatan, Bandar Sunway, 47500 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 115, type: "RS", name: "PANTAI HOSPITAL AYER KEROH", address: "No 2418-1 KM 8 Lebuh Ayer Keroh, Melaka, Malaysia", country: "MALAYSIA" },
  { no: 116, type: "RS", name: "SUNWAY MEDICAL CENTRE PENANG", address: "3106, Lebuh Tenggiri 2, Seberang Jaya, 13700 Perai, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 117, type: "RS", name: "KMI TAWAU MEDICAL CENTRE", address: "TB 4551, Jalan Abaca, Bandar Tawau, 91000 Tawau, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 118, type: "RS", name: "KPJ KUCHING SPECIALIST HOSPITAL", address: "Lot 18807, Block 11 Muara Tebas Land District, Jalan Stutong, 93350 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 119, type: "RS", name: "DAMANSARA SPECIALIST HOSPITAL 2 (DSH2)", address: "1, Jalan Bukit Lanjan 3, Bukit Lanjan, 60000 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 120, type: "RS", name: "BEACON HOSPITAL SDN BHD", address: "No 1 Jalan 215 Section 51, Off Jalan Templer, 46050 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 121, type: "RS", name: "ASSUNTA HOSPITAL", address: "Jalan Templer, PJS 4, 46050 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 122, type: "RS", name: "KPJ SEREMBAN SPECIALIST HOSPITAL", address: "Lot 6219 & 6220, Jalan Toman 1, Kemayan Square, 70200 Seremban, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 123, type: "RS", name: "KMI TAMAN DESA MEDICAL CENTRE", address: "Old Klang Road, 45, Jalan Desa, Taman Desa, 58100 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 124, type: "RS", name: "KPJ SABAH SPECIALIST HOSPITAL", address: "Lot No. 2 Off, Jalan Damai, Luyang Commercial Centre, 88300 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 125, type: "RS", name: "PUSAT JANTUNG SARAWAK", address: "Kuching - Samarahan Expressway, 94300 Kota Samarahan, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 126, type: "RS", name: "KPJ SENTOSA KL SPECIALIST HOSPITAL", address: "Damai Kompleks, 36, Jalan Chemur, Titiwangsa Sentral, 50400 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 127, type: "RS", name: "KPJ BANDAR DATO ONN SPECIALIST HOSPITAL", address: "Jalan Bukit Mutiara, Taman Bukit Mutiara, 81100 Johor Bahru, Johor, Malaysia", country: "MALAYSIA" },
  { no: 128, type: "RS", name: "HOSPITAL SLIM RIVER", address: "35800 Slim River, Perak, Malaysia", country: "MALAYSIA" },
  { no: 129, type: "RS", name: "HOSPITAL TENGKU AMPUAN JEMAAH", address: "Jalan Hospital, 45200 Sabak, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 130, type: "RS", name: "HOSPITAL TELUK INTAN", address: "Jalan Changkat Jong, 36000 Teluk Intan, Perak, Malaysia", country: "MALAYSIA" },
  { no: 131, type: "RS", name: "HOSPITAL SUNGAI BAKAP", address: "Jalan Besar Sungai Bakap, 14200 Sungai Jawi, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 132, type: "RS", name: "HOSPITAL BANTING", address: "Jalan Sultan Alam Shah, 42700 Banting, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 133, type: "RS", name: "HOSPITAL SELAYANG", address: "Lebuhraya Selayang - Kepong, 68100 Batu Caves, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 134, type: "RS", name: "HOSPITAL KUALA KUBU BARU", address: "Jalan Hospital, Pekan Kuala Kubu Bharu, 44000 Kuala Kubu Baru, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 135, type: "RS", name: "HOSPITAL JEMPOL", address: "Jalan Gemilang, Bandar Baru Serting, 72120 Bandar Seri Jempol, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 136, type: "RS", name: "HOSPITAL PARIT BUNTAR", address: "Jln Sempadan, Kampung Permatang Tok Mamat, 34200 Parit Buntar, Perak, Malaysia", country: "MALAYSIA" },
  { no: 137, type: "RS", name: "HOSPITAL ALOR GAJAH", address: "Jalan Paya Datok/Simpang, Kampung Tepat, 78000 Alor Gajah, Melaka, Malaysia", country: "MALAYSIA" },
  { no: 138, type: "RS", name: "HOSPITAL KOTA TINGGI", address: "Jalan Tun Habab, Bandar Kota Tinggi, 81900 Kota Tinggi, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 139, type: "RS", name: "PUTRA SPECIALIST HOSPITAL BATU PAHAT", address: "1, Jln Peserai, Kampung Pegawai, 83000 Batu Pahat, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 140, type: "RS", name: "PANTAI HOSPITAL BATU PAHAT", address: "9S, Jln Bintang 1, Taman Koperasi Bahagia, 83000 Batu Pahat, Johor, Malaysia", country: "MALAYSIA" },
  { no: 141, type: "RS", name: "KUANTAN MEDICAL CENTRE SDN BHD", address: "Jalan Tun Razak, Bandar Indera Mahkota, 25200 Kuantan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 142, type: "RS", name: "KPJ KAJANG SPECIALIST HOSPITAL", address: "Jalan Cheras, Kampung Sungai Kantan, 43000 Kajang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 143, type: "RS", name: "KEDAH MEDICAL CENTRE", address: "Lot 527, Mukim Alor Merah, Pumpong, 05250 Alor Setar, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 144, type: "RS", name: "KPJ SIBU SPECIALIST MEDICAL CENTRE", address: "No 52A-G, Persiaran Brooke, Pekan Sibu, 96000 Sibu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 145, type: "RS", name: "KPJ MEDICAL CENTRE (FORMERLY TAIPING MEDICAL CENTRE)", address: "45-49, Jalan Medan Taiping 2, Medan Taiping, 34000 Taiping, Perak, Malaysia", country: "MALAYSIA" },
  { no: 146, type: "RS", name: "MARIA HOSPITAL", address: "Wisma Maria, Jalan Ngee Heng, 80000 Johor Bahru, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 147, type: "RS", name: "PANTAI HOSPITAL IPOH", address: "126, Jalan Tambun, Taman Ipoh, 31400 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 148, type: "RS", name: "AL ISLAM SPECIALIST HOSPITAL", address: "85, Jalan Raja Abdullah, Kampung Baru, 50300 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 149, type: "RS", name: "SRI KOTA SPECIALIST MEDICAL CENTRE", address: "Jalan Mohet, Kawasan 1, 41000 Klang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 150, type: "RS", name: "KPJ PASIR GUDANG SPECIALIST HOSPITAL", address: "Lot PTD 204781, Jalan Persiaran Dahlia 2, Taman Bukit Dahlia, 81700 Pasir Gudang, Johor, Malaysia", country: "MALAYSIA" },
  { no: 151, type: "RS", name: "DAMAI SERVICE HOSPITAL HQ", address: "1st Mile, 109-119, Jln Sultan Azlan Shah, Titiwangsa Sentral, 51200 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 152, type: "RS", name: "PANTAI HOSPITAL LAGUNA MERBUK", address: "No 1, Lrg BLM 1/10, Bandar Laguna Merbok, 08000 Sungai Petani, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 153, type: "RS", name: "LOURDES MEDICAL CENTRE", address: "244, Jln Sultan Azlan Shah, Jalan Ipoh, 51200 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 154, type: "RS", name: "COLUMBIA ASIA HOSPITAL MIRI", address: "Lot 1035-1039, Jalan Bulan Sabit, 98009 Miri, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 155, type: "RS", name: "COLUMBIA ASIA HOSPITAL PUCHONG", address: "Lebuh Puteri, Bandar Puteri, 47100 Puchong, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 156, type: "RS", name: "COLUMBIA ASIA HOSPITAL SETAPAK", address: "No. 1, Jalan Danau Saujana, Taman Danau Kota, 53300 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 157, type: "RS", name: "COLUMBIA ASIA HOSPITAL BINTULU", address: "Lot 3582, Block 26, Jalan Tan Sri Ikhwan, Tanjung Kidurong, 97000 Bintulu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 158, type: "RS", name: "COLUMBIA ASIA HOSPITAL SEREMBAN", address: "292 & Lot PT1904, Jln Haruan 2, Oakland Commercial Centre, 70300 Seremban, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 159, type: "RS", name: "COLUMBIA ASIA HOSPITAL TAIPING", address: "5, Jalan Perwira, 34000 Taiping, Perak, Malaysia", country: "MALAYSIA" },
  { no: 160, type: "RS", name: "COLUMBIA ASIA HOSPITAL CHERAS", address: "Lot 33107, Jalan Suakasih, 43200 Cheras, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 161, type: "RS", name: "COLUMBIA ASIA HOSPITAL BUKIT RIMAU", address: "3, Persiaran Anggerik Eria Bukit Rimau, Seksyen 32, 40460 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 162, type: "RS", name: "GLENEAGLES HOSPITAL KOTA KINABALU", address: "Riverson@Sembulan, Block A-1, Lorong Riverson@Sembulan, Off Coastal Highway, 88100 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 163, type: "RS", name: "SALAM SPECIALIST HOSPITAL KUALA TERENGGANU", address: "Lot 4075, Jalan Engku Sar, 20300 Kuala Terengganu, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 164, type: "RS", name: "PUSAT PERUBATAN UNIVERSITI MALAYA", address: "Jln Profesor Diraja Ungku Aziz, Seksyen 13, 50603 Petaling Jaya, Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 165, type: "RS", name: "GLOBAL DOCTOR'S HOSPITAL", address: "18, Jln Kiara 3, Mont Kiara, 50480 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 166, type: "RS", name: "ANSON BAY MEDICAL CENTRE", address: "Lot 992 Batu 3 1/2, Jalan Maharajalela, Malaysia", country: "MALAYSIA" },
  { no: 167, type: "RS", name: "HOSPITAL ORANG ASLI GOMBAK", address: "KM 24, Jln Gombak, Wilayah Persekutuan, Malaysia", country: "MALAYSIA" },
  { no: 168, type: "RS", name: "HOSPITAL SHAH ALAM", address: "Persiaran Kayangan, Seksyen 7, Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 169, type: "RS", name: "PUSAT KAWALAN KUSTA NEGARA", address: "Jalan Hospital, 47000 Sungai Buloh, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 170, type: "RS", name: "HOSPITAL ROMPIN", address: "Kampung Pulau Lang, 26800 Kuala Rompin, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 171, type: "RS", name: "HOSPITAL BAHAGIA ULU KINTA", address: "Jalan Besar, 31250 Tanjung Rambutan, Perak, Malaysia", country: "MALAYSIA" },
  { no: 172, type: "RS", name: "HOSPITAL DALAT", address: "Q229, Pekan Dalat, 96300 Dalat, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 173, type: "RS", name: "KMC MEDICAL CENTRE", address: "20A, Jalan Chung Thye Phin, Taman Chateau, 30250 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 174, type: "RS", name: "HOSPITAL SERI MANJUNG", address: "32040 Seri Manjung, Perak, Malaysia", country: "MALAYSIA" },
  { no: 175, type: "RS", name: "AVISENA WOMEN AND CHILDREN SPECIALIST HOSPITAL", address: "No. 3, Jalan Perdagangan 14/4, Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 176, type: "RS", name: "BORNEO SPECIALIST HOSPITAL MIRI", address: "Lot 1959, Block 10 MCLD, Jalan Cahaya, Off Jalan Miri-Bintulu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 177, type: "RS", name: "KENSINGTON GREEN SPECIALIST CENTRE", address: "No 2, Jalan Ceria 20, Taman Nusa Indah, Johor, Malaysia", country: "MALAYSIA" },
  { no: 178, type: "RS", name: "SEHAT HEALTHCARE CENTRE", address: "Uptown Avenue, 352, Jalan S2 B9, Seremban 2, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 179, type: "RS", name: "KPJ RAWANG SPECIALIST HOSPITAL", address: "Jalan Rawang, Bandar Baru, 48000 Rawang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 180, type: "RS", name: "HOSPITAL PUTRAJAYA", address: "Pusat Pentadbiran Kerajaan Persekutuan, Presint 7, Putrajaya, Malaysia", country: "MALAYSIA" },
  { no: 181, type: "RS", name: "MAWAR MEDICAL CENTRE", address: "71, Jalan Rasah, Bukit Rasah, 70300 Seremban, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 182, type: "RS", name: "AMPANG HOSPITAL", address: "Hospital Ampang, Jalan Mewah Utara, Taman Pandan Mewah, 68000 Ampang Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 183, type: "RS", name: "AMBULATORY CARE CENTRE EVERSUITE", address: "A-G-01, Jalan PJU 1A/41, Ara Damansara, 47301 Petaling Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 184, type: "RS", name: "COLUMBIA ASIA HOSPITAL KLANG", address: "Jalan Mahkota 1/KU 2, Mutiara Bukit Raja 2, Klang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 185, type: "RS", name: "UITM PRIVATE HEALTHCARE SDN BHD", address: "Level 2 & 5, Clinical Building, Faculty of Medicine, SG. Buloh Campus, Jalan Hospital, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 186, type: "RS", name: "PERAK COMMUNITY SPECIALIST HOSPITAL", address: "277, Jalan Raja Permaisuri Bainun, 30250 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 187, type: "RS", name: "UCSI HOSPITAL", address: "No 2, Avenue 3, Persiaran Springhill, 71010 Port Dickson, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 188, type: "RS", name: "KPJ BANDAR MAHARANI SPECIALIST HOSPITAL", address: "73-1, Jln Stadium, Kampung Baharu, 84000 Muar, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 189, type: "RS", name: "CMH SPECIALIST HOSPITAL", address: "Lot 3900, Jln Tun Dr. Ismail, Bandar Seremban, 70200 Seremban, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 190, type: "RS", name: "HOSPITAL REHABILITASI CHERAS", address: "Jalan Yaacob Latif, Bandar Tun Razak, 56000 Cheras, Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 191, type: "RS", name: "INSTITUT PERUBATAN RESPIRATORI", address: "Jalan Pahang, Pekeliling, 53000 Kuala Lumpur, Malaysia", country: "MALAYSIA" },
  { no: 192, type: "RS", name: "HOSPITAL PERMAI JOHOR BHARU", address: "Jln Persiaran Kempas Baru, Kempas Banjaran, 81200 Johor Bahru, Johor, Malaysia", country: "MALAYSIA" },
  { no: 193, type: "RS", name: "HOSPITAL SULTAN ISMAIL PETRA", address: "KM 6, Jalan Kuala Krai - Gua Musang, 18000 Kuala Krai, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 194, type: "RS", name: "BINTULU MEDICAL CENTRE", address: "Lot 6009, Block 31 Kemena Land District, 97000 Bintulu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 195, type: "RS", name: "RAFFLESIA MEDICAL CENTRE SDN BHD", address: "Lot 4-9, Millennium Commercial Centre, Off Jln Lintas, Kepayan, 88200 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 196, type: "RS", name: "IIUM MEDICAL CENTRE", address: "Kulliyyah of Medicine IIUM Kuantan Campus, Bandar Indera Mahkota, 25200 Kuantan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 197, type: "RS", name: "HOSPITAL SERI BOTANI SDN BHD", address: "No. 3, Dataran Botani 2, Bandar Seri Botani, 31350 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 198, type: "RS", name: "HOSPITAL CYBERJAYA", address: "Persiaran Multimedia, Cyber 11, 63000 Cyberjaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 199, type: "RS", name: "TAWAU SPECIALIST MEDICAL CENTRE SABAH SDN BHD", address: "No 3680, Tinagat Plaza, Mile 2.5, Jalan Bunga Raya, Off Jalan Apas, 91000 Tawau, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 200, type: "RS", name: "MAHSA SPECIALIST HOSPITAL SDN BHD", address: "Jln SP 1/3, Bandar Saujana Putra, 42610 Jenjarom, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 201, type: "RS", name: "HOSPITAL UNIVERSITI TUNKU ABDUL RAHMAN", address: "Jalan Hospital UTAR, 31900 Kampar, Perak, Malaysia", country: "MALAYSIA" },
  { no: 202, type: "RS", name: "PUTRA MEDICAL CENTRE SELANGOR", address: "47, Jalan BRP 1/3, Bukit Rahman Putra, 47000 Sungai Buloh, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 203, type: "RS", name: "HOSPITAL PORT DICKSON", address: "KM 11, Jalan Pantai, 71050 Port Dickson, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 204, type: "RS", name: "HOSPITAL TAPAH", address: "Jalan Temoh, 35000 Tapah, Perak, Malaysia", country: "MALAYSIA" },
  { no: 205, type: "RS", name: "HOSPITAL SULTAN ABDUL HALIM SUNGAI PETANI", address: "225, Bandar Amanjaya, 08000 Sungai Petani, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 206, type: "RS", name: "HOSPITAL CHANGKAT MELINTANG", address: "Lambor Kanan, Parit Perak, 32900 Bota, Perak, Malaysia", country: "MALAYSIA" },
  { no: 207, type: "RS", name: "HOSPITAL SULTANAH BAHIYAH", address: "KM 6, Jln Langgar, Bandar, 05460 Alor Setar, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 208, type: "RS", name: "HOSPITAL YAN", address: "Batu 25, Jalan Yan, Kampung Sungai Udang, 06900 Yan, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 209, type: "RS", name: "HOSPITAL SELAMA", address: "Jalan Taiping Selama, 34100 Selama, Perak, Malaysia", country: "MALAYSIA" },
  { no: 210, type: "RS", name: "HOSPITAL KUALA KANGSAR", address: "Jalan Sultan Idris Shah 1, Taman Mawar, 33000 Kuala Kangsar, Perak, Malaysia", country: "MALAYSIA" },
  { no: 211, type: "RS", name: "HOSPITAL JELEBU", address: "Jln Kuala Klawang - Titi, 71600 Kuala Klawang, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 212, type: "RS", name: "HOSPITAL TENGKU AMPUAN NAJIHAH", address: "KM 3, Jalan Melang, Kampung Gemelang, 72000 Kuala Pilah, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 213, type: "RS", name: "HOSPITAL TAIPING", address: "Jalan Taming Sari, 34000 Taiping, Perak, Malaysia", country: "MALAYSIA" },
  { no: 214, type: "RS", name: "HOSPITAL TUANKU JA'AFAR SEREMBAN", address: "Jalan Rasah, Bukit Rasah, 70300 Seremban, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 215, type: "RS", name: "HOSPITAL PULAU PINANG", address: "Jalan Residensi, 10450 George Town, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 216, type: "RS", name: "HOSPITAL SUNGAI SIPUT", address: "Jalan Taiping Selama, 31100 Sungai Siput, Perak, Malaysia", country: "MALAYSIA" },
  { no: 217, type: "RS", name: "HOSPITAL TAMPIN", address: "Jalan Haji Ahmad Zainuddin, Tampin, Negeri Sembilan, Malaysia", country: "MALAYSIA" },
  { no: 218, type: "RS", name: "HOSPITAL ENCHE BESAR HAJJAH KALSOM", address: "91, 86000 Kluang, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 219, type: "RS", name: "HOSPITAL BALIK PULAU", address: "Jalan Balik Pulau, 11000 Balik Pulau, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 220, type: "RS", name: "HOSPITAL PAKAR SULTANAH FATIMAH", address: "Jln Salleh, Taman Utama Satu, 84000 Muar, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 221, type: "RS", name: "HOSPITAL KAMPAR", address: "Jalan Hospital, Kampung Masjid, 31900 Kampar, Perak, Malaysia", country: "MALAYSIA" },
  { no: 222, type: "RS", name: "HOSPITAL JASIN", address: "Hospital Utama, Kampung Jasin Hilir, Melaka, Malaysia", country: "MALAYSIA" },
  { no: 223, type: "RS", name: "HOSPITAL GERIK", address: "Jalan Intan, Pekan Gerik, 33300 Gerik, Perak, Malaysia", country: "MALAYSIA" },
  { no: 224, type: "RS", name: "HOSPITAL RAJA PERMAISURI BAINUN", address: "Jalan Raja Ashman Shah, 30450 Ipoh, Perak, Malaysia", country: "MALAYSIA" },
  { no: 225, type: "RS", name: "HOSPITAL SULTAN IDRIS SHAH SERDANG", address: "Jalan Puchong, 43000 Kajang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 226, type: "RS", name: "HOSPITAL KUALA NERANG", address: "Kuala Nerang, 06300 Kuala Nerang, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 227, type: "RS", name: "HOSPITAL KULIM", address: "Lebuh Taman Perindustrian, Taman Kulim Hi-Tech, 09090 Kulim, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 228, type: "RS", name: "HOSPITAL SULTANAH MALIHA LANGKAWI", address: "Jalan Padang Matsirat, Bukit Tekuh, 07000 Langkawi, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 229, type: "RS", name: "HOSPITAL SIK", address: "Pekan Sik, 08220 Sik, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 230, type: "RS", name: "HOSPITAL KAJANG", address: "Bandar Kajang, 43000 Kajang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 231, type: "RS", name: "HOSPITAL JITRA", address: "Pekan Jitra, 06000 Jitra, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 232, type: "RS", name: "HOSPITAL TUANKU FAUZIAH", address: "3, Jalan Tun Abdul Razak, Pusat Bandar Kangar, 01000 Kangar, Perlis, Malaysia", country: "MALAYSIA" },
  { no: 233, type: "RS", name: "HOSPITAL MERSING", address: "Jln Ismail, Mersing Kechil, 86800 Mersing, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 234, type: "RS", name: "HOSPITAL TENGKU AMPUAN RAHIMAH", address: "Jalan Langat, 41200 Klang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 235, type: "RS", name: "HOSPITAL BUKIT MERTAJAM", address: "Jln Kulim, 14000 Bukit Mertajam, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 236, type: "RS", name: "HOSPITAL SUNGAI BULOH", address: "Jalan Hospital, 47000 Sungai Buloh, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 237, type: "RS", name: "HOSPITAL KEPALA BATAS", address: "Jalan Bertam 2, 13200 Kepala Batas, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 238, type: "RS", name: "HOSPITAL SEBERANG JAYA", address: "Jalan Tun Hussein Onn, Seberang Jaya, Pulau Pinang, Malaysia", country: "MALAYSIA" },
  { no: 239, type: "RS", name: "HOSPITAL BATU GAJAH", address: "Jalan Changkat, Jalan Hospital, Batu Gajah, Perak, Malaysia", country: "MALAYSIA" },
  { no: 240, type: "RS", name: "HOSPITAL TANJUNG KARANG", address: "KM8, Jalan Sungai Terap 5, 45500 Tanjong Karang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 241, type: "RS", name: "HOSPITAL BALING", address: "Jalan Hospital, Baling, 09100 Baling, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 242, type: "RS", name: "HOSPITAL KOTA BELUD", address: "Peti Surat 159, Jalan Hospital, Kota Belud, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 243, type: "RS", name: "HOSPITAL KUALA LIPIS", address: "27200 Kuala Lipis, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 244, type: "RS", name: "HOSPITAL TENGKU AMPUAN AFZAN", address: "Jalan Tanah Putih, 25100 Kuantan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 245, type: "RS", name: "HOSPITAL DUNGUN", address: "Jalan Paka, 23000 Kuala Dungun, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 246, type: "RS", name: "HOSPITAL SARATOK", address: "Jalan Saratok, 95400 Saratok, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 247, type: "RS", name: "HOSPITAL SRI AMAN", address: "Jalan Mangga, Pekan Sri Aman, 95000 Simanggang, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 248, type: "RS", name: "HOSPITAL SIPITANG", address: "Kilometer 2 Jalan Sipitang - Beaufort, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 249, type: "RS", name: "HOSPITAL TUARAN", address: "Peti Surat 996, Kampung Berungis, 89207 Tuaran, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 250, type: "RS", name: "HOSPITAL KOTA MARUDU", address: "Peti Surat 255, 89100 Kota Marudu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 251, type: "RS", name: "HOSPITAL MUKAH", address: "Jalan Haji Mohd Fauzi, 96400 Mukah, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 252, type: "RS", name: "HOSPITAL BINTULU", address: "Jalan Nyabau, 97000 Bintulu, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 253, type: "RS", name: "HOSPITAL MELAKA", address: "Jalan Mufti Haji Khalil, 75400 Melaka, Malaysia", country: "MALAYSIA" },
  { no: 254, type: "RS", name: "HOSPITAL SULTANAH AMINAH", address: "Jalan Persiaran Abu Bakar Sultan, 80100 Johor Bahru, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 255, type: "RS", name: "HOSPITAL SULTANAH NORA ISMAIL", address: "Jalan Korma, Taman Soga, 83000 Batu Pahat, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 256, type: "RS", name: "HOSPITAL TANGKAK", address: "Kampung Padang Lalang, 84900 Tangkak, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 257, type: "RS", name: "HOSPITAL KEMAMAN", address: "Jalan Da' Omar, 24000 Chukai, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 258, type: "RS", name: "HOSPITAL PONTIAN", address: "Jln. Alsagoff, Kampung Dalam, 82000 Pontian, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 259, type: "RS", name: "HOSPITAL JERANTUT", address: "Taman LKNP, 27000 Jerantut, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 260, type: "RS", name: "HOSPITAL SULTAN HAJI AHMAD SHAH", address: "Jalan Maran, Taman Harapan, 28000 Temerloh, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 261, type: "RS", name: "HOSPITAL PASIR MAS", address: "17000 Pasir Mas, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 262, type: "RS", name: "HOSPITAL SEGAMAT", address: "6, Jalan Genuang, Bandar Putra, 85000 Segamat, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 263, type: "RS", name: "HOSPITAL TEMENGGUNG SERI MAHARAJA TUN IBRAHIM", address: "Lebuhraya Senai, Senai Hwy, 81000 Kulai, Johor Darul Ta'zim, Malaysia", country: "MALAYSIA" },
  { no: 264, type: "RS", name: "HOSPITAL BENTONG", address: "Jalan Padang, 28700 Bentong, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 265, type: "RS", name: "HOSPITAL JENGKA", address: "Bandar Jengka Maran, 26400 Bandar Tun Razak, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 266, type: "RS", name: "HOSPITAL RAUB", address: "Jalan Tengku Abdul Samad, Kampung Baru Sungai Lui, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 267, type: "RS", name: "HOSPITAL BESUT", address: "Jalan Pasir Akar, Kampung Tanduk, 22000 Jerteh, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 268, type: "RS", name: "HOSPITAL RAJA PEREMPUAN ZAINAB II", address: "Bandar Kota Bharu, 15586 Kota Bharu, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 269, type: "RS", name: "HOSPITAL BEAUFORT", address: "Peti Surat 40, 89807 Beaufort, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 270, type: "RS", name: "HOSPITAL DUCHESS OF KENT", address: "KM 3.2, Jalan Utara, 90000 Sandakan, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 271, type: "RS", name: "HOSPITAL PEKAN", address: "Jalan Batu Balik, Kampung Mengkasar, 26600 Pekan, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 272, type: "RS", name: "HOSPITAL TUMPAT", address: "Jalan Kelaburan, 16200 Tumpat, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 273, type: "RS", name: "HOSPITAL KINABATANGAN", address: "W.D.T 200, 90200 Kinabatangan, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 274, type: "RS", name: "HOSPITAL HULU TERENGGANU", address: "Batu 23, Jln Kuala Berang, Kampung Batu 23, 21700 Kuala Berang, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 275, type: "RS", name: "HOSPITAL SULTAN ISMAIL", address: "Jalan Mutiara Emas Utama, Taman Mount Austin, 81100 Johor Bahru, Johor, Malaysia", country: "MALAYSIA" },
  { no: 276, type: "RS", name: "HOSPITAL SULTANAH NUR ZAHIRAH", address: "Jalan Sultan Mahmud, 20400 Kuala Terengganu, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 277, type: "RS", name: "HOSPITAL QUEEN ELIZABETH II", address: "Lorong Bersatu, Off Jalan Damai, Luyang Commercial Centre, 88300 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 278, type: "RS", name: "HOSPITAL PSIKIARTRI SENTOSA", address: "Batu 7, Jalan Penrissen, Kota Sentosa, 93250 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 279, type: "RS", name: "HOSPITAL RANAU", address: "Kedai SEDCO, Tingkat 1, Blok A, Lot No. 3, Pekan Ranau, 89308 Ranau, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 280, type: "RS", name: "HOSPITAL SEMPORNA", address: "Jalan Hospital, Pekan Semporna, 91307 Semporna, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 281, type: "RS", name: "HOSPITAL WANITA DAN KANAK KANAK SABAH", address: "Karung Berkunci 187, 88996 Kota Kinabalu, Sabah, Malaysia", country: "MALAYSIA" },
  { no: 282, type: "RS", name: "HOSPITAL SULTANAH HAJJAH KALSOM", address: "Tanah Rata, Cameron Highlands, 39000 Tanah Rata, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 283, type: "RS", name: "HOSPITAL RAJAH CHARLES BROOK MEMORIAL", address: "Batu 13, Jalan Puncak Borneo, Kota Padawan, 93250 Kuching, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 284, type: "RS", name: "HOSPITAL KUALA KRAI", address: "D223, Pahi, Jalan Kuala Krai - Gua Musang, 18000 Kuala Krai, Kelantan, Malaysia", country: "MALAYSIA" },
  { no: 285, type: "RS", name: "QHC MEDICAL CENTRE", address: "2, Jalan USJ 9/5R, Subang Business Centre, 47620 Subang Jaya, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 286, type: "RS", name: "PUTRA MEDICAL CENTRE KEDAH", address: "888, Jalan Sekerat, Off Jln Tunku Abdul Rahman Putra, 05100 Alor Setar, Kedah, Malaysia", country: "MALAYSIA" },
  { no: 287, type: "RS", name: "PANTAI HOSPITAL KLANG", address: "Lot 5921, Persiaran Raja Muda Musa, Taman Radzi, 41200 Klang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 288, type: "RS", name: "KMI KUALA TERENGGANU MEDICAL CENTRE", address: "Lot 3963, Jalan Sultan Mahmud, 20400 Kuala Terengganu, Terengganu, Malaysia", country: "MALAYSIA" },
  { no: 289, type: "RS", name: "SALAM SHAH ALAM SPECIALIST HOSPITAL", address: "2-14, Jalan Nelayan 19/B, Seksyen 19, 40300 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 290, type: "RS", name: "BUKIT TINGGI HOSPITAL SDN BHD", address: "Lot 83211, Persiaran Batu Nilam, Bandar Bukit Tinggi 1, 41200 Klang, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 291, type: "RS", name: "AVISENA SPECIALIST HOSPITAL", address: "No. 3, Jalan Perdagangan 14/4, Seksyen 14, 40000 Shah Alam, Selangor, Malaysia", country: "MALAYSIA" },
  { no: 292, type: "RS", name: "HOSPITAL PENAWAR", address: "No 15-19, Business Center, Jalan Bandar, Kawasan Perindustrian Pasir Gudang, 81700 Pasir Gudang, Johor, Malaysia", country: "MALAYSIA" },
  { no: 293, type: "RS", name: "DARUL MAKMUR MEDICAL CENTRE", address: "Jalan Kempadang Makmur, Taman Kempadang Makmur, Pahang, Malaysia", country: "MALAYSIA" },
  { no: 294, type: "RS", name: "REJANG MEDICAL CENTRE", address: "No. 29, Jalan Pedada, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 295, type: "RS", name: "MIRI CITY MEDICAL CENTRE", address: "Lot 916-920 & 1203 Jalan Hokkien, 98000 Miri, Sarawak, Malaysia", country: "MALAYSIA" },
  { no: 296, type: "RS", name: "SENTOSA SPECIALIST HOSPITAL", address: "No. 27-29, Lorong Temenggung 15A, Off Jalan Sungai Jati, Malaysia", country: "MALAYSIA" },
  { no: 297, type: "RS", name: "SINGAPORE GENERAL HOSPITAL", address: "Outram Rd, Singapore 169608", country: "SINGAPORE" },
  { no: 298, type: "RS", name: "NATIONAL UNIVERSITY HOSPITAL", address: "5 Lower Kent Ridge Rd, Singapore 119074", country: "SINGAPORE" },
]

const PROVIDERS: Provider[] = RAW_DATA.map(r => ({
  ...r,
  state: extractState(r.address, r.country),
  city: r.address.split(",")[0].trim(),
  network: extractNetwork(r.name),
}))

// ─── Filter options ──────────────────────────────────────────────────────────

const STATES = Array.from(new Set(PROVIDERS.map(p => p.state))).sort()
const NETWORKS = Array.from(new Set(PROVIDERS.map(p => p.network))).sort()
const COUNTRIES_LIST = ["MALAYSIA", "SINGAPORE"]

const NETWORK_COLORS: Record<string, string> = {
  KPJ: "bg-blue-50 text-blue-700 border-blue-200",
  Pantai: "bg-pink-50 text-pink-700 border-pink-200",
  Gleneagles: "bg-violet-50 text-violet-700 border-violet-200",
  "Columbia Asia": "bg-orange-50 text-orange-700 border-orange-200",
  Sunway: "bg-yellow-50 text-yellow-700 border-yellow-200",
  KMI: "bg-cyan-50 text-cyan-700 border-cyan-200",
  IHH: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Kerajaan: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Swasta: "bg-gray-50 text-gray-600 border-gray-200",
}

type SortKey = "no" | "name" | "state" | "network" | "country"
type SortDir = "asc" | "desc"

const PAGE_SIZE = 25

// ─── Sub-components ──────────────────────────────────────────────────────────

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="h-3 w-3 text-gray-300" />
  return sortDir === "asc" ? <ChevronUp className="h-3 w-3 text-gray-700" /> : <ChevronDown className="h-3 w-3 text-gray-700" />
}

function NetworkBadge({ network }: { network: string }) {
  const cls = NETWORK_COLORS[network] || "bg-gray-50 text-gray-600 border-gray-200"
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {network}
    </span>
  )
}

function CountryFlag({ country }: { country: string }) {
  return <span className="text-sm">{country === "SINGAPORE" ? "🇸🇬" : "🇲🇾"}</span>
}

function ProviderCard({ provider, idx }: { provider: Provider; idx: number }) {
  return (
    <div className={`group bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-md transition-all duration-200 ${idx % 2 === 0 ? "" : ""}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <span className="text-[10px] font-bold text-gray-500">{provider.no}</span>
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-700">{provider.name}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <NetworkBadge network={provider.network} />
              <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{provider.type}</span>
            </div>
          </div>
        </div>
        <CountryFlag country={provider.country} />
      </div>
      <div className="space-y-1.5 text-[11px] text-gray-500">
        <div className="flex items-start gap-1.5">
          <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-gray-300" />
          <span className="line-clamp-2 leading-relaxed">{provider.address}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Globe2 className="h-3 w-3 shrink-0 text-gray-300" />
          <span className="font-medium text-gray-700">{provider.state}</span>
          <span className="text-gray-300">·</span>
          <span>{provider.country}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function OverseasProviderPage() {
  const [query, setQuery] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<string>("")
  const [selectedState, setSelectedState] = useState<string>("")
  const [selectedNetwork, setSelectedNetwork] = useState<string>("")
  const [sortKey, setSortKey] = useState<SortKey>("no")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [page, setPage] = useState(1)
  const [view, setView] = useState<"table" | "grid">("table")
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let data = PROVIDERS
    if (query) {
      const q = query.toLowerCase()
      data = data.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.network.toLowerCase().includes(q)
      )
    }
    if (selectedCountry) data = data.filter(p => p.country === selectedCountry)
    if (selectedState) data = data.filter(p => p.state === selectedState)
    if (selectedNetwork) data = data.filter(p => p.network === selectedNetwork)

    data = [...data].sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const cmp = typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv))
      return sortDir === "asc" ? cmp : -cmp
    })
    return data
  }, [query, selectedCountry, selectedState, selectedNetwork, sortKey, sortDir])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasFilters = !!(query || selectedCountry || selectedState || selectedNetwork)

  const clearFilters = () => {
    setQuery(""); setSelectedCountry(""); setSelectedState(""); setSelectedNetwork(""); setPage(1)
  }

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortKey(key); setSortDir("asc") }
    setPage(1)
  }

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1) }

  // Summary stats
  const malaysiaCnt = PROVIDERS.filter(p => p.country === "MALAYSIA").length
  const singaporeCnt = PROVIDERS.filter(p => p.country === "SINGAPORE").length
  const networkGroups = NETWORKS.map(n => ({ name: n, count: PROVIDERS.filter(p => p.network === n).length }))
    .sort((a, b) => b.count - a.count)

  const exportCSV = () => {
    const header = "No,Type,Nama Provider,Alamat,State,Negara,Network\n"
    const rows = filtered.map(p =>
      `${p.no},${p.type},"${p.name}","${p.address}",${p.state},${p.country},${p.network}`
    ).join("\n")
    const blob = new Blob([header + rows], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "overseas-providers.csv"; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-500">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 sm:p-10">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe2 className="h-5 w-5 text-blue-400" />
              <span className="text-xs font-semibold tracking-widest uppercase text-blue-400">Overseas Provider Network</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Provider Malaysia & Singapura
            </h1>
            <p className="text-sm text-white/60 mt-2 max-w-lg">
              Direktori lengkap {PROVIDERS.length} provider rumah sakit jaringan overseas — data resmi Generali.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">{PROVIDERS.length}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Total Provider</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">🇲🇾 {malaysiaCnt}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Malaysia</p>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 text-center backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">🇸🇬 {singaporeCnt}</p>
              <p className="text-[11px] text-white/50 mt-0.5">Singapura</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Network breakdown strip ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {networkGroups.map(g => (
          <button
            key={g.name}
            onClick={() => handleFilterChange(() => setSelectedNetwork(n => n === g.name ? "" : g.name))}
            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
              selectedNetwork === g.name
                ? "bg-gray-900 text-white border-transparent shadow-sm"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span>{g.name}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${selectedNetwork === g.name ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {g.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-50">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={e => handleFilterChange(() => setQuery(e.target.value))}
              placeholder="Cari nama provider, alamat, state, atau jaringan..."
              className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-400 focus:bg-white transition-all"
            />
            {query && (
              <button onClick={() => handleFilterChange(() => setQuery(""))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl border transition-all ${
                showFilters || hasFilters ? "bg-gray-900 text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Filter</span>
              {hasFilters && <span className="text-[10px] bg-white/20 text-white px-1.5 rounded-full font-bold">ON</span>}
            </button>
            <button
              onClick={() => setView(v => v === "table" ? "grid" : "table")}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
              title={view === "table" ? "Grid view" : "Table view"}
            >
              {view === "table" ? <LayoutGrid className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-xl border bg-white text-gray-600 border-gray-200 hover:bg-gray-50 transition-all"
              title="Export CSV"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* ── Filters expanded ── */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-b border-gray-50 bg-gray-50/50">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Negara</label>
              <select
                value={selectedCountry}
                onChange={e => handleFilterChange(() => setSelectedCountry(e.target.value))}
                className="w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-400 transition-all"
              >
                <option value="">Semua Negara</option>
                {COUNTRIES_LIST.map(c => (
                  <option key={c} value={c}>{c === "MALAYSIA" ? "🇲🇾 Malaysia" : "🇸🇬 Singapura"}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">State / Wilayah</label>
              <select
                value={selectedState}
                onChange={e => handleFilterChange(() => setSelectedState(e.target.value))}
                className="w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-400 transition-all"
              >
                <option value="">Semua State</option>
                {STATES.map(s => (
                  <option key={s} value={s}>{s} ({PROVIDERS.filter(p => p.state === s).length})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5 block">Jaringan</label>
              <select
                value={selectedNetwork}
                onChange={e => handleFilterChange(() => setSelectedNetwork(e.target.value))}
                className="w-full text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-gray-400 transition-all"
              >
                <option value="">Semua Jaringan</option>
                {NETWORKS.map(n => (
                  <option key={n} value={n}>{n} ({PROVIDERS.filter(p => p.network === n).length})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Result bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Hospital className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[12px] text-gray-500">
              Menampilkan <span className="font-bold text-gray-900">{filtered.length}</span> dari <span className="font-bold text-gray-900">{PROVIDERS.length}</span> provider
            </span>
            {hasFilters && (
              <button onClick={clearFilters}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600 ml-2 bg-red-50 px-2 py-0.5 rounded-lg transition-colors">
                <X className="h-3 w-3" /> Reset filter
              </button>
            )}
          </div>
          <span className="text-[11px] text-gray-400">
            Hal {page} / {totalPages || 1}
          </span>
        </div>

        {/* ── Table view ── */}
        {view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  {[
                    { key: "no" as SortKey, label: "No", w: "w-14" },
                    { key: "name" as SortKey, label: "Nama Provider", w: "" },
                    { key: "state" as SortKey, label: "State / Wilayah", w: "w-36" },
                    { key: "network" as SortKey, label: "Jaringan", w: "w-32" },
                    { key: "country" as SortKey, label: "Negara", w: "w-28" },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      className={`${col.w} px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800 transition-colors`}
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Search className="h-8 w-8 text-gray-200" />
                        <p className="text-sm font-medium text-gray-400">Tidak ada provider ditemukan</p>
                        <button onClick={clearFilters} className="text-[12px] text-blue-500 hover:underline">Hapus semua filter</button>
                      </div>
                    </td>
                  </tr>
                ) : paginated.map((p, i) => (
                  <tr key={p.no} className={`group transition-colors hover:bg-blue-50/30 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-[11px] font-bold text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        {p.no}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0 mt-0.5">{p.type}</span>
                          <span className="text-sm font-semibold text-gray-900 leading-snug">{p.name}</span>
                        </div>
                        <div className="flex items-start gap-1 text-[11px] text-gray-400 ml-0">
                          <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="leading-relaxed line-clamp-1">{p.address}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[12px] font-medium text-gray-700">{p.state}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <NetworkBadge network={p.network} />
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <CountryFlag country={p.country} />
                        <span className="text-[11px] font-medium text-gray-600">{p.country === "SINGAPORE" ? "Singapore" : "Malaysia"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Grid view ── */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginated.length === 0 ? (
              <div className="col-span-full flex flex-col items-center gap-3 py-16">
                <Search className="h-8 w-8 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">Tidak ada provider ditemukan</p>
                <button onClick={clearFilters} className="text-[12px] text-blue-500 hover:underline">Hapus semua filter</button>
              </div>
            ) : paginated.map((p, i) => <ProviderCard key={p.no} provider={p} idx={i} />)}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-50 bg-gray-50/30">
            <p className="text-[12px] text-gray-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} dari {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pg: number
                if (totalPages <= 7) pg = i + 1
                else if (page <= 4) pg = i + 1
                else if (page >= totalPages - 3) pg = totalPages - 6 + i
                else pg = page - 3 + i
                return pg
              }).map(pg => (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  className={`w-7 h-7 text-[12px] font-semibold rounded-lg transition-all ${
                    pg === page ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {pg}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── State Distribution Table ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Distribusi per State / Wilayah</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Jumlah provider di setiap wilayah</p>
          </div>
          <Shield className="h-4 w-4 text-gray-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">State / Wilayah</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Negara</th>
                <th className="px-5 py-2.5 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-5 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Proporsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {STATES.map(state => {
                const count = PROVIDERS.filter(p => p.state === state).length
                const country = state === "Singapore" ? "SINGAPORE" : "MALAYSIA"
                const pct = Math.round((count / PROVIDERS.length) * 100)
                return (
                  <tr key={state}
                    onClick={() => handleFilterChange(() => { setSelectedState(s => s === state ? "" : state); setShowFilters(true) })}
                    className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                  >
                    <td className="px-5 py-2.5">
                      <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors">{state}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <CountryFlag country={country} />
                        <span className="text-[11px] text-gray-500">{country === "SINGAPORE" ? "Singapore" : "Malaysia"}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className="text-sm font-bold text-gray-900">{count}</span>
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 max-w-[120px]">
                          <div
                            className="bg-gray-800 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.max(pct * 3, 4)}%`, maxWidth: "100%" }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-400 w-8 shrink-0">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-100 bg-gray-50">
                <td colSpan={2} className="px-5 py-3 text-[12px] font-bold text-gray-700">Total</td>
                <td className="px-5 py-3 text-right text-[12px] font-bold text-gray-900">{PROVIDERS.length}</td>
                <td className="px-5 py-3">
                  <span className="text-[11px] text-gray-400">100%</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Network summary ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Ringkasan per Jaringan</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Klasifikasi berdasarkan grup/jaringan rumah sakit</p>
          </div>
          <Building2 className="h-4 w-4 text-gray-300" />
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {networkGroups.map(g => {
            const pct = Math.round((g.count / PROVIDERS.length) * 100)
            const cls = NETWORK_COLORS[g.name] || "bg-gray-50 text-gray-600 border-gray-200"
            return (
              <button
                key={g.name}
                onClick={() => handleFilterChange(() => setSelectedNetwork(n => n === g.name ? "" : g.name))}
                className={`flex flex-col gap-2 p-4 rounded-xl border text-left transition-all hover:shadow-sm ${
                  selectedNetwork === g.name ? "ring-2 ring-gray-900 ring-offset-1" : ""
                } ${cls}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{g.name}</span>
                  <Star className={`h-3 w-3 ${selectedNetwork === g.name ? "fill-current" : ""}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{g.count}</p>
                  <p className="text-[10px] opacity-70 mt-0.5">provider · {pct}%</p>
                </div>
                <div className="w-full bg-current/10 rounded-full h-1">
                  <div className="bg-current h-1 rounded-full" style={{ width: `${pct * 3}%`, maxWidth: "100%" }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

    </div>
  )
}
