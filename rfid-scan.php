<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
require_once 'api-common.php';

// Tambahkan log
error_log("rfid-scan.php accessed at " . date('Y-m-d H:i:s'));

// Tangani pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include the database connection
include 'db.php';

// Log request data
$raw_data = file_get_contents("php://input");
error_log("Raw request data: " . $raw_data);

// Get the RFID ID from the request body
$data = json_decode($raw_data);

if ($data === null) {
    error_log("JSON parsing failed. Raw data: " . $raw_data);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON data']);
    exit();
}

$rfid_id = $data->rfid_id;
error_log("RFID ID extracted: " . $rfid_id);

// Check if the RFID exists in the users table
$query = "SELECT * FROM users WHERE rfid_id = '$rfid_id'";
error_log("Executing query: " . $query);

$result = $conn->query($query);

// If user exists, return the user data
if ($result && $result->num_rows > 0) {
    $user = $result->fetch_assoc();
    error_log("User found: ID=" . $user['id'] . ", Name=" . $user['name']);
    echo json_encode(['status' => 'success', 'user_exists' => true, 'user_data' => $user]);
} else {
    // If user does not exist, return status
    error_log("No user found with RFID: " . $rfid_id);
    echo json_encode(['status' => 'success', 'user_exists' => false]);
}

$conn->close();
?>