<?php
// Izinkan CORS
require_once 'api-common.php';

// Tangani pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// Include koneksi database
include 'db.php';

// Ambil data dari request body
$data = json_decode(file_get_contents("php://input"), true);

// Pastikan data yang diperlukan ada
if (isset($data['name']) && isset($data['rfid_id'])) {
    $name = $data['name'];
    $rfid_id = $data['rfid_id'];

    // Validasi data, pastikan nama dan RFID tidak kosong
    if (empty($name) || empty($rfid_id)) {
        echo json_encode(['status' => 'error', 'message' => 'Nama dan RFID harus diisi']);
        exit();
    }

    // Buat query menggunakan prepared statement untuk menghindari SQL Injection
    $stmt = $conn->prepare("INSERT INTO users (name, rfid_id) VALUES (?, ?)");
    $stmt->bind_param("ss", $name, $rfid_id); // ss berarti keduanya adalah string

    // Eksekusi query dan cek apakah berhasil
    if ($stmt->execute()) {
        // Jika berhasil, kirimkan status success dan user_id
        echo json_encode(['status' => 'success', 'user_id' => $stmt->insert_id]);
    } else {
        // Jika ada error, kirimkan pesan error
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan data pengguna']);
    }

    // Tutup statement
    $stmt->close();
} else {
    // Jika data tidak lengkap, kirimkan pesan error
    echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap']);
}

// Tutup koneksi database
$conn->close();
?>
