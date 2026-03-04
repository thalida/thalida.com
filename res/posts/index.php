<?php
header('Content-Type: application/json');

$projects = array(
    array(
        'id' => 'cipher',
        'title' => 'Cipher',
        'color' => '#e74c3c',
        'images' => 'cipher.icon.png;cipher.1.png;cipher.2.png',
        'description' => 'A cipher encoding and decoding tool.'
    ),
    array(
        'id' => 'lowpoly',
        'title' => 'Low Poly',
        'color' => '#2ecc71',
        'images' => 'lowpoly.icon.png;lowpoly.1.png;lowpoly.2.png;lowpoly.3.png;lowpoly.4.png',
        'description' => 'Low poly art generator.'
    ),
    array(
        'id' => 'makerfold',
        'title' => 'MakerFold',
        'color' => '#3498db',
        'images' => 'makerfold.icon.png;makerfold.1.gif;makerfold.2.png',
        'description' => 'A paper folding tool.'
    ),
    array(
        'id' => 'minecraft',
        'title' => 'Minecraft',
        'color' => '#9b59b6',
        'images' => 'minecraft.icon.png;minecraft.1.png;minecraft.2.png',
        'description' => 'Minecraft projects and experiments.'
    ),
    array(
        'id' => 'tictactoe',
        'title' => 'Tic Tac Toe',
        'color' => '#f39c12',
        'images' => 'tictactoe.icon.png;tictactoe.1.png',
        'description' => 'A tic tac toe game with AI.'
    ),
    array(
        'id' => 'todo',
        'title' => 'Todo',
        'color' => '#1abc9c',
        'images' => 'todo.icon.png;todo.1.png;todo.2.png;todo.3.png',
        'description' => 'A todo list application.'
    ),
    array(
        'id' => 'webbrowser',
        'title' => 'Web Browser',
        'color' => '#e67e22',
        'images' => 'webbrowser.icon.png;webbrowser.1.png;webbrowser.2.png',
        'description' => 'A custom web browser.'
    ),
    array(
        'id' => 'emailclient',
        'title' => 'Email Client',
        'color' => '#34495e',
        'images' => 'emailclient.icon.png;emailclient.1.png',
        'description' => 'An email client application.'
    )
);

// Handle individual project requests via query param (from rewrite rule)
if (isset($_GET['id'])) {
    $id = $_GET['id'];
    foreach ($projects as $project) {
        if ($project['id'] === $id) {
            echo json_encode($project);
            exit;
        }
    }
    http_response_code(404);
    echo json_encode(array('error' => 'Project not found'));
    exit;
}

echo json_encode($projects);
