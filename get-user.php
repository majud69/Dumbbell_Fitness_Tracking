<?php
// Izinkan CORS
require_once 'api-common.php';

// Tangani pre-flight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include the database connection
include 'db.php';

// Ambil user_id dari parameter URL
$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if (!$user_id) {
    echo json_encode(['status' => 'error', 'message' => 'User ID is required']);
    exit();
}

// Query untuk mengambil data user
$query = "SELECT id, name, rfid_id, created_at, updated_at, weight FROM users WHERE id = $user_id";
$result = $conn->query($query);

if ($result && $result->num_rows > 0) {
    // User ditemukan, ambil data pengguna
    $user = $result->fetch_assoc();
    
    // Query untuk mengambil statistik workout user
    $stats_query = "SELECT 
                        COUNT(DISTINCT wd.id) as total_workouts,
                        COALESCE(SUM(s.dumbbell_weight * wd.reps * wd.sets), 0) as total_weight,
                        COALESCE(SUM(wd.calories), 0) as total_calories,
                        COALESCE(SUM(wd.sets), 0) as total_sets,
                        COALESCE(SUM(wd.reps), 0) as total_reps,
                        COALESCE(SUM(wd.duration), 0) as total_duration
                    FROM sessions s
                    LEFT JOIN workout_data wd ON s.session_id = wd.session_id
                    WHERE s.user_id = $user_id";
    
    $stats_result = $conn->query($stats_query);
    
    if ($stats_result && $stats_result->num_rows > 0) {
        $stats = $stats_result->fetch_assoc();
        
        // Tambahkan statistik ke data user
        $user['stats'] = [
            'total_workouts' => intval($stats['total_workouts']),
            'total_weight' => floatval($stats['total_weight']),
            'total_calories' => floatval($stats['total_calories']),
            'total_sets' => intval($stats['total_sets']),
            'total_reps' => intval($stats['total_reps']),
            'total_duration' => intval($stats['total_duration'])
        ];
    } else {
        // Jika tidak ada data workout, set semua statistik ke 0
        $user['stats'] = [
            'total_workouts' => 0,
            'total_weight' => 0,
            'total_calories' => 0,
            'total_sets' => 0,
            'total_reps' => 0,
            'total_duration' => 0
        ];
    }
    
    echo json_encode($user);
} else {
    // User tidak ditemukan
    echo json_encode(['status' => 'error', 'message' => 'User not found']);
}

$conn->close();
?>