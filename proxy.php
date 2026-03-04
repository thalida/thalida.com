<?php
// Original API (forecast.io) is no longer available.
// Returning mock weather data for archival purposes.

date_default_timezone_set('America/New_York');
header('Content-Type: application/json');

$now = time();
$today_midnight = strtotime('today midnight');

$mock_data = array(
    'currently' => array(
        'time' => $now,
        'summary' => 'Partly Cloudy',
        'icon' => 'partly-cloudy-day',
        'temperature' => 65,
        'humidity' => 0.55,
        'windSpeed' => 8,
        'windBearing' => 200,
        'pressure' => 1013,
        'cloudCover' => 0.4,
        'dewPoint' => 48,
        'ozone' => 300,
        'precipIntensity' => 0,
        'precipProbability' => 0
    ),
    'daily' => array(
        'data' => array()
    ),
    'hourly' => array(
        'data' => array()
    )
);

// Generate 7 days of daily data
for ($i = 0; $i < 7; $i++) {
    $day_start = $today_midnight + $i * 86400;
    $mock_data['daily']['data'][] = array(
        'time' => $day_start,
        'summary' => 'Partly Cloudy',
        'icon' => 'partly-cloudy-day',
        'temperatureMin' => 55,
        'temperatureMax' => 75,
        'sunriseTime' => $day_start + 6 * 3600 + 30 * 60,
        'sunsetTime' => $day_start + 18 * 3600 + 30 * 60,
        'humidity' => 0.55,
        'windSpeed' => 8,
        'precipIntensity' => 0,
        'precipProbability' => 0,
        'cloudCover' => 0.4
    );
}

// Generate 24 hours of hourly data
for ($i = 0; $i < 24; $i++) {
    $mock_data['hourly']['data'][] = array(
        'time' => $today_midnight + $i * 3600,
        'summary' => 'Partly Cloudy',
        'icon' => 'partly-cloudy-day',
        'temperature' => 55 + round(10 * sin(M_PI * ($i - 6) / 12)),
        'humidity' => 0.55,
        'windSpeed' => 8,
        'pressure' => 1013,
        'cloudCover' => 0.4,
        'precipIntensity' => 0,
        'precipProbability' => 0
    );
}

echo json_encode($mock_data);
