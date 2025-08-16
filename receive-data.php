<?php
// Enable CORS
require_once 'api-common.php';

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json');

// Include the centralized database connection
include 'db.php';

// Read POST data (expects JSON)
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(["status" => "error", "message" => "No data received"]);
    exit();
}

// Log received data for debugging
error_log("Received rep data: " . print_r($data, true));

// Extract basic information
$session_id = $conn->real_escape_string($data['session_id']);
$user_id = intval($data['user_id']);
$weight = floatval($data['weight']); // Weight in kg
$rep_num = intval($data['rep_num']);
$rep_start = intval($data['rep_start']);
$rep_end = intval($data['rep_end']);
$rep_duration = intval($data['rep_duration']);
$timestamp = date('Y-m-d H:i:s');

// Process accelerometer data points
$data_points = $data['data_points'] ?? [];

// Constants for calculations
define('GRAVITY', 9.8); // m/s²
define('EFFICIENCY', 0.2); // Human body efficiency (20-25%)
define('JOULES_PER_CALORIE', 4184); // 1 kcal = 4184 joules
define('FOREARM_LENGTH', 0.33); // Average forearm length in meters

// Variables for calculations
$max_angle = 0;
$min_angle = 0;
$angle_range = 0;
$max_accel = 0;
$work_done = 0;
$calories_burned = 0;

// Find max and min angles to calculate range of motion
if (!empty($data_points)) {
    // Initialize with the first data point
    $max_angle = $data_points[0]['angle'];
    $min_angle = $data_points[0]['angle'];
    
    foreach ($data_points as $point) {
        // Update max and min angles
        $angle = floatval($point['angle']);
        $max_angle = max($max_angle, $angle);
        $min_angle = min($min_angle, $angle);
        
        // Calculate acceleration magnitude (removing gravity component)
        $accel_x = floatval($point['ax']);
        $accel_y = floatval($point['ay']);
        $accel_z = floatval($point['az']);
        $accel_magnitude = sqrt($accel_x*$accel_x + $accel_y*$accel_y + $accel_z*$accel_z) - 1.0;
        $max_accel = max($max_accel, $accel_magnitude);
    }
    
    // Calculate angle range
    $angle_range = abs($max_angle - $min_angle);
    
    // Calculate displacement using angle range and forearm length
    // d = 1/2 * a * t²
    $displacement = 2 * FOREARM_LENGTH * sin($angle_range * M_PI / 360.0); // in meters
    
    // Calculate work done (force × distance)
    // W = F * d
    $force = $weight * GRAVITY; // Force = mass × gravity
    $work_done = $force * $displacement; // Work in joules
    
    // Calculate calories burned
    // Kcal = W / (η * 4184)
    $calories_burned = $work_done / (EFFICIENCY * JOULES_PER_CALORIE);
    
    // Log calculations
    error_log("Physics calculations: angle_range=$angle_range, displacement=$displacement, work_done=$work_done, calories=$calories_burned");
}

// Store rep data in database
$sql = "INSERT INTO rep_data 
        (session_id, rep_number, angle_range, max_accel, displacement, work_done, calories, duration, timestamp) 
        VALUES 
        ('$session_id', $rep_num, $angle_range, $max_accel, $displacement, $work_done, $calories_burned, $rep_duration, '$timestamp')";

$insert_success = $conn->query($sql);

// Get total calories for the session
$total_calories_query = "SELECT SUM(calories) as total_calories FROM rep_data WHERE session_id = '$session_id'";
$result = $conn->query($total_calories_query);
$total_calories = 0;

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    $total_calories = floatval($row['total_calories']);
}

// Update session data
$update_session = "UPDATE sessions 
                   SET total_reps = $rep_num, 
                       total_calories = $total_calories
                   WHERE session_id = '$session_id'";

$conn->query($update_session);

// Prepare response
$response = [
    "status" => "success",
    "message" => "Rep data processed successfully",
    "rep_num" => $rep_num,
    "angle_range" => $angle_range,
    "work_done" => $work_done,
    "calories" => $calories_burned,
    "total_calories" => $total_calories
];

echo json_encode($response);
$conn->close();
?>