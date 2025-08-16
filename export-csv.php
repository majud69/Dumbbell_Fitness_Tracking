// Perbaikan export-csv.php

<?php
require_once 'api-common.php';

// For CSV, set the content type
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="workout_history.csv"');

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
    echo "Error: User ID is required";
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

// Create output stream for CSV
$output = fopen('php://output', 'w');

// Add UTF-8 BOM for Excel compatibility
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Add header row - Perbarui untuk menyertakan durasi dan kalori
fputcsv($output, [
    'Tanggal',
    'Jenis Latihan',
    'Berat (kg)',
    'Set',
    'Repetisi',
    'Durasi (menit)',
    'Kalori (kkal)'
]);

// Get workout data
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
          ORDER BY wd.timestamp DESC";

$result = $conn->query($query);

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, [
            $row['date'],
            $row['exercise'],
            $row['weight'],
            $row['sets'],
            $row['reps'],
            $row['duration'],
            $row['calories']
        ]);
    }
} else {
    // Add a row indicating no data
    fputcsv($output, ['No workout data found']);
}

// Close database connection
$conn->close();
?>