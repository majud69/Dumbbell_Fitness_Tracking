<?php
// Mulai output buffering
ob_start();

// Include centralized API common functions
require_once 'api-common.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean(); // Bersihkan buffer sebelum exit
    exit();
}

// Database configuration
$servername = "localhost";
$username = "fitness_user";    // MySQL username
$password = "secure_password"; // MySQL password
$dbname = "fitness_tracker";   // Your database name

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    // Clear any previous output to prevent error responses
    ob_end_clean();
    
    // Return JSON error response instead of die()
    header('Content-Type: application/json');
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]);
    exit();
}

// Set charset for proper UTF-8 support
$conn->set_charset("utf8mb4");

// Optional: Set timezone if needed
date_default_timezone_set('Asia/Jakarta'); // Change to your timezone

// Bersihkan buffer setelah koneksi berhasil, namun jangan akhiri buffering
// untuk memungkinkan file lain yang menggunakan db.php untuk menangkap output
ob_clean();

// Mulai buffer baru untuk file yang menggunakan db.php
ob_start();
?>