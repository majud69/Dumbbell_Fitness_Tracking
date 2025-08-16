<?php
require_once 'api-common.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database connection
include 'db.php';

// Get parameters
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$page = isset($_GET['page']) ? intval($_GET['page']) : 1;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
$offset = ($page - 1) * $limit;

// Validate user_id
if (!$user_id) {
    echo json_encode([
        'status' => 'error', 
        'message' => 'User ID is required'
    ]);
    exit();
}

// Count total records for pagination
$count_sql = "SELECT COUNT(*) as total FROM workout_data wd 
              JOIN sessions s ON wd.session_id = s.session_id 
              WHERE s.user_id = $user_id";
$count_result = $conn->query($count_sql);
$total_records = 0;

if ($count_result && $count_result->num_rows > 0) {
    $total_records = $count_result->fetch_assoc()['total'];
}

// Calculate pagination info
$total_pages = ceil($total_records / $limit);

// Get details data with pagination
// PERUBAHAN: Menambahkan kolom calories dan duration
$sql = "SELECT 
            wd.id,
            s.session_id,
            DATE_FORMAT(wd.timestamp, '%d/%m/%Y') as date,
            'Bicep Curl' as exercise,
            wd.weight as weight,
            wd.sets,
            wd.reps,
            wd.calories,
            wd.duration,
            (wd.weight * wd.reps * wd.sets) as total_weight
        FROM workout_data wd
        JOIN sessions s ON wd.session_id = s.session_id
        WHERE s.user_id = $user_id
        ORDER BY wd.timestamp DESC
        LIMIT $offset, $limit";

$result = $conn->query($sql);
$details = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $details[] = $row;
    }
}

// Prepare response
$response = [
    'status' => 'success',
    'data' => $details,
    'pagination' => [
        'page' => $page,
        'limit' => $limit,
        'total' => $total_records,
        'pages' => $total_pages
    ]
];

echo json_encode($response);
$conn->close();
?>