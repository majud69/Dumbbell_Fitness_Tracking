<?php
/**
 * get-workout-dates.php
 * 
 * API endpoint to get all workout dates for a user.
 * Used for calculating workout streaks.
 */

// Disable errors for clean output
error_reporting(0);

// Clean output buffering
ob_start();

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    ob_end_clean();
    exit();
}

// Include database connection
require_once 'db.php';

// Get user ID
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

// Validate input
if (!$user_id) {
    ob_end_clean();
    echo json_encode([
        'status' => 'error',
        'message' => 'User ID is required'
    ]);
    exit();
}

// Get all workout dates for this user
$query = "
    SELECT DISTINCT DATE(wd.timestamp) as workout_date
    FROM workout_data wd
    JOIN sessions s ON wd.session_id = s.session_id
    WHERE s.user_id = ?
    ORDER BY workout_date DESC
";

$stmt = $conn->prepare($query);
$stmt->bind_param("i", $user_id);

if (!$stmt->execute()) {
    ob_end_clean();
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $stmt->error
    ]);
    exit();
}

$result = $stmt->get_result();
$dates = [];

while ($row = $result->fetch_assoc()) {
    $dates[] = $row['workout_date'];
}

// Return the workout dates
ob_end_clean();
echo json_encode($dates);

$conn->close();
?>