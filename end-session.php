<?php
require_once 'api-common.php';

// Tangani pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include the database connection
include 'db.php';

// Get the data from the POST request
$data = json_decode(file_get_contents("php://input"));

// Check if the required fields are present
if (isset($data->session_id)) {
    $session_id = $data->session_id;
    $total_reps = isset($data->total_reps) ? intval($data->total_reps) : 0;
    $total_sets = isset($data->total_sets) ? intval($data->total_sets) : 0;
    $total_calories = isset($data->total_calories) ? floatval($data->total_calories) : 0;
    $avg_form_score = isset($data->avg_form_score) ? floatval($data->avg_form_score) : 0;
    $end_time = date('Y-m-d H:i:s'); // Get the current timestamp for the end time

    // Escape strings to prevent SQL injection
    $session_id = $conn->real_escape_string($session_id);

    // Update the session in the database with the summary data
    $query = "UPDATE sessions 
              SET end_time = '$end_time', total_reps = $total_reps, total_sets = $total_sets, total_calories = $total_calories, avg_form_score = $avg_form_score
              WHERE session_id = '$session_id'";

    if ($conn->query($query) === TRUE) {
        // If successful, return success message
        echo json_encode(['status' => 'success', 'message' => 'Session ended successfully']);
    } else {
        // If there's an error, return the error message
        echo json_encode(['status' => 'error', 'message' => $conn->error]);
    }
} else {
    // If required fields are missing, return error message
    echo json_encode(['status' => 'error', 'message' => 'Missing required field: session_id']);
}

// Close the database connection
$conn->close();
?>