<?php
/**
 * API Endpoint Template - Use this as a starting point for new endpoints
 * 
 * This template implements standardized patterns for:
 * - CORS handling via central include
 * - Standardized response format
 * - Error handling
 * - Input validation
 */

// Include centralized API common functions and database connection
require_once 'api-common.php';
require_once 'db.php';

// Get HTTP method
$method = $_SERVER['REQUEST_METHOD'];

// Read input data (for POST/PUT methods)
$inputData = null;
if ($method === 'POST' || $method === 'PUT') {
    $inputJSON = file_get_contents('php://input');
    $inputData = json_decode($inputJSON);
    
    // Check for JSON parsing errors
    if ($inputData === null && $inputJSON) {
        sendError('Invalid JSON format');
    }
}

// Handle different HTTP methods
switch ($method) {
    case 'GET':
        handleGet();
        break;
        
    case 'POST':
        handlePost($inputData);
        break;
        
    case 'PUT':
        handlePut($inputData);
        break;
        
    case 'DELETE':
        handleDelete();
        break;
        
    default:
        sendError('Method not allowed', 405);
        break;
}

/**
 * Handle GET requests
 */
function handleGet() {
    global $conn;
    
    // Get and validate URL parameters
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    
    // Example: Different handling based on parameters
    if ($id) {
        // Get a specific item
        $sql = "SELECT * FROM items WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $item = $result->fetch_assoc();
            sendSuccess($item);
        } else {
            sendError('Item not found', 404);
        }
    } else {
        // Get a list of items
        $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
        $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
        $offset = ($page - 1) * $limit;
        
        // Get total count for pagination
        $countSql = "SELECT COUNT(*) as total FROM items";
        $countResult = $conn->query($countSql);
        $totalRecords = $countResult->fetch_assoc()['total'];
        $totalPages = ceil($totalRecords / $limit);
        
        // Get paginated data
        $sql = "SELECT * FROM items LIMIT ? OFFSET ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("ii", $limit, $offset);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $items = [];
        while ($row = $result->fetch_assoc()) {
            $items[] = $row;
        }
        
        sendSuccess([
            'items' => $items,
            'pagination' => [
                'total' => $totalRecords,
                'pages' => $totalPages,
                'current' => $page,
                'limit' => $limit
            ]
        ]);
    }
}

/**
 * Handle POST requests
 * @param object $data - The parsed JSON data
 */
function handlePost($data) {
    global $conn;
    
    // Validate required fields
    validateRequiredParams(['name', 'description'], $data);
    
    // Sanitize and validate input
    $name = $conn->real_escape_string($data->name);
    $description = $conn->real_escape_string($data->description);
    $status = isset($data->status) ? $conn->real_escape_string($data->status) : 'active';
    
    // Perform database operation
    $sql = "INSERT INTO items (name, description, status) VALUES (?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("sss", $name, $description, $status);
    
    if ($stmt->execute()) {
        $newId = $stmt->insert_id;
        
        // Get the newly inserted item
        $selectSql = "SELECT * FROM items WHERE id = ?";
        $selectStmt = $conn->prepare($selectSql);
        $selectStmt->bind_param("i", $newId);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        $newItem = $result->fetch_assoc();
        
        sendSuccess($newItem, 'Item created successfully');
    } else {
        handleDbError($conn, 'create item');
    }
}

/**
 * Handle PUT requests
 * @param object $data - The parsed JSON data
 */
function handlePut($data) {
    global $conn;
    
    // Get and validate ID from URL parameters
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$id) {
        sendError('ID parameter is required');
    }
    
    // Check if the item exists
    $checkSql = "SELECT id FROM items WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        sendError('Item not found', 404);
    }
    
    // Build update query dynamically based on provided fields
    $updateFields = [];
    $types = '';
    $values = [];
    
    if (isset($data->name)) {
        $updateFields[] = 'name = ?';
        $types .= 's';
        $values[] = $data->name;
    }
    
    if (isset($data->description)) {
        $updateFields[] = 'description = ?';
        $types .= 's';
        $values[] = $data->description;
    }
    
    if (isset($data->status)) {
        $updateFields[] = 'status = ?';
        $types .= 's';
        $values[] = $data->status;
    }
    
    if (empty($updateFields)) {
        sendError('No fields to update');
    }
    
    // Add ID to values and types for the WHERE clause
    $types .= 'i';
    $values[] = $id;
    
    // Prepare and execute the update
    $sql = "UPDATE items SET " . implode(', ', $updateFields) . " WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    // Dynamically bind parameters
    $bindParams = array_merge([$types], $values);
    $stmt->bind_param(...$bindParams);
    
    if ($stmt->execute()) {
        // Get the updated item
        $selectSql = "SELECT * FROM items WHERE id = ?";
        $selectStmt = $conn->prepare($selectSql);
        $selectStmt->bind_param("i", $id);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        $updatedItem = $result->fetch_assoc();
        
        sendSuccess($updatedItem, 'Item updated successfully');
    } else {
        handleDbError($conn, 'update item');
    }
}

/**
 * Handle DELETE requests
 */
function handleDelete() {
    global $conn;
    
    // Get and validate ID from URL parameters
    $id = isset($_GET['id']) ? intval($_GET['id']) : null;
    if (!$id) {
        sendError('ID parameter is required');
    }
    
    // Check if the item exists
    $checkSql = "SELECT id FROM items WHERE id = ?";
    $checkStmt = $conn->prepare($checkSql);
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $checkResult = $checkStmt->get_result();
    
    if ($checkResult->num_rows === 0) {
        sendError('Item not found', 404);
    }
    
    // Perform the delete
    $sql = "DELETE FROM items WHERE id = ?";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("i", $id);
    
    if ($stmt->execute()) {
        sendSuccess(null, 'Item deleted successfully');
    } else {
        handleDbError($conn, 'delete item');
    }
}
?>