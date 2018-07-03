# Builtins
from datetime import datetime
from pprint import pprint
import json

# Third Party
from darksky import forecast
import geocoder
import dateparser

# Locals
import secrets


class Window:
    TIME_GROUPS = [
        {
            "name": "late_night",
            "label": "Late Night",
            "start_hour": 0,
            "color": { 
                "r": 50,
                "g": 60,
                "b": 100 
            },
            "salutation": "Greetings",
            "sayings": [
                "Woah a Nightowl!",
                "Working late?",
                "Can’t sleep?",
                "Whatcha watching lately?",
                "Burning the night oil?",
                "Night shift?",
                "Bored?"
            ]
        },
        {
            "name": "early_morning",
            "label": "Eary Morning",
            "start_hour": 4,
            "color": { 
                "r": 139,
                "g": 152,
                "b": 206 
            },
            "salutation": "Oh hey, Early Riser",
            "sayings": [
                "OMG, it's the elusive EarlyBird!",
                "Oh hey, Early Riser!",
                "Good Dreams?",
                "Have a great day!",
                "Getting a headstart on the day?"
            ]
        },
        {
            "name": "morning",
            "label": "Morning",
            "start_hour": 8,
            "color": { 
                "r": 86,
                "g": 216,
                "b": 255 
            },
            "salutation": "Good morning",
            "sayings": [
                "How are you doing?",
                "Have a wonderful day!",
                "Have a great day!",
                "How’d ya sleep?",
                "What’s for breakfast?"
            ]
        },
        {
            "name": "afternoon",
            "label": "Afternoon",
            "start_hour": 12,
            "color": { 
                "r": 255,
                "g": 216,
                "b": 116 
            },
            "salutation": "Good afternoon",
            "sayings": [
                "It’s NOM NOM Time",
                "How’s the day going?",
                "It’s Food o’Clock!",
                "Lunch time?",
                "What’s up!?"
            ]
        },
        {
            "name": "midafternoon",
            "label": "Mid-Afternoon",
            "start_hour": 15,
            "color": { 
                "r": 255,
                "g": 183,
                "b": 116 
            },
            "salutation": "Good afternoon",
            "sayings": [
                "How are you doing?",
                "Have a wonderful day!",
                "Hulu & Hang?",
                "Have a wicked day!",
                "How’s the day going?"
            ]
        },
        {
            "name": "evening",
            "label": "Evening",
            "start_hour": 18,
            "color": { 
                "r": 255,
                "g": 135,
                "b": 116 
            },
            "salutation": "Good evening",
            "sayings": [
                "How’s your day been?",
                "Dinner plans?",
                "Netfix & Pizza?",
                "Winding down for the night?",
                "Excited for tomorrow?",
                "How’s it going?"
            ]
        },
        {
            "name": "night",
            "label": "Night",
            "start_hour": 21,
            "color": { 
                "r": 40,
                "g": 75,
                "b": 215 
            },
            "salutation": "Good night",
            "sayings": [
                "Sweet Dreams",
                "Plans Tonight?",
                "Netfix & Chinese?",
                "Have a great night!",
                "Hope it’s a good one!"
            ]
        }
    ]

    def __init__(self):
        self.total_time_groups = len(self.TIME_GROUPS)
    
    def get_state(self, request, force_update, weather_cookie):
        return {
            'time': self._get_time(datetime.now()),
            'weather': self._get_weather(request, force_update, weather_cookie)
        }

    def get_range_over_day(self):
        ranges = []

        # for h in range(24):
        #     print(h)
        #     for m in [0, 15, 30, 45, 59]:
        #         date = dateparser.parse(f'16 Sept 2018 {h}:{m}:00')
        #         ranges.append(self._get_time(date))
        
        for h in range(24):
            print(h)
            for m in range(60):
                date = dateparser.parse(f'16 Sept 2018 {h}:{m}:00')
                ranges.append(self._get_time(date))

        # for h in range(24):
        #     print(h)
        #     for m in range(60):
        #         for s in [0, 15, 30, 45, 59]:
        #             ranges.append(self._get_time(dateparser.parse(f'16 Sept 2018 {h}:{m}:{s}')))

        # for h in range(24):
        #     print(h)
        #     for m in range(60):
        #         for s in range(60):
        #             date = dateparser.parse(f'16 Sept 2018 {h}:{m}:{s}')
        #             ranges.append(self._get_time(date))
        
        return ranges

    def _get_weather(self, request, force_update, weather_cookie):
        """Get Current Weather Based on IP Address
        
        Based on the current ip location, getthe current weather (or use NY if location 
        is not available.) Save that data to a cookie to reduce # of api calls.
        
        Arguments:
            request -- A Flast Request
            force_update {bool} -- Should we force update the weather data
            weather_cookie -- Stored weather data
        """

        # Get current weather for location based on IP
        if weather_cookie and not force_update:
            from_cookie = True;
            current_weather = json.loads(weather_cookie)
        else:
            from_cookie = False

            # fallback latitute/longitude data
            newyork_latlng = [40.7081, -73.9571]

            # Get the visitors IP and lat/lng for that IP
            ip = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
            geo = geocoder.ip(ip)
            lat, lng = geo.latlng if len(geo.latlng) == 2 else newyork_latlng

            # Use Darksky to get the current forcast for that lat/lng
            geo_forecast = forecast(secrets.FORECAST_KEY, lat, lng)

            # Get and format the current weather
            current_weather = geo_forecast['currently']
            current_weather['units'] = geo_forecast['flags']['units'] # F or C

        return {'current': current_weather, 'from_cookie': from_cookie}

    def _format_color(self, color):
        is_arr = isinstance(color, list)
        color_arr = color if is_arr else [color['r'], color['g'], color['b']]
        color_dict = color if not is_arr else {'r': color[0], 'g': color[1], 'b': color[2]}

        return {
            'as_str': f"rgb({color_dict['r']}, {color_dict['g']}, {color_dict['b']})",
            'as_arr': color_arr,
            'as_dict': color_dict,
        }

    def _get_time_range(self, time):
        range = []

        # Current hour + minutes in military time
        hour = int(time.strftime('%H'))
        minute = int(time.strftime('%M'))
        time = {'hour': hour, 'minute': minute}

        for i, group in enumerate(self.TIME_GROUPS):
            next_idx = i + 1 if (i + 1 < self.total_time_groups) else 0
            curr_group = group
            next_group = self.TIME_GROUPS[next_idx]

            if (hour >= curr_group['start_hour'] and (hour < next_group['start_hour'] or next_group['start_hour'] == 0)):
                range = {'start': curr_group, 'end': next_group}
                break

        return (time, range)

    def _get_time(self, now):
        # Get the start + end colors - as well as the time used
        (time_24, time_range) = self._get_time_range(now)

        end_range_time = 24 if time_range['end']['start_hour'] == 0 else time_range['end']['start_hour']
        num_hrs_in_range = abs(end_range_time - time_range['start']['start_hour'])
        time_since_range_start = abs(time_24['hour'] - time_range['start']['start_hour'])
        is_closer_to_start = time_since_range_start < (num_hrs_in_range - 1)

        interval = {}
        distance = {}
        closest_group = {}
        new_color = {}
        gradient = {'start': None, 'end': None}
        color_parts = ['r', 'g', 'b']

        # Get the total # of hours b/w the two groups
        # Split the transition distance (1) to pieces for each hour mark
        interval['hour'] = 1 / num_hrs_in_range
        # Split the hour interval into 60 pieces (1 for each minute)
        interval['minute'] = interval['hour'] / 60
        # Calculate the current hour + minute values using the intervals
        distance['hour'] = interval['hour'] * time_since_range_start
        distance['minute'] = interval['minute'] * time_24['minute']
        distance['total'] = distance['hour'] + distance['minute']

        blended_color = {}
        for part in color_parts:
            start_color = time_range['start']['color'][part]
            end_color = time_range['end']['color'][part]
            blended_color[part] = round(start_color + ((end_color - start_color) * distance['total']))

        blended_color = self._format_color(blended_color)

        if is_closer_to_start:
            closest_group = time_range['start'] 
            gradient = {
                'start': self._format_color(closest_group['color']),
                'end': blended_color,
            }
        else:
            closest_group = time_range['end']
            gradient = {
                'start': blended_color,
                'end': self._format_color(closest_group['color']),
            }

        return {
            'now': now,
            'group': closest_group,
            'color': {
                **blended_color, 
                'gradient': gradient,
            },
        }

