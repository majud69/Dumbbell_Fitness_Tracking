// Perbaikan export-pdf.php

<?php
require_once 'api-common.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
include 'db.php';

// Get user ID
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

// Validate user_id
if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'User ID is required']);
    exit();
}

// Get user data
$user_query = "SELECT name FROM users WHERE id = $user_id";
$user_result = $conn->query($user_query);
$user_name = "User";

if ($user_result && $user_result->num_rows > 0) {
    $user_data = $user_result->fetch_assoc();
    $user_name = $user_data['name'];
}

// Get workout data - perbarui query untuk menyertakan durasi dan kalori
$query = "SELECT 
            DATE_FORMAT(wd.timestamp, '%d/%m/%Y %H:%i') as date,
            'Bicep Curl' as exercise,
            wd.weight as weight,
            wd.sets,
            wd.reps,
            wd.duration,
            wd.calories
          FROM workout_data wd
          JOIN sessions s ON wd.session_id = s.session_id
          WHERE s.user_id = $user_id
          ORDER BY wd.timestamp DESC
          LIMIT 100"; // Limit to 100 records

$result = $conn->query($query);
$workouts = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $workouts[] = $row;
    }
}

// Get summary data - perbarui untuk menyertakan durasi dan kalori
$summary_query = "SELECT 
                    SUM(wd.sets) as total_sets,
                    SUM(wd.reps) as total_reps,
                    SUM(wd.weight * wd.reps * wd.sets) as total_weight,
                    SUM(wd.duration) as total_duration,
                    SUM(wd.calories) as total_calories,
                    COUNT(DISTINCT wd.id) as total_workouts
                  FROM workout_data wd
                  JOIN sessions s ON wd.session_id = s.session_id
                  WHERE s.user_id = $user_id";

$summary_result = $conn->query($summary_query);
$summary = null;

if ($summary_result && $summary_result->num_rows > 0) {
    $summary = $summary_result->fetch_assoc();
}

// Prepare response
$response = [
    'status' => 'success',
    'user_name' => $user_name,
    'data' => $workouts,
    'summary' => $summary
];

echo json_encode($response);
$conn->close();
?>