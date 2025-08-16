<?php
require_once 'api-common.php';

// Tangani pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}
// Include the database connection
include 'db.php';

// Get the session data from the request body
$data = json_decode(file_get_contents("php://input"));
$user_id = $data->user_id;
$weight = $data->weight;
$session_id = $data->session_id;
$start_time = date('Y-m-d H:i:s');

// Insert a new session into the database
$query = "INSERT INTO sessions (session_id, user_id, dumbbell_weight, start_time) 
          VALUES ('$session_id', '$user_id', '$weight', '$start_time')";

if ($conn->query($query) === TRUE) {
    // Return success if session is started
    echo json_encode(['status' => 'success', 'session_id' => $session_id]);
} else {
    // Return error message if the session could not be created
    echo json_encode(['status' => 'error', 'message' => $conn->error]);
}

$conn->close();
?>
