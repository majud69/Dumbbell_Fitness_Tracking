<?php
/**
 * workout-data.php
 * 
 * Endpoint untuk mengelola data latihan:
 * - Menyimpan data latihan baru
 * - Menghitung kalori berdasarkan parameter fisik
 * - Mengupdate statistik sesi secara otomatis
 */

// Matikan pesan error untuk output JSON yang bersih
error_reporting(0);

// Start clean output buffer
ob_start();

// Enable CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
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

// Fungsi untuk mengembalikan respons error yang terstandarisasi
function returnError($message, $code = 400) {
    ob_end_clean(); // Bersihkan buffer sebelumnya
    http_response_code($code);
    echo json_encode([
        'status' => 'error',
        'message' => $message
    ]);
    exit();
}

// Fungsi untuk mengembalikan respons sukses yang terstandarisasi
function returnSuccess($data, $message = 'Success') {
    ob_end_clean(); // Bersihkan buffer sebelumnya
    echo json_encode([
        'status' => 'success',
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

// Log incoming data untuk debugging
$request_method = $_SERVER['REQUEST_METHOD'];
error_log("workout-data.php accessed with method: " . $request_method);

// Handle request berdasarkan HTTP method
if ($request_method === 'POST') {
    // Baca data JSON dari request body
    $raw_data = file_get_contents('php://input');
    error_log("Raw POST data: " . $raw_data);
    
    // Parse JSON data
    $data = json_decode($raw_data, true);
    
    // Validasi JSON
    if (json_last_error() !== JSON_ERROR_NONE) {
        returnError('Invalid JSON format: ' . json_last_error_msg());
    }
    
    // Log data setelah parsing untuk debugging
    error_log("Parsed data: " . print_r($data, true));
    
    // Validasi field yang diperlukan
    $required_fields = ['session_id', 'reps', 'sets', 'duration', 'weight'];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        returnError('Missing required fields: ' . implode(', ', $missing_fields));
    }
    
    // Ektrak dan sanitasi data
    $session_id = $conn->real_escape_string($data['session_id']);
    $reps = intval($data['reps']);
    $sets = intval($data['sets']);
    $duration = intval($data['duration']);
    $weight = floatval($data['weight']);
    $form_score = isset($data['form_score']) ? floatval($data['form_score']) : 4.5;
    
    // Validasi nilai numerik
    if ($reps <= 0) returnError('Repetitions must be greater than 0');
    if ($sets <= 0) returnError('Sets must be greater than 0');
    if ($duration <= 0) returnError('Duration must be greater than 0');
    if ($weight <= 0) returnError('Weight must be greater than 0');
    
    // Cek apakah sesi ada di database
    $check_session = "SELECT session_id, user_id FROM sessions WHERE session_id = ?";
    $check_stmt = $conn->prepare($check_session);
    $check_stmt->bind_param("s", $session_id);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();
    
    // Tentukan user_id dan buat sesi jika perlu
    $user_id = null;
    
    if ($check_result->num_rows === 0) {
        // Sesi tidak ditemukan, cek apakah user_id disediakan untuk membuat sesi baru
        if (!isset($data['user_id']) || intval($data['user_id']) <= 0) {
            returnError('Session not found and no valid user_id provided to create a new session');
        }
        
        $user_id = intval($data['user_id']);
        
        // Buat sesi baru
        $create_session = "INSERT INTO sessions (session_id, user_id, dumbbell_weight, start_time) 
                          VALUES (?, ?, ?, NOW())";
        $create_stmt = $conn->prepare($create_session);
        $create_stmt->bind_param("sid", $session_id, $user_id, $weight);
        
        if (!$create_stmt->execute()) {
            returnError('Failed to create new session: ' . $conn->error, 500);
        }
        
        error_log("Created new session with ID: $session_id for user: $user_id");
    } else {
        // Sesi ditemukan, ambil user_id
        $session_data = $check_result->fetch_assoc();
        $user_id = $session_data['user_id'];
    }
    
    // Tentukan timestamp
    $timestamp = date('Y-m-d H:i:s'); // Default ke waktu sekarang
    
    // Jika workout_date disediakan, gunakan itu
    if (isset($data['workout_date']) && !empty($data['workout_date'])) {
        try {
            $workout_date = new DateTime($data['workout_date']);
            $timestamp = $workout_date->format('Y-m-d H:i:s');
        } catch (Exception $e) {
            error_log("Invalid workout_date format: " . $data['workout_date'] . ". Using current timestamp.");
        }
    }
    
    // Hitung kalori dengan formula fisika yang disederhanakan dan dibatasi
    // Formula: Work = Force × Distance
    // Force = Mass × Gravity
    // Energy dalam Joules = Work × Repetitions
    // Calories = Energy / (4184 × efficiency)
    
    $gravity = 9.8; // m/s²
    $distance = 0.5; // meter, asumsi jarak bicep curl
    $efficiency = 0.2; // efisiensi tubuh 20%
    $joules_to_kcal = 4184; // 1 kcal = 4184 joules
    
    $force = $weight * $gravity; // Newton
    $work = $force * $distance; // Joules per repetisi
    $total_joules = $work * $reps * $sets; // Total energy dalam Joules
    $calories = $total_joules / ($joules_to_kcal * $efficiency);
    
    // Batasi kalori ke nilai yang masuk akal (cegah nilai ekstrem)
    $calories = min(max($calories, 1), 2000); // Minimal 1, maksimal 2000 kkal
    
    error_log("Calculated calories: $calories (from weight: $weight kg, reps: $reps, sets: $sets)");
    
    // Cek untuk duplikasi pengiriman (dalam 10 detik terakhir)
    $check_duplicate = "SELECT id FROM workout_data 
                       WHERE session_id = ? 
                       AND reps = ? 
                       AND sets = ? 
                       AND ABS(TIMESTAMPDIFF(SECOND, timestamp, ?)) < 10
                       LIMIT 1";
    
    $dup_stmt = $conn->prepare($check_duplicate);
    $dup_stmt->bind_param("siis", $session_id, $reps, $sets, $timestamp);
    $dup_stmt->execute();
    $dup_result = $dup_stmt->get_result();
    
    if ($dup_result->num_rows > 0) {
        error_log("Duplicate submission detected for session: $session_id");
        returnSuccess(['duplicate' => true], 'This data appears to be a duplicate of a recent submission');
    }
    
    // Simpan data workout
    $save_query = "INSERT INTO workout_data (
                    session_id, 
                    weight, 
                    reps, 
                    sets, 
                    calories, 
                    form_score, 
                    duration, 
                    timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    
    $save_stmt = $conn->prepare($save_query);
    $save_stmt->bind_param("sdiiidis", $session_id, $weight, $reps, $sets, $calories, $form_score, $duration, $timestamp);
    
    if (!$save_stmt->execute()) {
        returnError('Failed to save workout data: ' . $conn->error, 500);
    }
    
    $workout_id = $conn->insert_id;
    error_log("Saved workout data with ID: $workout_id");
    
    // Update statistik sesi berdasarkan semua data workout
    $update_session = "UPDATE sessions s
                      SET 
                        s.total_reps = (SELECT COALESCE(SUM(reps * sets), 0) FROM workout_data WHERE session_id = s.session_id),
                        s.total_sets = (SELECT COALESCE(SUM(sets), 0) FROM workout_data WHERE session_id = s.session_id),
                        s.total_calories = (SELECT COALESCE(SUM(calories), 0) FROM workout_data WHERE session_id = s.session_id),
                        s.avg_form_score = (SELECT COALESCE(AVG(form_score), 0) FROM workout_data WHERE session_id = s.session_id),
                        s.end_time = NOW()
                      WHERE s.session_id = ?";
    
    $update_stmt = $conn->prepare($update_session);
    $update_stmt->bind_param("s", $session_id);
    
    if (!$update_stmt->execute()) {
        error_log("Error updating session totals: " . $conn->error);
    }
    
    // Kembalikan data workout yang disimpan
    $workout_data = [
        'id' => $workout_id,
        'session_id' => $session_id,
        'reps' => $reps,
        'sets' => $sets,
        'weight' => $weight,
        'duration' => $duration,
        'calories' => $calories,
        'form_score' => $form_score,
        'timestamp' => $timestamp
    ];
    
    returnSuccess($workout_data, 'Workout data recorded successfully');
} 
else if ($request_method === 'GET') {
    // Ambil parameter dari query string
    $session_id = isset($_GET['session_id']) ? $conn->real_escape_string($_GET['session_id']) : null;
    $workout_id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    if (!$session_id && !$workout_id) {
        returnError('Either session_id or id parameter is required');
    }
    
    // Buat query berdasarkan parameter
    if ($workout_id) {
        // Ambil satu record workout
        $query = "SELECT * FROM workout_data WHERE id = ?";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("i", $workout_id);
    } else {
        // Ambil semua workout untuk session tertentu
        $query = "SELECT * FROM workout_data WHERE session_id = ? ORDER BY timestamp ASC";
        $stmt = $conn->prepare($query);
        $stmt->bind_param("s", $session_id);
    }
    
    // Eksekusi query
    if (!$stmt->execute()) {
        returnError('Database query failed: ' . $conn->error, 500);
    }
    
    $result = $stmt->get_result();
    $workouts = [];
    
    while ($row = $result->fetch_assoc()) {
        // Konversi nilai numerik dengan benar
        $row['id'] = intval($row['id']);
        $row['reps'] = intval($row['reps']);
        $row['sets'] = intval($row['sets']);
        $row['weight'] = floatval($row['weight']);
        $row['duration'] = intval($row['duration']);
        $row['calories'] = floatval($row['calories']);
        $row['form_score'] = floatval($row['form_score']);
        
        $workouts[] = $row;
    }
    
    // Kembalikan hasil
    if ($workout_id && empty($workouts)) {
        returnError('Workout not found', 404);
    }
    
    returnSuccess($workout_id ? $workouts[0] : $workouts);
} 
else {
    // Method tidak didukung
    returnError('Method not allowed: ' . $request_method, 405);
}
?>